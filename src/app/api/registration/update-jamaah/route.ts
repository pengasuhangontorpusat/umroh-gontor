import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      registration_code,
      jamaah_id,
      full_name,
      father_name,
      nik,
      gender,
      birth_place,
      birth_date,
      marital_status,
      occupation,
      phone,
      address,
      province,
      city,
      district,
      village,
      clothing_size,
      has_disability,
      disability_description,
      medical_history,
      relationship_to_pic,
    } = body

    if (!registration_code || !jamaah_id || !full_name) {
      return NextResponse.json(
        { error: 'Kode pendaftaran, ID jamaah, dan nama lengkap wajib diisi.' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // 1. Look up group by registration code
    const { data: group, error: groupError } = await supabase
      .from('registration_groups')
      .select('id, registration_code, group_status')
      .ilike('registration_code', registration_code.trim())
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Kode pendaftaran tidak ditemukan.' },
        { status: 404 }
      )
    }

    // 2. Verify jamaah belongs to this group
    const { data: jamaah, error: jamaahError } = await supabase
      .from('jamaahs')
      .select('id, full_name, group_id')
      .eq('id', jamaah_id)
      .eq('group_id', group.id)
      .single()

    if (jamaahError || !jamaah) {
      return NextResponse.json(
        { error: 'Data jamaah tidak valid dalam rombongan ini.' },
        { status: 404 }
      )
    }

    // Update jamaah details
    const { error: updateError } = await supabase
      .from('jamaahs')
      .update({
        full_name: full_name.trim(),
        father_name: father_name?.trim() || null,
        nik: nik?.trim() || null,
        gender: gender || 'male',
        birth_place: birth_place?.trim() || '',
        birth_date: birth_date || null,
        marital_status: marital_status || null,
        occupation: occupation?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        province: province?.trim() || null,
        city: city?.trim() || null,
        district: district?.trim() || null,
        village: village?.trim() || null,
        clothing_size: clothing_size || null,
        has_disability: Boolean(has_disability),
        disability_description: has_disability ? disability_description?.trim() || null : null,
        medical_history: medical_history?.trim() || null,
        relationship_to_pic: relationship_to_pic?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jamaah_id)

    if (updateError) {
      console.error('[update-jamaah]', updateError)
      return NextResponse.json(
        { error: 'Gagal memperbarui data jamaah.' },
        { status: 500 }
      )
    }

    // If group was revision_required, reset to submitted
    if (group?.group_status === 'revision_required') {
      await supabase
        .from('registration_groups')
        .update({
          group_status: 'submitted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', group.id)
    }

    // Insert audit log
    await supabase.from('audit_logs').insert({
      actor_type: 'jamaah',
      action: 'jamaah.updated',
      entity_type: 'jamaah',
      entity_id: jamaah_id,
      new_data: {
        registration_code,
        full_name,
        updated_fields: Object.keys(body),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Data jamaah berhasil diperbarui.',
    })
  } catch (err) {
    console.error('[update-jamaah]', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memperbarui data jamaah.' },
      { status: 500 }
    )
  }
}
