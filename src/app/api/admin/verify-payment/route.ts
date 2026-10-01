import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { payment_id, status, note } = body

    if (!payment_id || !status) {
      return NextResponse.json(
        { error: 'ID pembayaran dan status verifikasi wajib diisi.' },
        { status: 400 }
      )
    }

    const validStatuses = ['pending', 'proof_uploaded', 'verified', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status pembayaran tidak valid.' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    const { data: updatedPayment, error } = await supabase
      .from('payments')
      .update({
        verification_status: status,
        verification_note: note || null,
        verified_at: new Date().toISOString(),
      })
      .eq('id', payment_id)
      .select('*, registration_groups(id, group_status)')
      .single()

    if (error || !updatedPayment) {
      console.error('[verify-payment] Error:', error)
      return NextResponse.json(
        { error: 'Gagal memperbarui status pembayaran.' },
        { status: 500 }
      )
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_type: 'panitia',
      action: `payment.${status}`,
      entity_type: 'payment',
      entity_id: payment_id,
      new_data: { status, note },
    })

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
    })
  } catch (err) {
    console.error('[verify-payment]', err)
    return NextResponse.json(
      { error: 'Terjadi kendala saat memverifikasi pembayaran.' },
      { status: 500 }
    )
  }
}
