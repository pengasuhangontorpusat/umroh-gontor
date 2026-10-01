import { google } from 'googleapis'
import { createServiceClient } from '@/lib/supabase/server'

export interface GoogleDriveConfig {
  client_email: string
  private_key: string
  root_folder_id: string
  shared_drive_id?: string | null
}

// Fetch configuration from Database first, fallback to process.env
export async function getDriveConfig(): Promise<GoogleDriveConfig> {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'google_drive')
      .maybeSingle()

    if (data?.value && data.value.client_email && data.value.private_key) {
      return {
        client_email: data.value.client_email,
        private_key: data.value.private_key,
        root_folder_id: data.value.root_folder_id || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '',
        shared_drive_id: data.value.shared_drive_id || process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || null,
      }
    }
  } catch (err) {
    console.warn('[google-drive] Gagal mengambil konfigurasi dari database, menggunakan fallback .env:', err)
  }

  return {
    client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || '',
    private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY || '',
    root_folder_id: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '',
    shared_drive_id: process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || null,
  }
}

// Initialize Google Drive client with dynamic config
export async function getDriveClient(customConfig?: GoogleDriveConfig) {
  const config = customConfig || (await getDriveConfig())

  if (!config.client_email || !config.private_key) {
    throw new Error(
      'Google Drive API belum dikonfigurasi. Silakan lengkapi pengaturan Google Drive di halaman Admin > Pengaturan.'
    )
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.client_email,
      private_key: config.private_key.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  return {
    drive: google.drive({ version: 'v3', auth }),
    config,
  }
}

interface CreateFolderOptions {
  name: string
  parentId: string
}

interface UploadFileOptions {
  name: string
  mimeType: string
  buffer: Buffer
  folderId: string
}

export interface DriveFileMetadata {
  id: string
  name: string
  mimeType: string
  size: number
  webViewLink: string
  parents: string[]
}

// ============================================================
// Folder operations
// ============================================================

export async function createFolder(options: CreateFolderOptions): Promise<string> {
  const { drive, config } = await getDriveClient()
  const { name, parentId } = options

  const folderMetadata: {
    name: string
    mimeType: string
    parents: string[]
    driveId?: string
  } = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  }

  const params: {
    requestBody: typeof folderMetadata
    fields: string
    supportsAllDrives?: boolean
    driveId?: string
  } = {
    requestBody: folderMetadata,
    fields: 'id',
  }

  if (config.shared_drive_id) {
    params.supportsAllDrives = true
  }

  const folder = await drive.files.create(params)
  return folder.data.id!
}

export async function getOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const { drive, config } = await getDriveClient()
  const targetParentId = parentId || config.root_folder_id

  if (!targetParentId) {
    throw new Error('Root Folder ID Google Drive belum ditentukan.')
  }

  // Search for existing folder
  const query = `name='${name}' and '${targetParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`

  const params: {
    q: string
    fields: string
    supportsAllDrives?: boolean
    includeItemsFromAllDrives?: boolean
  } = {
    q: query,
    fields: 'files(id, name)',
  }

  if (config.shared_drive_id) {
    params.supportsAllDrives = true
    params.includeItemsFromAllDrives = true
  }

  const response = await drive.files.list(params)

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!
  }

  // Create if not exists
  return createFolder({ name, parentId: targetParentId })
}

// ============================================================
// Create folder structure for a registration group
// ============================================================

export async function createGroupFolderStructure(
  registrationCode: string,
  type: 'individual' | 'family',
  memberNames: string[]
): Promise<{ groupFolderId: string; memberFolderIds: Record<string, string> }> {
  const { config } = await getDriveClient()
  const rootId = config.root_folder_id

  // Get or create Jamaah root folder
  const jamaahRootFolderId = await getOrCreateFolder('02_Jamaah', rootId)

  // Create group folder
  const groupFolderName = registrationCode
  const groupFolderId = await getOrCreateFolder(groupFolderName, jamaahRootFolderId)

  const memberFolderIds: Record<string, string> = {}

  if (type === 'individual' && memberNames.length > 0) {
    // Individual: create document subfolders directly
    for (const subFolder of ['01_KTP', '02_KK', '03_VAKSIN', '04_PASPOR']) {
      await getOrCreateFolder(subFolder, groupFolderId)
    }
    memberFolderIds[memberNames[0]] = groupFolderId
  } else {
    // Family: create subfolder per member
    for (let i = 0; i < memberNames.length; i++) {
      const memberFolderName = `${String(i + 1).padStart(2, '0')}_${memberNames[i].toUpperCase().replace(/\s+/g, '_')}`
      const memberFolderId = await getOrCreateFolder(memberFolderName, groupFolderId)
      memberFolderIds[memberNames[i]] = memberFolderId

      // Create document subfolders
      for (const subFolder of ['01_KTP', '02_KK', '03_VAKSIN', '04_PASPOR']) {
        await getOrCreateFolder(subFolder, memberFolderId)
      }
    }
  }

  return { groupFolderId, memberFolderIds }
}

// ============================================================
// Upload file
// ============================================================

export async function uploadFileToDrive(options: UploadFileOptions): Promise<DriveFileMetadata> {
  const { drive, config } = await getDriveClient()
  const { name, mimeType, buffer, folderId } = options

  const { Readable } = await import('stream')
  const stream = Readable.from(buffer)

  const params: {
    requestBody: { name: string; parents: string[] }
    media: { mimeType: string; body: typeof stream }
    fields: string
    supportsAllDrives?: boolean
  } = {
    requestBody: {
      name,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name, mimeType, size, webViewLink, parents',
  }

  if (config.shared_drive_id) {
    params.supportsAllDrives = true
  }

  const file = await drive.files.create(params)

  return {
    id: file.data.id!,
    name: file.data.name!,
    mimeType: file.data.mimeType!,
    size: Number(file.data.size) || 0,
    webViewLink: file.data.webViewLink!,
    parents: file.data.parents || [],
  }
}

// ============================================================
// Delete file (soft — move to archive)
// ============================================================

export async function archiveFile(fileId: string): Promise<void> {
  const { drive, config } = await getDriveClient()
  const archiveFolderId = await getOrCreateFolder('99_Arsip', config.root_folder_id)

  const params: {
    fileId: string
    addParents: string
    removeParents?: string
    fields: string
    supportsAllDrives?: boolean
  } = {
    fileId,
    addParents: archiveFolderId,
    fields: 'id, parents',
  }

  if (config.shared_drive_id) {
    params.supportsAllDrives = true
  }

  // Get current parents
  const fileParamsGet: { fileId: string; fields: string; supportsAllDrives?: boolean } = {
    fileId,
    fields: 'parents',
  }
  if (config.shared_drive_id) fileParamsGet.supportsAllDrives = true

  const file = await drive.files.get(fileParamsGet)
  if (file.data.parents) {
    params.removeParents = file.data.parents.join(',')
  }

  await drive.files.update(params)
}

// ============================================================
// Payment proof folder
// ============================================================

export async function getPaymentFolderId(): Promise<string> {
  const { config } = await getDriveClient()
  return getOrCreateFolder('03_Pembayaran', config.root_folder_id)
}
