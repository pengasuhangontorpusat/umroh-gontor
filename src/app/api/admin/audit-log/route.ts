import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, entity_type, entity_id, old_data, new_data } = body

    if (!action || !entity_type || !entity_id) {
      return NextResponse.json({ error: 'Parameter tidak lengkap.' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Get current user for actor_id
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('audit_logs').insert({
      actor_id: user?.id ?? null,
      actor_type: user ? 'panitia' : 'system',
      action,
      entity_type,
      entity_id,
      old_data: old_data ?? null,
      new_data: new_data ?? null,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[audit-log]', err)
    return NextResponse.json({ error: 'Gagal mencatat log.' }, { status: 500 })
  }
}
