import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'general_parameters')
      .maybeSingle()

    return NextResponse.json({
      parameters: data?.value || null,
    })
  } catch (err) {
    console.error('[settings/general/GET]', err)
    return NextResponse.json(
      { error: 'Gagal mengambil parameter pendaftaran.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { registrationOpen, totalQuota, dpMinimum, helpdeskWhatsapp, contactEmail, notes } = body

    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'general_parameters',
          value: {
            registrationOpen: Boolean(registrationOpen),
            totalQuota: Number(totalQuota) || 1000,
            dpMinimum: Number(dpMinimum) || 5000000,
            helpdeskWhatsapp: helpdeskWhatsapp || '',
            contactEmail: contactEmail || '',
            notes: notes || '',
          },
          description: 'Parameter sistem, kuota, kontak bantuan, dan status buka pendaftaran',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving general parameters:', error)
      return NextResponse.json(
        { error: 'Gagal menyimpan parameter ke database: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      parameters: data.value,
      message: 'Parameter pendaftaran berhasil disimpan.',
    })
  } catch (err) {
    console.error('[settings/general/POST]', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat menyimpan parameter.' },
      { status: 500 }
    )
  }
}
