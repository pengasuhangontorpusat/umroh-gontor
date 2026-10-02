import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()

    // 1. Fetch all data for full backup
    const [
      { data: groups },
      { data: jamaahs },
      { data: payments },
      { data: documents },
      { data: packages },
      { data: departurePoints },
    ] = await Promise.all([
      supabase.from('registration_groups').select('*').order('created_at', { ascending: true }),
      supabase.from('jamaahs').select('*').order('created_at', { ascending: true }),
      supabase.from('payments').select('*').order('created_at', { ascending: true }),
      supabase.from('documents').select('*').order('created_at', { ascending: true }),
      supabase.from('packages').select('*').order('created_at', { ascending: true }),
      supabase.from('departure_points').select('*').order('sort_order', { ascending: true }),
    ])

    const backupPayload = {
      app: 'Portal Pendaftaran Umrah 100 Tahun Gontor',
      backup_type: 'full_season_archive',
      exported_at: new Date().toISOString(),
      summary: {
        total_groups: groups?.length || 0,
        total_jamaahs: jamaahs?.length || 0,
        total_payments: payments?.length || 0,
        total_documents: documents?.length || 0,
        total_packages: packages?.length || 0,
      },
      data: {
        registration_groups: groups || [],
        jamaahs: jamaahs || [],
        payments: payments || [],
        documents: documents || [],
        packages: packages || [],
        departure_points: departurePoints || [],
      },
    }

    const jsonString = JSON.stringify(backupPayload, null, 2)
    const year = new Date().getFullYear()
    const filename = `arsip-umrah-musim-${year}-${Date.now()}.json`

    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[season/backup]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Gagal membuat arsip data.' },
      { status: 500 }
    )
  }
}
