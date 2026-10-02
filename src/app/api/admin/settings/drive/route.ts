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

    const envConfig = {
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
      client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || '',
      private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY || '',
      root_folder_id: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1SYppeQgDeGY-nUHyOf4meuRdlECx5wKQ',
      shared_drive_id: process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '',
      auth_type:
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN
          ? 'oauth2'
          : process.env.GOOGLE_DRIVE_CLIENT_EMAIL && process.env.GOOGLE_DRIVE_PRIVATE_KEY
          ? 'service_account'
          : 'none',
      source: 'env',
    }

    if (error || !data?.value) {
      return NextResponse.json({ config: envConfig })
    }

    const val = data.value as Record<string, string | null | undefined>
    const hasOAuth = Boolean(
      (val.client_id || process.env.GOOGLE_CLIENT_ID) &&
      (val.client_secret || process.env.GOOGLE_CLIENT_SECRET) &&
      (val.refresh_token || process.env.GOOGLE_REFRESH_TOKEN)
    )

    return NextResponse.json({
      config: {
        client_id: val.client_id || process.env.GOOGLE_CLIENT_ID || '',
        client_secret: val.client_secret || process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: val.refresh_token || process.env.GOOGLE_REFRESH_TOKEN || '',
        client_email: val.client_email || process.env.GOOGLE_DRIVE_CLIENT_EMAIL || '',
        private_key: val.private_key || process.env.GOOGLE_DRIVE_PRIVATE_KEY || '',
        root_folder_id: val.root_folder_id || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1SYppeQgDeGY-nUHyOf4meuRdlECx5wKQ',
        shared_drive_id: val.shared_drive_id || process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '',
        auth_type: hasOAuth ? 'oauth2' : val.client_email ? 'service_account' : 'none',
        source: 'database',
        updated_at: data.updated_at,
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
    const {
      client_id,
      client_secret,
      refresh_token,
      client_email,
      private_key,
      root_folder_id,
      shared_drive_id,
    } = body

    if (!root_folder_id) {
      return NextResponse.json(
        { error: 'Root Folder ID wajib diisi.' },
        { status: 400 }
      )
    }

    const hasOAuth = Boolean(client_id && client_secret && refresh_token)
    const hasServiceAccount = Boolean(client_email && private_key)

    if (!hasOAuth && !hasServiceAccount) {
      return NextResponse.json(
        {
          error:
            'Harap lengkapi Kredensial OAuth2 (Client ID, Secret, Refresh Token) ATAU Service Account (Client Email & Private Key).',
        },
        { status: 400 }
      )
    }

    // Clean private key formatting if provided
    const cleanedPrivateKey = private_key ? private_key.replace(/\\n/g, '\n').trim() : ''

    const supabase = await createServiceClient()

    // Upsert app_settings
    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'google_drive',
          value: {
            client_id: client_id ? client_id.trim() : null,
            client_secret: client_secret ? client_secret.trim() : null,
            refresh_token: refresh_token ? refresh_token.trim() : null,
            client_email: client_email ? client_email.trim() : null,
            private_key: cleanedPrivateKey || null,
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
          error: 'Gagal menyimpan konfigurasi ke tabel app_settings di database.',
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
      new_data: {
        auth_type: hasOAuth ? 'oauth2' : 'service_account',
        client_id: client_id ? client_id.substring(0, 15) + '...' : null,
        client_email: client_email || null,
        root_folder_id,
        shared_drive_id,
      },
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
