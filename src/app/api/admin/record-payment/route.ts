import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { group_id, payment_type, amount, payment_date, verification_status, verification_note } = body

    if (!group_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Group ID dan nominal pembayaran wajib diisi dan harus lebih dari 0.' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    const { data: newPayment, error } = await supabase
      .from('payments')
      .insert({
        group_id,
        payment_type: payment_type || 'dp',
        amount: Number(amount),
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        verification_status: verification_status || 'verified',
        verification_note: verification_note || 'Dicatat manual oleh panitia',
        verified_at: verification_status === 'verified' ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error || !newPayment) {
      console.error('[record-payment] Error:', error)
      return NextResponse.json(
        { error: 'Gagal mencatat transaksi pembayaran.' },
        { status: 500 }
      )
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_type: 'panitia',
      action: 'payment.recorded_manual',
      entity_type: 'payment',
      entity_id: newPayment.id,
      new_data: { group_id, amount, payment_type, verification_status },
    })

    return NextResponse.json({
      success: true,
      payment: newPayment,
    })
  } catch (err) {
    console.error('[record-payment]', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server saat mencatat pembayaran.' },
      { status: 500 }
    )
  }
}
