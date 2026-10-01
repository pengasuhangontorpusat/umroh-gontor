import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()

    if (!code) {
      return NextResponse.json({ error: 'Kode pendaftaran wajib diisi.' }, { status: 400 })
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
        package:packages(id, name, price, dp_amount)
      `)
      .ilike('registration_code', code)
      .maybeSingle()

    if (groupErr || !group) {
      return NextResponse.json(
        { error: 'Kode pendaftaran tidak ditemukan. Periksa kembali kode pendaftaran Anda.' },
        { status: 404 }
      )
    }

    // Query jamaahs
    const { data: jamaahs, error: jamaahErr } = await supabase
      .from('jamaahs')
      .select(`
        id,
        registration_order,
        full_name,
        gender,
        relationship_to_pic,
        passport_status,
        has_disability,
        disability_description,
        medical_history,
        clothing_size,
        documents (
          id,
          document_type,
          verification_status,
          rejection_reason,
          drive_web_view_url
        )
      `)
      .eq('group_id', group.id)
      .order('registration_order', { ascending: true })

    // Query payments
    const { data: payments, error: paymentErr } = await supabase
      .from('payments')
      .select(`
        id,
        payment_type,
        amount,
        payment_date,
        verification_status,
        verification_note
      `)
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      group,
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
