import { google } from 'googleapis'
import { Readable } from 'stream'
import { createServiceClient } from '@/lib/supabase/server'

export interface GoogleDriveConfig {
  // OAuth2 (Recommended - bypasses Service Account personal drive quota limits)
  client_id?: string
  client_secret?: string
  refresh_token?: string

  // Service Account (Fallback)
  client_email?: string
  private_key?: string

  // Folder configuration
  root_folder_id: string
  shared_drive_id?: string | null
  auth_type?: 'oauth2' | 'service_account'
}

// Fetch configuration from Database first, fallback to process.env
export async function getDriveConfig(): Promise<GoogleDriveConfig> {
  let dbVal: Record<string, string | null | undefined> | undefined

  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'google_drive')
      .maybeSingle()

    dbVal = data?.value as Record<string, string | null | undefined> | undefined
  } catch (err) {
    console.warn('[google-drive] Gagal mengambil konfigurasi dari database, menggunakan fallback .env:', err)
  }

  // 1. Check OAuth2 first (from DB or env)
  const clientId = dbVal?.client_id || dbVal?.clientId || process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = dbVal?.client_secret || dbVal?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || ''
  const refreshToken = dbVal?.refresh_token || dbVal?.refreshToken || process.env.GOOGLE_REFRESH_TOKEN || ''

  // 2. Check Service Account (from DB or env)
  const clientEmail = dbVal?.client_email || dbVal?.clientEmail || process.env.GOOGLE_DRIVE_CLIENT_EMAIL || ''
  const privateKey = dbVal?.private_key || dbVal?.privateKey || process.env.GOOGLE_DRIVE_PRIVATE_KEY || ''

  // 3. Root folder & shared drive ID
  const rootFolderId =
    dbVal?.root_folder_id ||
    dbVal?.rootFolderId ||
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
    '1SYppeQgDeGY-nUHyOf4meuRdlECx5wKQ'

  const sharedDriveId =
    dbVal?.shared_drive_id ||
    dbVal?.sharedDriveId ||
    process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID ||
    null

  const hasOAuth2 = Boolean(clientId && clientSecret && refreshToken)
  const hasServiceAccount = Boolean(clientEmail && privateKey)

  return {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    client_email: clientEmail,
    private_key: privateKey,
    root_folder_id: rootFolderId,
    shared_drive_id: sharedDriveId,
    auth_type: hasOAuth2 ? 'oauth2' : hasServiceAccount ? 'service_account' : undefined,
  }
}

// Get Google Auth Client
function createAuth(config: GoogleDriveConfig) {
  // If OAuth2 credentials are provided, use them (bypasses Service Account quota limits)
  if (config.client_id && config.client_secret && config.refresh_token) {
    const oauth2Client = new google.auth.OAuth2(
      config.client_id,
      config.client_secret,
      'https://developers.google.com/oauthplayground'
    )
    oauth2Client.setCredentials({
      refresh_token: config.refresh_token,
    })
    return oauth2Client
  }

  // Fallback to Service Account
  if (config.client_email && config.private_key) {
    let key = config.private_key.trim()
    if (key.startsWith('"') && key.endsWith('"')) {
      key = key.substring(1, key.length - 1)
    }
    key = key.replace(/\\n/g, '\n')

    return new google.auth.GoogleAuth({
      credentials: {
        client_email: config.client_email.trim(),
        private_key: key,
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    })
  }

  throw new Error(
    'Google Drive API belum dikonfigurasi. Lengkapi OAuth2 atau Service Account di Admin > Pengaturan.'
  )
}

// Initialize Google Drive client with dynamic config
export async function getDriveClient(customConfig?: GoogleDriveConfig) {
  const config = customConfig || (await getDriveConfig())
  const auth = createAuth(config)

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
  const { drive } = await getDriveClient()
  const { name, parentId } = options

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  })

  return folder.data.id!
}

