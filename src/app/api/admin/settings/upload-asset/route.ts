import { NextRequest, NextResponse } from 'next/server'
import { uploadFileToDrive, getOrCreateFolder } from '@/lib/google-drive'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const assetType = (formData.get('assetType') as string) || 'banner' // 'logo' | 'banner'

    if (!file) {
      return NextResponse.json({ error: 'File gambar wajib diunggah.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan PNG, JPG, WebP, atau SVG.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file melebihi batas maksimal 5MB.' },
        { status: 400 }
      )
    }

    const ext = file.name.split('.').pop() || 'png'
    const fileName = `${assetType.toUpperCase()}_${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    let publicUrl = ''

    // 1. Try Google Drive first
    try {
      const brandingFolderId = await getOrCreateFolder('00_Branding_Assets')
      const driveFile = await uploadFileToDrive({
        name: fileName,
        mimeType: file.type,
        buffer,
        folderId: brandingFolderId,
      })

      if (driveFile?.id) {
        publicUrl = `/api/drive/public-preview/${driveFile.id}`
      }
    } catch (driveErr) {
      console.warn('[upload-asset] Google Drive upload failed, trying Supabase Storage fallback:', driveErr)
    }

    // 2. Fallback to Supabase Storage if Google Drive not available
    if (!publicUrl) {
      try {
        const supabase = await createServiceClient()
        // Ensure bucket exists or upload to documents
        const { data: uploadData, error: storageErr } = await supabase.storage
          .from('documents')
          .upload(`branding/${fileName}`, buffer, {
            contentType: file.type,
            upsert: true,
          })

        if (!storageErr && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('documents')
            .getPublicUrl(`branding/${fileName}`)
          publicUrl = publicUrlData.publicUrl
        }
      } catch (storageErr) {
        console.warn('[upload-asset] Supabase storage fallback failed:', storageErr)
      }
    }

    // 3. Fallback to base64 Data URL if both cloud storages fail
    if (!publicUrl) {
      const base64 = buffer.toString('base64')
      publicUrl = `data:${file.type};base64,${base64}`
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    })
  } catch (err) {
    console.error('[upload-asset] Error:', err)
    return NextResponse.json(
      { error: 'Gagal mengunggah gambar branding.' },
      { status: 500 }
    )
  }
}
