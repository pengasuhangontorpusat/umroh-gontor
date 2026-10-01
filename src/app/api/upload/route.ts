import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { uploadFileToDrive, getOrCreateFolder } from '@/lib/google-drive'
import { DocumentType } from '@/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const jamaahId = formData.get('jamaahId') as string | null
    const docType = formData.get('docType') as DocumentType | null

    if (!file || !jamaahId || !docType) {
      return NextResponse.json({ error: 'Parameter tidak lengkap.' }, { status: 400 })
    }

    // Validate file
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan PDF, JPG, atau PNG.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file melebihi batas maksimal 10MB.' },
        { status: 400 }
      )
    }

    // Verify jamaah exists (also gets group info for folder path)
    const supabase = await createServiceClient()
    const { data: jamaah, error: jamaahError } = await supabase
      .from('jamaahs')
      .select('*, registration_groups(registration_code, type)')
      .eq('id', jamaahId)
      .single()

    if (jamaahError || !jamaah) {
      return NextResponse.json({ error: 'Jamaah tidak ditemukan.' }, { status: 404 })
    }

    // Determine upload folder
    const group = (jamaah as Record<string, unknown>).registration_groups as Record<string, unknown>
    const jamaahFolderName = jamaah.full_name.toUpperCase().replace(/\s+/g, '_')
    
    // Get folder: Jamaah root > Group > Member
    const jamaahRootFolderId = await getOrCreateFolder('02_Jamaah')
    const groupFolderId = await getOrCreateFolder(
      group.registration_code as string,
      jamaahRootFolderId
    )
    const memberFolderId = await getOrCreateFolder(jamaahFolderName, groupFolderId)

    // Doc subfolder
    const docSubfolderMap: Record<DocumentType, string> = {
      ktp: '01_KTP',
      kk: '02_KK',
      vaksin: '03_VAKSIN',
      paspor: '04_PASPOR',
      bukti_bayar: '05_BUKTI_BAYAR',
    }
    const docFolderId = await getOrCreateFolder(docSubfolderMap[docType], memberFolderId)

    // Prepare file
    const ext = file.name.split('.').pop()
    const uploadName = `${docType.toUpperCase()}_${jamaahFolderName}_${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to Drive
    const driveFile = await uploadFileToDrive({
      name: uploadName,
      mimeType: file.type,
      buffer,
      folderId: docFolderId,
    })

    // Check for existing document (for versioning)
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id, version')
      .eq('jamaah_id', jamaahId)
      .eq('document_type', docType)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const newVersion = existingDoc ? existingDoc.version + 1 : 1

    // Save metadata to Supabase
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        jamaah_id: jamaahId,
        document_type: docType,
        drive_file_id: driveFile.id,
        drive_folder_id: docFolderId,
        file_name: uploadName,
        mime_type: driveFile.mimeType,
        file_size: driveFile.size,
        drive_web_view_url: driveFile.webViewLink,
        verification_status: 'uploaded',
        uploaded_at: new Date().toISOString(),
        version: newVersion,
        previous_document_id: existingDoc?.id ?? null,
      })
      .select()
      .single()

    if (docError) {
      throw new Error('Gagal menyimpan metadata dokumen.')
    }

    return NextResponse.json({
      document_id: doc.id,
      fileName: uploadName,
      fileUrl: driveFile.webViewLink,
      drive_file_id: driveFile.id,
    })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json(
      { error: 'Dokumen belum berhasil diunggah. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
