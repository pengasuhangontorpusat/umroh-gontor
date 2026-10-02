import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { confirmation, deactivatePackages = true, closeRegistration = true, resetNotes } = body

    if (confirmation !== 'TUTUP BUKU') {
      return NextResponse.json(
        { error: 'Konfirmasi tidak sesuai. Harap ketik "TUTUP BUKU" persis seperti yang diminta.' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // 1. Get counts before wiping for audit trail
    const [
      { count: totalGroups },
      { count: totalJamaahs },
      { count: totalPayments },
    ] = await Promise.all([
      supabase.from('registration_groups').select('*', { count: 'exact', head: true }),
      supabase.from('jamaahs').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('*', { count: 'exact', head: true }),
    ])

    // 2. Insert audit log
    await supabase.from('audit_logs').insert({
      actor_type: 'panitia',
      action: 'season.closed_and_reset',
      entity_type: 'system',
      entity_id: '00000000-0000-0000-0000-000000000000',
      old_data: {
        total_groups: totalGroups ?? 0,
        total_jamaahs: totalJamaahs ?? 0,
        total_payments: totalPayments ?? 0,
        notes: resetNotes || 'Tutup buku akhir musim umrah dan pengosongan database jamaah',
        timestamp: new Date().toISOString(),
      },
      new_data: {
        status: 'database_reset_for_next_season',
        deactivate_packages: deactivatePackages,
        close_registration: closeRegistration,
      },
    })

    // 3. Deactivate old packages if requested (keep them documented, but inactive)
    let packagesDeactivated = 0
    if (deactivatePackages) {
      const { data: updatedPkgs, error: pkgError } = await supabase
        .from('packages')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('is_active', true)
        .select('id')

      if (!pkgError && updatedPkgs) {
        packagesDeactivated = updatedPkgs.length
      }
    }

    // 4. Update general settings (Close registration)
    if (closeRegistration) {
      const { data: currentSettings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'general_parameters')
        .maybeSingle()

      const currentVals = (currentSettings?.value as Record<string, unknown>) || {}
      await supabase.from('app_settings').upsert(
        {
          key: 'general_parameters',
          value: {
            ...currentVals,
            registrationOpen: false,
            notes: 'Pendaftaran ditutup - Persiapan musim umrah berikutnya.',
          },
          description: 'Parameter sistem, kuota, kontak bantuan, dan status buka pendaftaran',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
    }

    // 5. Delete all registration groups (cascades to jamaahs, documents, payments)
    const { error: deleteError } = await supabase
      .from('registration_groups')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (deleteError) {
      console.error('[season/close] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Gagal mengosongkan data pendaftaran: ' + deleteError.message },
        { status: 500 }
      )
    }

    // 6. Optional: Reset sequence if custom RPC is available
    try {
      await supabase.rpc('reset_registration_sequence')
    } catch {
      // Ignore if RPC is not present
    }

    return NextResponse.json({
      success: true,
      message: 'Tutup buku berhasil. Database pendaftaran jamaah telah dikosongkan dan siap untuk persiapan musim berikutnya.',
      summary: {
        groups_cleared: totalGroups ?? 0,
        jamaahs_cleared: totalJamaahs ?? 0,
        payments_cleared: totalPayments ?? 0,
        packages_deactivated: packagesDeactivated,
        registration_closed: closeRegistration,
      },
    })
  } catch (err) {
    console.error('[season/close]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Terjadi kendala saat proses tutup buku.' },
      { status: 500 }
    )
  }
}
