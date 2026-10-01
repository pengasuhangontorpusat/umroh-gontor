import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { document_id, status, rejection_reason } = body

    if (!document_id || !status) {
      return NextResponse.json(
        { error: 'ID dokumen dan status verifikasi wajib diisi.' },
        { status: 400 }
      )
    }

    const validStatuses = ['uploaded', 'under_review', 'verified', 'revision_required', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status dokumen tidak valid.' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    const { data: updatedDoc, error } = await supabase
      .from('documents')
      .update({
        verification_status: status,
        rejection_reason: rejection_reason || null,
        verified_at: new Date().toISOString(),
      })
      .eq('id', document_id)
      .select('*, jamaah:jamaahs(full_name, group_id)')
      .single()

    if (error || !updatedDoc) {
      console.error('[verify-document] Error:', error)
      return NextResponse.json(
        { error: 'Gagal memperbarui status dokumen.' },
        { status: 500 }
      )
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_type: 'panitia',
      action: `document.${status}`,
      entity_type: 'document',
      entity_id: document_id,
      new_data: { status, rejection_reason },
    })

    return NextResponse.json({
      success: true,
      document: updatedDoc,
    })
  } catch (err) {
    console.error('[verify-document]', err)
    return NextResponse.json(
      { error: 'Terjadi kendala saat memverifikasi dokumen.' },
      { status: 500 }
    )
  }
}
