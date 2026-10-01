import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { client_email, private_key, root_folder_id } = body

    if (!client_email || !private_key || !root_folder_id) {
      return NextResponse.json(
        { error: 'Client Email, Private Key, dan Root Folder ID wajib diisi untuk pengetesan.' },
        { status: 400 }
      )
    }

    const cleanedPrivateKey = private_key.replace(/\\n/g, '\n').trim()

    // Initialize Google Drive client with provided credentials
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: client_email.trim(),
        private_key: cleanedPrivateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    })

    const drive = google.drive({ version: 'v3', auth })

    // Verify root folder access
    const folderRes = await drive.files.get({
      fileId: root_folder_id.trim(),
      fields: 'id, name, mimeType, capabilities',
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

    return NextResponse.json({
      success: true,
      message: 'Koneksi ke Google Drive Berhasil!',
      folder_name: folderRes.data.name,
      folder_id: folderRes.data.id,
      can_add_children: folderRes.data.capabilities?.canAddChildren ?? true,
    })
  } catch (err: unknown) {
    console.error('[settings/drive/test]', err)
    const errorMsg =
      err instanceof Error
        ? err.message
        : 'Gagal terhubung ke Google Drive. Periksa kembali kredensial atau pastikan Service Account telah diberi akses Editor ke folder tersebut.'

    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
