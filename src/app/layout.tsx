import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Portal Pendaftaran Umrah 100 Tahun Gontor',
    template: '%s | Umrah 100 Tahun Gontor',
  },
  description:
    'Portal pendaftaran resmi jamaah Umrah 100 Tahun Gontor. Daftar secara individu atau bersama keluarga.',
  keywords: ['umrah', 'gontor', '100 tahun', 'pendaftaran', 'jamaah'],
  openGraph: {
    title: 'Portal Pendaftaran Umrah 100 Tahun Gontor',
    description: 'Portal pendaftaran resmi jamaah Umrah 100 Tahun Gontor.',
    locale: 'id_ID',
    type: 'website',
  },
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
