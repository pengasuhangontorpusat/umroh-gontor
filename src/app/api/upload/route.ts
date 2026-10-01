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
      .select('*, registration_groups(id, registration_code, type, group_status)')
      .eq('id', jamaahId)
      .single()

    if (jamaahError || !jamaah) {
      return NextResponse.json({ error: 'Jamaah tidak ditemukan.' }, { status: 404 })
    }

    // Determine upload folder
    const group = (jamaah as Record<string, unknown>).registration_groups as Record<string, unknown>
    const jamaahFolderName = jamaah.full_name.toUpperCase().replace(/\s+/g, '_')
    
    // Prepare file
    const ext = file.name.split('.').pop()
    const uploadName = `${docType.toUpperCase()}_${jamaahFolderName}_${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    let finalDriveFileId: string | null = null
    let finalFolderId: string | null = null
    let finalWebViewLink: string | null = null
    let finalFileSize: number = file.size
    let finalMimeType: string = file.type

    // 1. Try Google Drive first
    try {
      const jamaahRootFolderId = await getOrCreateFolder('02_Jamaah')
      const groupFolderId = await getOrCreateFolder(
        group.registration_code as string,
        jamaahRootFolderId
      )
      const memberFolderId = await getOrCreateFolder(jamaahFolderName, groupFolderId)

      const docSubfolderMap: Record<DocumentType, string> = {
        ktp: '01_KTP',
        kk: '02_KK',
        vaksin: '03_VAKSIN',
        paspor: '04_PASPOR',
        bukti_bayar: '05_BUKTI_BAYAR',
      }
      finalFolderId = await getOrCreateFolder(docSubfolderMap[docType], memberFolderId)

      const driveFile = await uploadFileToDrive({
        name: uploadName,
        mimeType: file.type,
        buffer,
        folderId: finalFolderId,
      })

      finalDriveFileId = driveFile.id
      finalWebViewLink = driveFile.webViewLink
      finalFileSize = driveFile.size || file.size
      finalMimeType = driveFile.mimeType || file.type
    } catch (driveErr) {
      console.warn(
        '[upload] Google Drive API error (Service account storage quota / permission), mengalihkan penyimpanan ke Supabase Storage:',
        driveErr
      )

      // Fallback: Simpan aman ke Supabase Storage 'documents' bucket
      const storagePath = `${group.registration_code}/${jamaahFolderName}/${uploadName}`
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true,
        })

      if (storageError) {
        console.error('[upload] Supabase storage fallback error:', storageError)
        throw new Error('Gagal mengunggah dokumen ke penyimpanan cloud.')
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath)

      finalDriveFileId = `storage:${storagePath}`
      finalFolderId = group.registration_code as string
      finalWebViewLink = urlData.publicUrl
    }

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
        drive_file_id: finalDriveFileId,
        drive_folder_id: finalFolderId,
        file_name: uploadName,
        mime_type: finalMimeType,
        file_size: finalFileSize,
        drive_web_view_url: finalWebViewLink,
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

    // If group was in revision_required, update it back to submitted so admin sees the revision
    if (group && (group as Record<string, unknown>).group_status === 'revision_required') {
      const gId = (group as Record<string, unknown>).id as string
      try {
        await supabase
          .from('registration_groups')
          .update({
            group_status: 'submitted',
            updated_at: new Date().toISOString(),
          })
          .eq('id', gId)

        await supabase.from('audit_logs').insert({
          actor_type: 'jamaah',
          action: 'group.revision_submitted',
          entity_type: 'registration_group',
          entity_id: gId,
          new_data: { document_type: docType, file_name: uploadName },
        })
      } catch (revErr) {
        console.warn('Could not update group status from revision_required:', revErr)
      }
    }

    // If this is payment proof, also update the payments table record
    const paymentId = formData.get('paymentId') as string | null
    if (docType === 'bukti_bayar') {
      try {
        if (paymentId) {
          await supabase
            .from('payments')
            .update({
              drive_file_id: finalDriveFileId,
              drive_web_view_url: finalWebViewLink,
              verification_status: 'proof_uploaded',
            })
            .eq('id', paymentId)
        } else {
          const { data: latestPayment } = await supabase
            .from('payments')
            .select('id')
            .eq('group_id', jamaah.group_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (latestPayment) {
            await supabase
              .from('payments')
              .update({
                drive_file_id: finalDriveFileId,
                drive_web_view_url: finalWebViewLink,
                verification_status: 'proof_uploaded',
              })
              .eq('id', latestPayment.id)
          }
        }
      } catch (pErr) {
        console.warn('Could not update payment proof record:', pErr)
      }
    }

    return NextResponse.json({
      document_id: doc.id,
      fileName: uploadName,
      fileUrl: finalWebViewLink,
      drive_file_id: finalDriveFileId,
    })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json(
      { error: 'Dokumen belum berhasil diunggah. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
