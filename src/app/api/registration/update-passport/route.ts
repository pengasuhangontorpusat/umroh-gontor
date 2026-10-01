import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      registration_code,
      jamaah_id,
      passport_number,
      passport_issue_place,
      passport_issue_date,
      passport_expiry_date,
    } = body

    if (!registration_code || !jamaah_id || !passport_number) {
      return NextResponse.json(
        { error: 'Kode pendaftaran, ID jamaah, dan nomor paspor wajib diisi.' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Verify registration group matches code and contains this jamaah
    const { data: jamaah, error: jamaahError } = await supabase
      .from('jamaahs')
      .select('id, full_name, group_id, registration_groups!inner(id, registration_code)')
      .eq('id', jamaah_id)
      .eq('registration_groups.registration_code', registration_code.trim().toUpperCase())
      .single()

    if (jamaahError || !jamaah) {
      return NextResponse.json(
        { error: 'Data jamaah atau kode pendaftaran tidak valid.' },
        { status: 404 }
      )
    }

    // Update passport details
    const { error: updateError } = await supabase
      .from('jamaahs')
      .update({
        passport_status: 'has_passport',
        passport_number: passport_number.trim().toUpperCase(),
        passport_issue_place: passport_issue_place?.trim() || null,
        passport_issue_date: passport_issue_date || null,
        passport_expiry_date: passport_expiry_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jamaah_id)

    if (updateError) {
      console.error('[update-passport]', updateError)
      return NextResponse.json(
        { error: 'Gagal memperbarui data paspor.' },
        { status: 500 }
      )
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_type: 'jamaah',
      action: 'passport.updated',
      entity_type: 'jamaah',
      entity_id: jamaah_id,
      new_data: {
        registration_code,
        passport_number: passport_number.trim().toUpperCase(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Data paspor berhasil diperbarui.',
    })
  } catch (err) {
    console.error('[update-passport]', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memperbarui data paspor.' },
      { status: 500 }
    )
  }
}
