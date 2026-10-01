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

    // Query jamaahs with complete details and documents
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
    const { data: payments, error: paymentErr } = await supabase
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
