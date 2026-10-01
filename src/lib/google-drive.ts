import { google } from 'googleapis'

// Initialize Google Drive client (server-side only)
function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  return google.drive({ version: 'v3', auth })
}

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!
const SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID

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
  const drive = getDriveClient()
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

  if (SHARED_DRIVE_ID) {
    params.supportsAllDrives = true
  }

  const folder = await drive.files.create(params)
  return folder.data.id!
}

export async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  const drive = getDriveClient()

  // Search for existing folder
  const query = `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`

  const params: {
    q: string
    fields: string
    supportsAllDrives?: boolean
    includeItemsFromAllDrives?: boolean
  } = {
    q: query,
    fields: 'files(id, name)',
  }

  if (SHARED_DRIVE_ID) {
    params.supportsAllDrives = true
    params.includeItemsFromAllDrives = true
  }

  const response = await drive.files.list(params)

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!
  }

  // Create if not exists
  return createFolder({ name, parentId })
}

// ============================================================
// Create folder structure for a registration group
// ============================================================

export async function createGroupFolderStructure(
  registrationCode: string,
  type: 'individual' | 'family',
  memberNames: string[]
): Promise<{ groupFolderId: string; memberFolderIds: Record<string, string> }> {
  // Get or create Pendaftaran folder
  const pendaftaranFolderId = await getOrCreateFolder('01_Pendaftaran', ROOT_FOLDER_ID)
  
  // Get or create Jamaah folder
  const jamaahRootFolderId = await getOrCreateFolder('02_Jamaah', ROOT_FOLDER_ID)

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

  void pendaftaranFolderId // suppress unused warning

  return { groupFolderId, memberFolderIds }
}

// ============================================================
// Upload file
// ============================================================

export async function uploadFileToDrive(options: UploadFileOptions): Promise<DriveFileMetadata> {
  const drive = getDriveClient()
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

  if (SHARED_DRIVE_ID) {
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
  const drive = getDriveClient()
  const archiveFolderId = await getOrCreateFolder('99_Arsip', ROOT_FOLDER_ID)

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

  if (SHARED_DRIVE_ID) {
    params.supportsAllDrives = true
  }

  // Get current parents
  const fileParamsGet: { fileId: string; fields: string; supportsAllDrives?: boolean } = {
    fileId,
    fields: 'parents',
  }
  if (SHARED_DRIVE_ID) fileParamsGet.supportsAllDrives = true

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
  return getOrCreateFolder('03_Pembayaran', ROOT_FOLDER_ID)
}
