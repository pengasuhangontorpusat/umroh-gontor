import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { groupId, status, note } = await req.json()

    if (!groupId || !status) {
      return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // 1. Get current status
    const { data: currentGroup } = await supabase
      .from('registration_groups')
      .select('group_status, notes')
      .eq('id', groupId)
      .single()

    const oldStatus = currentGroup?.group_status

    // 2. Update status & notes
    const updatePayload: Record<string, unknown> = {
      group_status: status,
      updated_at: new Date().toISOString(),
    }
    if (note) {
      updatePayload.notes = note
    }

    const { error: updateError } = await supabase
      .from('registration_groups')
      .update(updatePayload)
      .eq('id', groupId)

    if (updateError) {
      console.error('Update group status error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 3. Log to audit_logs
    await supabase.from('audit_logs').insert({
      actor_type: 'panitia',
      action: 'group.status_updated',
      entity_type: 'registration_group',
      entity_id: groupId,
      old_data: { status: oldStatus },
      new_data: { status, note: note || undefined },
    })

    return NextResponse.json({ success: true, status })
  } catch (err) {
    console.error('Admin update status API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
