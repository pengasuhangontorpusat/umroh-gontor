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

    // Resolve package safely (avoids FK violation if client used fallback ID)
    let targetPackageId = package_id
    let pkg = null

    const { data: foundPkg } = await supabase
      .from('packages')
      .select('*')
      .eq('id', package_id)
      .maybeSingle()

    if (foundPkg) {
      pkg = foundPkg
    } else {
      const { data: firstPkg } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (firstPkg) {
        pkg = firstPkg
        targetPackageId = firstPkg.id
      } else {
        pkg = {
          price: 37200000,
          dp_amount: 5000000,
        }
      }
    }

    // Resolve departure point safely (avoids FK violation if client used fallback ID)
    let targetDeparturePointId = departure_point_id
    const { data: foundDp } = await supabase
      .from('departure_points')
      .select('id')
      .eq('id', departure_point_id)
      .maybeSingle()

    if (!foundDp) {
      const { data: firstDp } = await supabase
        .from('departure_points')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (firstDp) {
        targetDeparturePointId = firstDp.id
      } else {
        targetDeparturePointId = null
      }
    }

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
    const jamaahInserts = members.map((m: Record<string, unknown>, i: number) => ({
      group_id: group.id,
      registration_order: i + 1,
      full_name: m.full_name,
      gender: m.gender,
      father_name: m.father_name || null,
      nik: m.nik || null,
      birth_place: m.birth_place,
      birth_date: m.birth_date,
      nationality: m.nationality || 'Indonesia',
      marital_status: m.marital_status || null,
      occupation: m.occupation || null,
      phone: m.phone || null,
      address: m.address || null,
      province: m.province || null,
      city: m.city || null,
      district: m.district || null,
      village: m.village || null,
      relationship_to_pic: m.relationship_to_pic || null,
      passport_status: m.passport_status || 'no_passport',
      passport_number: m.passport_number || null,
      passport_issue_place: m.passport_issue_place || null,
      passport_issue_date: m.passport_issue_date || null,
      passport_expiry_date: m.passport_expiry_date || null,
      has_disability: Boolean(m.has_disability) || false,
      disability_description: (m.disability_description as string) || null,
      medical_history: (m.medical_history as string) || null,
      clothing_size: (m.clothing_size as string) || null,
    }))

    const { data: jamaahs, error: jamaahError } = await supabase
      .from('jamaahs')
      .insert(jamaahInserts)
      .select()

    if (jamaahError || !jamaahs?.length) {
      // Rollback group
      await supabase.from('registration_groups').delete().eq('id', group.id)
      throw new Error('Gagal menyimpan data jamaah.')
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
