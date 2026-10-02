import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'

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
    } = body

    if (!root_folder_id) {
      return NextResponse.json(
        { error: 'Root Folder ID Google Drive wajib diisi untuk pengetesan.' },
        { status: 400 }
      )
    }

    let auth: any

    const hasOAuth = Boolean(client_id && client_secret && refresh_token)
    const hasServiceAccount = Boolean(client_email && private_key)

    if (hasOAuth) {
      const oauth2Client = new google.auth.OAuth2(
        client_id.trim(),
        client_secret.trim(),
        'https://developers.google.com/oauthplayground'
      )
      oauth2Client.setCredentials({
        refresh_token: refresh_token.trim(),
      })
      auth = oauth2Client
    } else if (hasServiceAccount) {
      let key = private_key.trim()
      if (key.startsWith('"') && key.endsWith('"')) {
        key = key.substring(1, key.length - 1)
      }
      key = key.replace(/\\n/g, '\n')

      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: client_email.trim(),
          private_key: key,
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      })
    } else {
      return NextResponse.json(
        {
          error:
            'Harap masukkan Kredensial OAuth2 (Client ID, Secret, Refresh Token) atau Service Account untuk diuji.',
        },
        { status: 400 }
      )
    }

    const drive = google.drive({ version: 'v3', auth })

    // 1. Verify root folder access
    const folderRes = await drive.files.get({
      fileId: root_folder_id.trim(),
      fields: 'id, name, mimeType',
      supportsAllDrives: true,
    })

    if (!folderRes.data.id) {
      return NextResponse.json(
        { error: 'Folder tidak ditemukan di Google Drive.' },
        { status: 404 }
      )
    }

    if (folderRes.data.mimeType !== 'application/vnd.google-apps.folder') {
      return NextResponse.json(
        {
          error: `ID "${root_folder_id}" bukan merupakan folder Google Drive (tipe: ${folderRes.data.mimeType}).`,
        },
        { status: 400 }
      )
    }

    // 2. Perform actual upload write & delete test to ensure quota & permissions are valid!
    try {
      const testBuffer = Buffer.from('Google Drive Test Connection Check')
      const readable = new Readable()
      readable.push(testBuffer)
      readable.push(null)

      const testFile = await drive.files.create({
        requestBody: {
          name: `__test_conn_${Date.now()}.txt`,
          parents: [root_folder_id.trim()],
        },
        media: {
          mimeType: 'text/plain',
          body: readable,
        },
        fields: 'id',
        supportsAllDrives: true,
      })

      if (testFile.data.id) {
        // Delete test file cleanly
        await drive.files.delete({
          fileId: testFile.data.id,
          supportsAllDrives: true,
        })
      }
    } catch (writeErr: any) {
      console.error('[settings/drive/test] Write test failed:', writeErr)
      const writeMsg = writeErr?.message || 'Izin tulis gagal'
      return NextResponse.json(
        {
          error: `Folder terhubung, namun gagal mengunggah file uji: ${writeMsg}. ${
            !hasOAuth
              ? 'Catatan: Service Account sering terkena batas kuota personal drive (Storage Quota). Gunakan OAuth2 atau Shared Drive.'
              : ''
          }`,
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Koneksi dan Izin Tulis ke Google Drive Berhasil! (Metode: ${hasOAuth ? 'OAuth2 Bebas Kuota' : 'Service Account'})`,
      folder_name: folderRes.data.name,
      folder_id: folderRes.data.id,
      auth_type: hasOAuth ? 'oauth2' : 'service_account',
    })
  } catch (err: unknown) {
    console.error('[settings/drive/test]', err)
    const errorMsg =
      err instanceof Error
        ? err.message
        : 'Gagal terhubung ke Google Drive. Periksa kembali kredensial atau pastikan akses folder sudah diberikan.'

    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
