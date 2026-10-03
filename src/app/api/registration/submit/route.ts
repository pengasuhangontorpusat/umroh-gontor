import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateIdempotencyKey } from '@/lib/utils'

// Prevent double submit with in-memory set (use Redis in production)
const processedKeys = new Set<string>()

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get('X-Idempotency-Key')

  // Idempotency check
  if (idempotencyKey && processedKeys.has(idempotencyKey)) {
    return NextResponse.json({ error: 'Request sudah diproses.' }, { status: 409 })
  }

  try {
    const body = await req.json()
    const {
      type,
      departure_point_id,
      package_id,
      pic_name,
      pic_phone,
      pic_email,
      pic_domicile_city,
      pic_is_departing,
      members,
      payment_type,
      payment_date,
    } = body

    // Validate required fields
    if (!type || !departure_point_id || !package_id || !members?.length) {
      return NextResponse.json(
        { error: 'Data pendaftaran tidak lengkap.' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // 1. Verify that registration is currently open in settings
    const { data: generalSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'general_parameters')
      .maybeSingle()

    const generalParams = generalSetting?.value as Record<string, unknown> | undefined
    if (generalParams && generalParams.registrationOpen === false) {
      return NextResponse.json(
        {
          error:
            'Pendaftaran saat ini sedang ditutup oleh Panitia Umrah 100 Tahun Gontor.',
        },
        { status: 400 }
      )
    }

    // 2. Verify that active packages exist
    const { data: activePackages } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (!activePackages || activePackages.length === 0) {
      return NextResponse.json(
        {
          error:
            'Pendaftaran belum dapat diproses karena belum ada paket umrah yang aktif di sistem pengaturan panitia.',
        },
        { status: 400 }
      )
    }

    // Verify selected package is active
    const selectedPkg = activePackages.find((p) => p.id === package_id)
    if (!selectedPkg) {
      return NextResponse.json(
        {
          error:
            'Paket umrah yang Anda pilih tidak aktif atau sudah tidak tersedia. Silakan pilih paket yang aktif.',
        },
        { status: 400 }
      )
    }

    const pkg = selectedPkg
    const targetPackageId = selectedPkg.id

    // 3. Verify that active departure points exist
    const { data: activeDps } = await supabase
      .from('departure_points')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (!activeDps || activeDps.length === 0) {
      return NextResponse.json(
        {
          error:
            'Pendaftaran belum dapat diproses karena belum ada titik keberangkatan yang aktif.',
        },
        { status: 400 }
      )
    }

    const selectedDp = activeDps.find((d) => d.id === departure_point_id)
    if (!selectedDp) {
      return NextResponse.json(
        {
          error:
            'Titik keberangkatan yang Anda pilih tidak aktif atau sudah tidak tersedia.',
        },
        { status: 400 }
      )
    }

    const targetDeparturePointId = selectedDp.id

    // Generate registration code using DB function with fallback
    let registrationCode = ''
    try {
      const { data: codeData } = await supabase.rpc(
        'generate_registration_code',
        { p_type: type }
      )
      if (codeData) registrationCode = codeData as string
    } catch (rpcErr) {
      console.warn('RPC code generation failed, using fallback:', rpcErr)
    }

    if (!registrationCode) {
      const rand = Math.floor(1000 + Math.random() * 9000)
      registrationCode = `UMR-2026-${type === 'family' ? 'G' : ''}${rand}`
    }

    // Store PIC information in notes JSON metadata
    const picMetadata = {
      pic: {
        name: (pic_name as string)?.trim() || '',
        phone: (pic_phone as string)?.trim() || '',
        email: (pic_email as string)?.trim() || '',
        domicile_city: (pic_domicile_city as string)?.trim() || '',
        is_departing: Boolean(pic_is_departing),
      },
    }

    // Create registration group
    const { data: group, error: groupError } = await supabase
      .from('registration_groups')
      .insert({
        registration_code: registrationCode,
        type,
        departure_point_id: targetDeparturePointId,
        package_id: targetPackageId,
        group_status: 'submitted',
        notes: JSON.stringify(picMetadata),
      })
      .select()
      .single()

    if (groupError || !group) {
      console.error('Group creation error:', groupError)
      throw new Error('Gagal membuat pendaftaran: ' + (groupError?.message || 'DB error'))
    }

    // Insert jamaahs
    const jamaahInserts = members.map((m: Record<string, unknown>, i: number) => {
      // Normalize gender ('male' | 'female')
      const gStr = String(m.gender || '').toLowerCase().trim()
      const normalizedGender =
        gStr === 'p' || gStr === 'perempuan' || gStr === 'female' || gStr === 'wanita'
          ? 'female'
          : 'male'

      // Normalize marital_status ('single' | 'married' | 'widowed' | 'divorced' | null)
      let normalizedMarital: 'single' | 'married' | 'widowed' | 'divorced' | null = null
      const mStr = String(m.marital_status || '').toLowerCase().trim()
      if (['menikah', 'kawin', 'married'].includes(mStr)) {
        normalizedMarital = 'married'
      } else if (['belum_menikah', 'belum menikah', 'lajang', 'single', 'belum kawin'].includes(mStr)) {
        normalizedMarital = 'single'
      } else if (['cerai_mati', 'duda', 'janda', 'widowed'].includes(mStr)) {
        normalizedMarital = 'widowed'
      } else if (['cerai_hidup', 'cerai', 'divorced'].includes(mStr)) {
        normalizedMarital = 'divorced'
      }

      // Normalize passport_status ('has_passport' | 'no_passport' | 'in_process')
      let normalizedPassport: 'has_passport' | 'no_passport' | 'in_process' = 'no_passport'
      if (m.has_passport === true || m.passport_status === 'has_passport' || Boolean(m.passport_number)) {
        normalizedPassport = 'has_passport'
      } else if (m.passport_status === 'in_process') {
        normalizedPassport = 'in_process'
      }

      // Address fallback from address_ktp
      const resolvedAddress = (m.address as string) || (m.address_ktp as string) || null

      return {
        group_id: group.id,
        registration_order: i + 1,
        full_name: m.full_name,
        gender: normalizedGender,
        father_name: m.father_name || null,
        nik: m.nik ? String(m.nik).trim().slice(0, 16) : null,
        birth_place: m.birth_place,
        birth_date: m.birth_date,
        nationality: m.nationality || (m.citizenship_type === 'wna' ? ((m.country as string) || 'WNA') : 'Indonesia'),
        marital_status: normalizedMarital,
        occupation: m.occupation || null,
        phone: m.phone || null,
        address: resolvedAddress,
        province: m.province || null,
        city: m.city || null,
        district: m.district || null,
        village: m.village || null,
        relationship_to_pic: m.relationship_to_pic || null,
        passport_status: normalizedPassport,
        passport_number: m.passport_number || null,
        passport_issue_place: m.passport_issue_place || null,
        passport_issue_date: m.passport_issue_date || null,
        passport_expiry_date: m.passport_expiry_date || null,
        has_disability: Boolean(m.has_disability) || false,
        disability_description: (m.disability_description as string) || null,
        medical_history: (m.medical_history as string) || null,
        clothing_size: (m.clothing_size as string) || null,
      }
    })

    const { data: jamaahs, error: jamaahError } = await supabase
      .from('jamaahs')
      .insert(jamaahInserts)
      .select()

    if (jamaahError || !jamaahs?.length) {
      console.error('Jamaah insert error details:', jamaahError)
      // Rollback group
      await supabase.from('registration_groups').delete().eq('id', group.id)
      throw new Error('Gagal menyimpan data jamaah: ' + (jamaahError?.message || 'unknown error'))
    }

    // Set PIC link ONLY if PIC is departing as one of the registered jamaahs
    let picJamaahId: string | null = null
    if (pic_is_departing) {
      const selfJamaah =
        jamaahs.find((j) => j.relationship_to_pic === 'Diri Sendiri (PIC)') ||
        jamaahs.find(
          (j) =>
            pic_name &&
            j.full_name?.toLowerCase().trim() === (pic_name as string).toLowerCase().trim()
        ) ||
        jamaahs[0]
      if (selfJamaah) {
        picJamaahId = selfJamaah.id
      }
    }

    if (picJamaahId) {
      await supabase
        .from('registration_groups')
        .update({ pic_jamaah_id: picJamaahId })
        .eq('id', group.id)
    }

    // Create payment record
    let paymentId: string | null = null
    if (payment_type) {
      const baseAmount = payment_type === 'full' ? Number(pkg.price) : Number(pkg.dp_amount)
      const amount = baseAmount * (members.length || 1)
      const { data: payData } = await supabase
        .from('payments')
        .insert({
          group_id: group.id,
          payer_jamaah_id: picJamaahId || jamaahs[0]?.id || null,
          payment_type,
          amount,
          payment_date: payment_date || null,
          verification_status: 'pending',
        })
        .select('id')
        .single()

      if (payData) paymentId = payData.id
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      actor_type: 'jamaah',
      action: 'registration.submitted',
      entity_type: 'registration_group',
      entity_id: group.id,
      new_data: {
        registration_code: registrationCode,
        type,
        pic_name,
        pic_is_departing: Boolean(pic_is_departing),
        member_count: members.length,
      },
    })

    // Mark idempotency key as processed
    if (idempotencyKey) {
      processedKeys.add(idempotencyKey)
      // Clear after 1 hour
      setTimeout(() => processedKeys.delete(idempotencyKey), 3600000)
    }

    return NextResponse.json({
      group_id: group.id,
      registration_code: registrationCode,
      jamaah_ids: jamaahs.map((j) => j.id),
      payment_id: paymentId,
    })
  } catch (err) {
    console.error('[registration/submit]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Terjadi kendala saat menyimpan data.' },
      { status: 500 }
    )
  }
}
