import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'google_drive')
      .maybeSingle()

    if (error) {
      // Table might not exist yet if migration hasn't been run
      return NextResponse.json({
        config: {
          client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || '',
          private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY || '',
          root_folder_id: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '',
          shared_drive_id: process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '',
          source: 'env',
        },
      })
    }

    if (data?.value) {
      return NextResponse.json({
        config: {
          ...data.value,
          source: 'database',
          updated_at: data.updated_at,
        },
      })
    }

    // Fallback to env
    return NextResponse.json({
      config: {
        client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || '',
        private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY || '',
        root_folder_id: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '',
        shared_drive_id: process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '',
        source: 'env',
      },
    })
  } catch (err) {
    console.error('[settings/drive/GET]', err)
    return NextResponse.json(
      { error: 'Gagal mengambil konfigurasi Google Drive.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { client_email, private_key, root_folder_id, shared_drive_id } = body

    if (!client_email || !private_key || !root_folder_id) {
      return NextResponse.json(
        { error: 'Client Email, Private Key, dan Root Folder ID wajib diisi.' },
        { status: 400 }
      )
    }

    // Clean private key formatting
    const cleanedPrivateKey = private_key.replace(/\\n/g, '\n').trim()

    const supabase = await createServiceClient()

    // Upsert app_settings
    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'google_drive',
          value: {
            client_email: client_email.trim(),
            private_key: cleanedPrivateKey,
            root_folder_id: root_folder_id.trim(),
            shared_drive_id: shared_drive_id ? shared_drive_id.trim() : null,
          },
          description: 'Kredensial Google Drive API & Folder Root Penyimpanan Jamaah',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select()
      .single()

    if (error) {
      console.error('Save drive settings error:', error)
      return NextResponse.json(
        {
          error:
            'Gagal menyimpan konfigurasi. Pastikan migration 004_create_app_settings.sql sudah dijalankan di Supabase SQL Editor.',
        },
        { status: 500 }
      )
    }

    // Log to audit logs
    await supabase.from('audit_logs').insert({
      actor_type: 'panitia',
      action: 'settings.google_drive_updated',
      entity_type: 'app_settings',
      entity_id: '00000000-0000-0000-0000-000000000000',
      new_data: { client_email, root_folder_id, shared_drive_id },
    })

    return NextResponse.json({
      success: true,
      message: 'Konfigurasi Google Drive berhasil disimpan.',
      config: data.value,
    })
  } catch (err) {
    console.error('[settings/drive/POST]', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat menyimpan pengaturan.' },
      { status: 500 }
    )
  }
}
