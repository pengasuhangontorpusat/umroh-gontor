import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      document_id,
      jamaah_id,
      document_type,
      status,
      rejection_reason,
      verification_note,
    } = body

    const note = verification_note || rejection_reason || null

    if (!status || (!document_id && (!jamaah_id || !document_type))) {
      return NextResponse.json(
        { error: 'Parameter dokumen (document_id atau jamaah_id + document_type) dan status verifikasi wajib diisi.' },
        { status: 400 }
      )
    }

    const validStatuses = ['not_uploaded', 'uploaded', 'under_review', 'verified', 'revision_required', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status dokumen tidak valid.' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    let docResult = null
    let targetDocId = document_id

    if (document_id) {
      // 1. Update existing document
      const { data: updatedDoc, error } = await supabase
        .from('documents')
        .update({
          verification_status: status,
          verification_note: note,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', document_id)
        .select('*, jamaah:jamaahs(full_name, group_id)')
        .single()

      if (error || !updatedDoc) {
        console.error('[verify-document] Update error:', error)
        return NextResponse.json(
          { error: error?.message || 'Gagal memperbarui status dokumen.' },
          { status: 500 }
        )
      }
      docResult = updatedDoc
    } else {
      // 2. Insert placeholder document (e.g. asking for missing document / revision before upload)
      // Check if one already exists for this jamaah and docType
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('jamaah_id', jamaah_id)
        .eq('document_type', document_type)
        .maybeSingle()

      if (existing?.id) {
        const { data: updatedDoc, error } = await supabase
          .from('documents')
          .update({
            verification_status: status,
            verification_note: note,
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('*, jamaah:jamaahs(full_name, group_id)')
          .single()

        if (error || !updatedDoc) {
          return NextResponse.json({ error: error?.message || 'Gagal memperbarui dokumen.' }, { status: 500 })
        }
        docResult = updatedDoc
        targetDocId = existing.id
      } else {
        const { data: insertedDoc, error } = await supabase
          .from('documents')
          .insert({
            jamaah_id,
            document_type,
            verification_status: status,
            verification_note: note,
            verified_at: new Date().toISOString(),
          })
          .select('*, jamaah:jamaahs(full_name, group_id)')
          .single()

        if (error || !insertedDoc) {
          console.error('[verify-document] Insert error:', error)
          return NextResponse.json(
            { error: error?.message || 'Gagal mencatat permintaan dokumen.' },
            { status: 500 }
          )
        }
        docResult = insertedDoc
        targetDocId = insertedDoc.id
      }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_type: 'panitia',
      action: `document.${status}`,
      entity_type: 'document',
      entity_id: targetDocId,
      new_data: { status, verification_note: note },
    })

    return NextResponse.json({
      success: true,
      document: docResult,
    })
  } catch (err) {
    console.error('[verify-document]', err)
    return NextResponse.json(
      { error: 'Terjadi kendala saat memverifikasi dokumen.' },
      { status: 500 }
    )
  }
}
