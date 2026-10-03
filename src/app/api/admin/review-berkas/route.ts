import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim().toLowerCase() || ''
    const statusFilter = searchParams.get('status') || 'all' // 'all', 'needs_review', 'verified', 'revision_required'

    // Fetch jamaahs with their documents and group info
    const { data: jamaahs, error } = await supabase
      .from('jamaahs')
      .select(`
        *,
        documents(*),
        group:registration_groups!jamaahs_group_id_fkey(
          id,
          registration_code,
          type,
          group_status,
          created_at,
          package:packages(id, name, price),
          departure_point:departure_points(id, name)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[review-berkas/GET] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const allJamaahs = jamaahs || []

    // Calculate global stats
    let totalDocsUploaded = 0
    let pendingReviewCount = 0
    let verifiedCount = 0
    let revisionRequiredCount = 0

    allJamaahs.forEach((j) => {
      const docs = (j.documents || []) as Array<{ verification_status?: string }>
      docs.forEach((doc) => {
        totalDocsUploaded++
        const st = doc.verification_status || 'uploaded'
        if (st === 'uploaded' || st === 'under_review') {
          pendingReviewCount++
        } else if (st === 'verified') {
          verifiedCount++
        } else if (st === 'revision_required' || st === 'rejected') {
          revisionRequiredCount++
        }
      })
    })

    // Filter jamaahs based on search query and status filter
    let filteredJamaahs = allJamaahs

    if (search) {
      filteredJamaahs = filteredJamaahs.filter((j) => {
        const nameMatch = j.full_name?.toLowerCase().includes(search)
        const nikMatch = j.nik?.includes(search)
        const codeMatch = j.group?.registration_code?.toLowerCase().includes(search)
        const passportMatch = j.passport_number?.toLowerCase().includes(search)
        return nameMatch || nikMatch || codeMatch || passportMatch
      })
    }

    if (statusFilter === 'needs_review') {
      filteredJamaahs = filteredJamaahs.filter((j) => {
        const docs = (j.documents || []) as Array<{ verification_status?: string }>
        return docs.some((d) => (d.verification_status || 'uploaded') === 'uploaded' || d.verification_status === 'under_review')
      })
    } else if (statusFilter === 'verified') {
      filteredJamaahs = filteredJamaahs.filter((j) => {
        const docs = (j.documents || []) as Array<{ verification_status?: string }>
        return docs.length > 0 && docs.every((d) => d.verification_status === 'verified')
      })
    } else if (statusFilter === 'revision_required') {
      filteredJamaahs = filteredJamaahs.filter((j) => {
        const docs = (j.documents || []) as Array<{ verification_status?: string }>
        return docs.some((d) => d.verification_status === 'revision_required' || d.verification_status === 'rejected')
      })
    }

    return NextResponse.json({
      jamaahs: filteredJamaahs,
      summary: {
        totalJamaahs: allJamaahs.length,
        totalDocsUploaded,
        pendingReviewCount,
        verifiedCount,
        revisionRequiredCount,
      },
    })
  } catch (err) {
    console.error('[review-berkas/GET] Internal error:', err)
    return NextResponse.json({ error: 'Gagal memuat data review berkas' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { jamaahId, fields } = body

    if (!jamaahId || !fields || typeof fields !== 'object') {
      return NextResponse.json(
        { error: 'ID jamaah dan data perubahan wajib diisi.' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // 1. Fetch current jamaah data for audit log
    const { data: currentJamaah, error: fetchErr } = await supabase
      .from('jamaahs')
      .select('*')
      .eq('id', jamaahId)
      .single()

    if (fetchErr || !currentJamaah) {
      return NextResponse.json({ error: 'Data jamaah tidak ditemukan.' }, { status: 404 })
    }

    // 2. Prepare payload with sanitization
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    const allowedFields = [
      'full_name',
      'nik',
      'gender',
      'birth_place',
      'birth_date',
      'nationality',
      'father_name',
      'relationship_to_pic',
      'address',
      'city',
      'province',
      'district',
      'village',
      'passport_status',
      'passport_number',
      'passport_issue_place',
      'passport_issue_date',
      'passport_expiry_date',
      'medical_history',
      'clothing_size',
    ]

    allowedFields.forEach((key) => {
      if (fields[key] !== undefined) {
        if (typeof fields[key] === 'string') {
          updatePayload[key] = fields[key].trim() || null
        } else {
          updatePayload[key] = fields[key]
        }
      }
    })

    // Specifically handle NIK length (max 16 chars)
    if (typeof updatePayload.nik === 'string' && updatePayload.nik) {
      updatePayload.nik = updatePayload.nik.slice(0, 16)
    }

    // 3. Update in database
    const { data: updated, error: updateErr } = await supabase
      .from('jamaahs')
      .update(updatePayload)
      .eq('id', jamaahId)
      .select()
      .single()

    if (updateErr) {
      console.error('[review-berkas/PATCH] Update error:', updateErr)
      return NextResponse.json(
        { error: 'Gagal menyimpan perubahan: ' + updateErr.message },
        { status: 500 }
      )
    }

    // 4. Record audit log
    try {
      await supabase.from('audit_logs').insert({
        actor_type: 'panitia',
        action: 'jamaah.corrected_by_admin',
        entity_type: 'jamaah',
        entity_id: jamaahId,
        old_data: currentJamaah,
        new_data: updated,
      })
    } catch (auditErr) {
      console.warn('Failed to insert audit log for jamaah update:', auditErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Data jamaah berhasil diperbarui.',
      jamaah: updated,
    })
  } catch (err) {
    console.error('[review-berkas/PATCH] Server error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memperbarui data jamaah.' },
      { status: 500 }
    )
  }
}
