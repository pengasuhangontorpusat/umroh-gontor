import { NextRequest, NextResponse } from 'next/server'
import { streamFromDrive } from '@/lib/google-drive'
import { Readable } from 'stream'

export const maxDuration = 30

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params

  if (!fileId) {
    return NextResponse.json({ error: 'File ID tidak ditemukan' }, { status: 400 })
  }

  try {
    const { stream, mimeType, filename } = await streamFromDrive(fileId)

    // Convert Node Readable stream to Web ReadableStream
    const webStream = Readable.toWeb(stream as Readable) as ReadableStream

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        // Edge caching to reduce Google Drive API requests
        'Cache-Control': 'public, s-maxage=31536000, max-age=31536000, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error('[drive/public-preview]', err)
    return NextResponse.json({ error: 'File tidak ditemukan atau tidak dapat diakses' }, { status: 404 })
  }
}
