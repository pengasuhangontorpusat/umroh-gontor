// Client-safe Drive URL utilities (no Node.js dependencies)
// This file is safe to import from both client and server components

export function buildDriveImageUrl(fileId: string): string {
  // If fileId is from Supabase storage fallback (starts with 'storage:'), return direct link or path
  if (fileId.startsWith('storage:')) {
    return fileId.replace(/^storage:/, '')
  }
  return `/api/drive/public-preview/${fileId}`
}

export function buildDrivePreviewUrl(fileId: string): string {
  if (fileId.startsWith('storage:')) {
    return fileId.replace(/^storage:/, '')
  }
  return `/api/drive/public-preview/${fileId}`
}