export async function getOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const { drive, config } = await getDriveClient()
  const targetParentId = parentId || config.root_folder_id

  if (!targetParentId) {
    throw new Error('Root Folder ID Google Drive belum ditentukan.')
  }

  // Search for existing folder
  const query = `name='${name.replace(/'/g, "\\'")}' and '${targetParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

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
  const groupFolderId = await getOrCreateFolder(registrationCode, jamaahRootFolderId)

  const memberFolderIds: Record<string, string> = {}

  if (type === 'individual' && memberNames.length > 0) {
    // Individual: create document subfolders directly
    for (const subFolder of ['01_KTP', '02_KK', '03_VAKSIN', '04_PASPOR', '05_BUKTI_BAYAR']) {
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
      for (const subFolder of ['01_KTP', '02_KK', '03_VAKSIN', '04_PASPOR', '05_BUKTI_BAYAR']) {
        await getOrCreateFolder(subFolder, memberFolderId)
      }
    }
  }

  return { groupFolderId, memberFolderIds }
}

// ============================================================
// Upload file to Google Drive
// ============================================================

export async function uploadFileToDrive(options: UploadFileOptions): Promise<DriveFileMetadata> {
  const { drive } = await getDriveClient()
  const { name, mimeType, buffer, folderId } = options

  const readable = new Readable()
  readable.push(buffer)
  readable.push(null)

  const file = await drive.files.create({
    requestBody: {
      name,
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType,
      body: readable,
    },
    fields: 'id, name, mimeType, size, webViewLink, parents',
    supportsAllDrives: true,
  })

  if (!file.data.id) {
    throw new Error('Google Drive upload failed: no file ID returned')
  }

  // Attempt to set public read permission so links work everywhere
  try {
    await drive.permissions.create({
      fileId: file.data.id,
      supportsAllDrives: true,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })
  } catch (permErr) {
    console.warn('[uploadFileToDrive] Permission setting note:', permErr)
  }

  return {
    id: file.data.id,
    name: file.data.name || name,
    mimeType: file.data.mimeType || mimeType,
    size: Number(file.data.size) || buffer.length,
    webViewLink: file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}/view`,
    parents: file.data.parents || (folderId ? [folderId] : []),
  }
}

// ============================================================
// Stream a file from Google Drive (for direct preview without 403)
// ============================================================

export async function streamFromDrive(fileId: string): Promise<{
  stream: NodeJS.ReadableStream
  mimeType: string
  filename: string
}> {
  const { drive } = await getDriveClient()

  // Get file metadata
  const meta = await drive.files.get({
    fileId,
    supportsAllDrives: true,
    fields: 'mimeType, name',
  })

  const mimeType = meta.data.mimeType || 'application/octet-stream'
  const filename = meta.data.name || 'file'

  // Download file stream
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  )

  return {
    stream: response.data as unknown as NodeJS.ReadableStream,
    mimeType,
    filename,
  }
}

// ============================================================
// Delete a file from Google Drive
// ============================================================

export async function deleteFromDrive(fileId: string): Promise<void> {
  const { drive } = await getDriveClient()
  await drive.files.delete({ fileId, supportsAllDrives: true })
}

// ============================================================
// Archive file (move to 99_Arsip)
// ============================================================

export async function archiveFile(fileId: string): Promise<void> {
  const { drive, config } = await getDriveClient()
  const archiveFolderId = await getOrCreateFolder('99_Arsip', config.root_folder_id)

  // Get current parents
  const file = await drive.files.get({
    fileId,
    fields: 'parents',
    supportsAllDrives: true,
  })

  await drive.files.update({
    fileId,
    addParents: archiveFolderId,
    removeParents: file.data.parents?.join(','),
    fields: 'id, parents',
    supportsAllDrives: true,
  })
}

// ============================================================
// Payment proof folder
// ============================================================

export async function getPaymentFolderId(): Promise<string> {
  const { config } = await getDriveClient()
  return getOrCreateFolder('03_Pembayaran', config.root_folder_id)
}
