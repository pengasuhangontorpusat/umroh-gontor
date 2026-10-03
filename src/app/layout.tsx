import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

import { createServiceClient } from '@/lib/supabase/server'

export async function generateMetadata(): Promise<Metadata> {
  let siteTitle = 'Portal Pendaftaran Umrah 100 Tahun Gontor'
  let siteSubtitle =
    'Daftarkan diri Anda atau keluarga untuk program umrah dalam rangka peringatan 100 tahun Pondok Modern Darussalam Gontor. Proses pendaftaran dirancang sesederhana mungkin.'
  let bannerUrl = ''
  let logoUrl = ''

  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'general_parameters')
      .maybeSingle()

    if (data?.value && typeof data.value === 'object') {
      const p = data.value as Record<string, unknown>
      if (p.siteTitle) siteTitle = String(p.siteTitle).trim()
      if (p.siteSubtitle) siteSubtitle = String(p.siteSubtitle).trim()
      if (p.bannerUrl) bannerUrl = String(p.bannerUrl).trim()
      if (p.logoUrl) logoUrl = String(p.logoUrl).trim()
    }
  } catch (err) {
    console.warn('[layout/generateMetadata] Error fetching settings:', err)
  }

  // Base URL for social share previews (WhatsApp, Facebook, Twitter, etc.)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://umroh-gontor.vercel.app'

  let ogImage = bannerUrl || logoUrl || `${baseUrl}/og-image.jpg`
  if (ogImage.startsWith('/')) {
    ogImage = `${baseUrl}${ogImage}`
  }

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: siteTitle,
      template: `%s | ${siteTitle}`,
    },
    description: siteSubtitle,
    keywords: ['umrah', 'gontor', '100 tahun', 'pendaftaran', 'jamaah'],
    openGraph: {
      title: siteTitle,
      description: siteSubtitle,
      url: baseUrl,
      siteName: siteTitle,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: siteTitle,
        },
      ],
      locale: 'id_ID',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: siteTitle,
      description: siteSubtitle,
      images: [ogImage],
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
