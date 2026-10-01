import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'bank_accounts')
      .maybeSingle()

    return NextResponse.json({
      banks: data?.value || null,
    })
  } catch (err) {
    console.error('[settings/banks/GET]', err)
    return NextResponse.json(
      { error: 'Gagal mengambil data rekening pembayaran.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { banks } = body

    if (!Array.isArray(banks)) {
      return NextResponse.json(
        { error: 'Format data rekening tidak valid.' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'bank_accounts',
          value: banks,
          description: 'Daftar rekening bank pembayaran panitia umrah',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving banks:', error)
      return NextResponse.json(
        { error: 'Gagal menyimpan data rekening: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      banks: data.value,
      message: 'Rekening bank berhasil disimpan.',
    })
  } catch (err) {
    console.error('[settings/banks/POST]', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat menyimpan rekening bank.' },
      { status: 500 }
    )
  }
}
