import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  cleanPhoneDigits,
  getPhoneLast4,
  generateDeviceToken,
  verifyDeviceToken,
  maskName,
  maskPhone,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
} from '@/lib/device-auth'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
    const token = req.nextUrl.searchParams.get('token')?.trim() || ''
    const phoneLast4Input = req.nextUrl.searchParams.get('phone_last_4')?.trim() || ''

    if (!code) {
      return NextResponse.json({ error: 'Kode pendaftaran wajib diisi.' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rateLimitKey = `${ip}:${code}`

    // Check rate limit if user is attempting phone verification
    if (phoneLast4Input) {
      const { isLocked, remainingMinutes } = checkRateLimit(rateLimitKey)
      if (isLocked) {
        return NextResponse.json(
          {
            error: `Terlalu banyak percobaan verifikasi yang salah. Silakan coba kembali dalam ${remainingMinutes} menit.`,
            is_rate_limited: true,
          },
          { status: 429 }
        )
      }
    }

    const supabase = await createServiceClient()

    // Query registration group
    const { data: group, error: groupErr } = await supabase
      .from('registration_groups')
      .select(`
        id,
        registration_code,
        type,
        group_status,
        created_at,
        notes,
        departure_point:departure_points(id, code, name),
        package:packages(id, name, price, dp_amount),
        pic_jamaah:jamaahs!fk_pic_jamaah(id, full_name, phone, relationship_to_pic)
      `)
      .ilike('registration_code', code)
      .maybeSingle()

    if (groupErr || !group) {
      return NextResponse.json(
        { error: 'Kode pendaftaran tidak ditemukan. Periksa kembali kode pendaftaran Anda.' },
        { status: 404 }
      )
    }

    // Parse PIC metadata from group.notes if available
    let picInfo = null
    if (group.notes) {
      try {
        const parsed = JSON.parse(group.notes)
        if (parsed?.pic && typeof parsed.pic === 'object') {
          picInfo = parsed.pic
        }
      } catch {}
    }

    const rawPicJamaah = group.pic_jamaah as any
    const picJamaah = Array.isArray(rawPicJamaah) ? rawPicJamaah[0] : rawPicJamaah

    // Query jamaahs
    const { data: jamaahs, error: jamaahErr } = await supabase
      .from('jamaahs')
      .select(`
        *,
        documents (
          id,
          document_type,
          file_name,
          mime_type,
          file_size,
          verification_status,
          verification_note,
          drive_web_view_url,
          created_at
        )
      `)
      .eq('group_id', group.id)
      .order('registration_order', { ascending: true })

    // Query payments
    const { data: payments } = await supabase
      .from('payments')
      .select(`
        id,
        payment_type,
        amount,
        payment_date,
        verification_status,
        verification_note,
        drive_web_view_url,
        created_at
      `)
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })

    // Determine actual contact phone for this registration group
    const picPhone =
      picInfo?.phone ||
      picJamaah?.phone ||
      jamaahs?.find((j: any) => j.phone)?.phone ||
      ''
    const picName =
      picInfo?.name ||
      picJamaah?.full_name ||
      jamaahs?.[0]?.full_name ||
      'Penanggung Jawab'

    const cleanPhone = cleanPhoneDigits(picPhone)

    // Check authorization:
    // 1. If no phone number is recorded in group (legacy/mock edge case), allow access
    // 2. If token matches HMAC device token, allow access
    // 3. If phoneLast4Input matches the last 4 digits of picPhone, allow access and issue new token
    let isAuthorized = false
    let issuedToken = token

    if (!cleanPhone) {
      // No phone recorded in database, auto-authorize
      isAuthorized = true
    } else if (token && verifyDeviceToken(code, picPhone, token)) {
      isAuthorized = true
    } else if (phoneLast4Input) {
      const actualLast4 = getPhoneLast4(picPhone)
      const inputLast4 = getPhoneLast4(phoneLast4Input)

      if (actualLast4 && inputLast4 && actualLast4 === inputLast4) {
        isAuthorized = true
        issuedToken = generateDeviceToken(code, picPhone)
        resetFailedAttempts(rateLimitKey)
      } else {
        const { isLocked, remainingAttempts } = recordFailedAttempt(rateLimitKey)
        if (isLocked) {
          return NextResponse.json(
            {
              error: 'Terlalu banyak percobaan yang salah. Akses ditangguhkan selama 15 menit.',
              is_rate_limited: true,
            },
            { status: 429 }
          )
        }
        return NextResponse.json(
          {
            error: `4 digit nomor HP tidak cocok dengan data pendaftaran. Sisa percobaan: ${remainingAttempts} kali.`,
            is_authorized: false,
            requires_verification: true,
          },
          { status: 403 }
        )
      }
    }

    // IF NOT AUTHORIZED: Return restricted metadata ONLY (zero sensitive data leakage)
    if (!isAuthorized) {
      return NextResponse.json({
        is_authorized: false,
        requires_verification: true,
        registration_code: group.registration_code,
        group_type: group.type,
        group_status: group.group_status,
        created_at: group.created_at,
        pic_name_hint: maskName(picName),
        phone_hint: maskPhone(picPhone),
        total_jamaah: jamaahs?.length || 1,
        departure_point_name: (group.departure_point as any)?.name || '—',
        package_name: (group.package as any)?.name || 'Umrah 100 Thn Gontor',
        message:
          'Perangkat ini belum terverifikasi. Masukkan 4 digit terakhir nomor WhatsApp/HP PIC untuk membuka data lengkap.',
      })
    }

    // IF AUTHORIZED: Ensure we have a valid device token to return
    if (!issuedToken && cleanPhone) {
      issuedToken = generateDeviceToken(code, picPhone)
    }

    const enrichedGroup = {
      ...group,
      pic_info: picInfo,
      pic_name: picName,
      pic_phone: picPhone,
      pic_email: picInfo?.email || '',
      pic_domicile_city: picInfo?.domicile_city || '',
      pic_is_departing:
        picInfo?.is_departing !== undefined
          ? Boolean(picInfo.is_departing)
          : Boolean(picJamaah),
    }

    return NextResponse.json({
      is_authorized: true,
      auth_token: issuedToken,
      group: enrichedGroup,
      jamaahs: jamaahs || [],
      payments: payments || [],
    })
  } catch (err) {
    console.error('[api/status] Error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat mengecek status.' },
      { status: 500 }
    )
  }
}
