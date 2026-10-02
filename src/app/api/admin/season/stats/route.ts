import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()

    const [
      { count: totalGroups },
      { count: totalJamaahs },
      { count: totalPayments },
      { count: activePackages },
      { data: generalSettings },
    ] = await Promise.all([
      supabase.from('registration_groups').select('*', { count: 'exact', head: true }),
      supabase.from('jamaahs').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('*', { count: 'exact', head: true }),
      supabase.from('packages').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('app_settings').select('value').eq('key', 'general_parameters').maybeSingle(),
    ])

    const params = (generalSettings?.value as Record<string, unknown>) || {}

    return NextResponse.json({
      totalGroups: totalGroups ?? 0,
      totalJamaahs: totalJamaahs ?? 0,
      totalPayments: totalPayments ?? 0,
      activePackages: activePackages ?? 0,
      registrationOpen: Boolean(params.registrationOpen ?? true),
      notes: params.notes || '',
    })
  } catch (err) {
    console.error('[season/stats]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Gagal mengambil statistik musim.' },
      { status: 500 }
    )
  }
}
