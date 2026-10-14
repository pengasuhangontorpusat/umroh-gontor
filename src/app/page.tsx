import type { Metadata } from 'next'
import Link from 'next/link'
import {
  MapPin,
  FileText,
  CreditCard,
  CheckCircle,
  ChevronRight,
  Phone,
  Mail,
  AlertCircle,
  Clock,
  Layers,
  Search,
  FileUp,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Users,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getDeparturePoints() {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('departure_points')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    return data ?? []
  } catch (err) {
    console.error('[HomePage/getDeparturePoints]', err)
    return []
  }
}

async function getActivePackages() {
  try {
    const supabase = await createServiceClient()
    const [pkgRes, benefitsRes] = await Promise.all([
      supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true }),
      supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'package_benefits')
        .maybeSingle(),
    ])

    const benefitsMap: Record<string, string[]> =
      (benefitsRes.data?.value as Record<string, string[]>) || {}

    return (pkgRes.data ?? []).map((pkg) => {
      const customBenefits = benefitsMap[pkg.id]
      const upper = (pkg.name || '').toUpperCase()
      const roomTag = upper.includes('DOUBLE') || upper.includes('BERDUA')
        ? 'Kamar Double (2 Orang)'
        : upper.includes('TRIPLE') || upper.includes('BERTIGA')
        ? 'Kamar Triple (3 Orang)'
        : 'Kamar Quad (4 Orang)'

      const defaultBenefits = [
        `Akomodasi Hotel Makkah & Madinah (${roomTag})`,
        'Tiket Pesawat PP Internasional',
        'Visa Umrah & Asuransi Perjalanan',
        'Muthawwif & Bus AC Eksekutif',
        'Perlengkapan Umrah Resmi Panitia',
      ]

      return {
        ...pkg,
        benefits: Array.isArray(customBenefits) && customBenefits.length > 0
          ? customBenefits
          : defaultBenefits,
      }
    })
  } catch (err) {
    console.error('[HomePage/getActivePackages]', err)
    return []
  }
}

async function getGeneralSettings() {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'general_parameters')
      .maybeSingle()
    return (data?.value as Record<string, unknown> | undefined) || {}
  } catch (err) {
    console.error('[HomePage/getGeneralSettings]', err)
    return {}
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const generalSettings = await getGeneralSettings()
  const siteTitle =
    (generalSettings.siteTitle as string) ||
    process.env.NEXT_PUBLIC_APP_NAME ||
    'Portal Pendaftaran Umrah Gontor'
  const siteSubtitle =
    (generalSettings.siteSubtitle as string) ||
    'Daftarkan diri Anda atau keluarga untuk program umrah resmi Pondok Modern Darussalam Gontor. Proses pendaftaran dirancang sesederhana mungkin.'
  const bannerUrl = (generalSettings.bannerUrl as string) || ''
  const logoUrl = (generalSettings.logoUrl as string) || ''
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://umroh-gontor.vercel.app'
  let ogImage = bannerUrl || logoUrl || `${baseUrl}/og-image.jpg`
  if (ogImage.startsWith('/')) {
    ogImage = `${baseUrl}${ogImage}`
  }

  return {
    title: siteTitle,
    description: siteSubtitle,
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

export default async function HomePage() {
  const [departurePoints, activePackages, generalSettings] = await Promise.all([
    getDeparturePoints(),
    getActivePackages(),
    getGeneralSettings(),
  ])

  // System & Registration parameters
  const isRegistrationOpen = generalSettings.registrationOpen !== false
  const hasActivePackages = activePackages.length > 0
  const isAvailable = isRegistrationOpen && hasActivePackages

  // Branding & Text Content
  const siteTitle =
    (generalSettings.siteTitle as string) ||
    process.env.NEXT_PUBLIC_APP_NAME ||
    'Portal Pendaftaran Umrah Gontor'
  const siteSubtitle =
    (generalSettings.siteSubtitle as string) ||
    'Daftarkan diri Anda atau keluarga untuk program umrah resmi Pondok Modern Darussalam Gontor. Proses pendaftaran dirancang sesederhana mungkin.'
  const heroBadge = (generalSettings.heroBadge as string) || 'Pendaftaran Resmi'
  const brandLogoText = (generalSettings.brandLogoText as string) || 'G'
  const logoUrl = (generalSettings.logoUrl as string) || ''

  // Footer & Organization
  const footerTitle = (generalSettings.footerTitle as string) || 'Panitia Umrah Gontor'
  const footerSubtitle = (generalSettings.footerSubtitle as string) || 'Pondok Modern Darussalam Gontor'
  const footerCopyright = (generalSettings.footerCopyright as string) || `© ${new Date().getFullYear()}`

  // Contact
  const rawWa = (generalSettings.helpdeskWhatsapp as string) || '081234567890'
  const digitsOnly = rawWa.replace(/\D/g, '')
  const cleanWa = digitsOnly.startsWith('0')
    ? '62' + digitsOnly.slice(1)
    : digitsOnly.startsWith('62')
    ? digitsOnly
    : '62' + digitsOnly
  const contactEmail = (generalSettings.contactEmail as string) || 'umrah@gontor.ac.id'

  // Document Requirements (Flexible from Settings)
  interface DocReqItem {
    id: string
    name: string
    description: string
    icon: string
    isRequired: boolean
    isActive: boolean
    targetAudience?: 'all' | 'wni' | 'wna'
  }

  const configuredDocs = (
    Array.isArray(generalSettings.documentRequirements) && generalSettings.documentRequirements.length > 0
      ? generalSettings.documentRequirements
      : [
          {
            id: 'ktp',
            name: 'KTP (Kartu Tanda Penduduk)',
            description: 'Wajib untuk WNI usia 17 tahun ke atas',
            icon: '📄',
            isRequired: true,
            isActive: true,
            targetAudience: 'wni',
          },
          {
            id: 'kk',
            name: 'Kartu Keluarga',
            description: 'Untuk semua anggota rombongan/keluarga',
            icon: '📋',
            isRequired: true,
            isActive: true,
            targetAudience: 'wni',
          },
          {
            id: 'vaksin',
            name: 'Kartu Vaksin Meningitis & Polio',
            description: 'Dapat dikoordinasikan dengan panitia',
            icon: '💉',
            isRequired: false,
            isActive: true,
            targetAudience: 'all',
          },
          {
            id: 'paspor',
            name: 'Paspor',
            description: 'Wajib untuk WNA & pelengkap perjalanan internasional',
            icon: '📘',
            isRequired: false,
            isActive: true,
            targetAudience: 'all',
          },
        ]
  ) as DocReqItem[]

  const activeDocs = configuredDocs.filter((d) => d.isActive !== false)

  const REGISTRATION_STEPS = [
    { step: '01', label: 'Pilih Jenis', desc: 'Individu atau bersama keluarga' },
    { step: '02', label: 'Data Diri', desc: 'Isi informasi pribadi setiap jamaah' },
    { step: '03', label: 'Dokumen', desc: 'Unggah berkas persyaratan' },
    { step: '04', label: 'Pembayaran', desc: 'Bayar penuh atau DP' },
    { step: '05', label: 'Konfirmasi', desc: 'Tinjau dan kirim pendaftaran' },
  ]

  const FAQ = [
    {
      q: 'Apakah bisa mendaftar tanpa paspor?',
      a: 'Ya. Pilih opsi "Belum memiliki paspor" saat pengisian data. Paspor dapat dilengkapi setelah pendaftaran.',
    },
    {
      q: 'Apakah anak di bawah 17 tahun wajib menyertakan KTP?',
      a: 'Tidak. KTP hanya diwajibkan untuk jamaah berusia 17 tahun ke atas.',
    },
    {
      q: 'Bagaimana cara mendaftarkan seluruh keluarga?',
      a: 'Pilih "Saya mendaftarkan keluarga" saat mulai pendaftaran, lalu tambahkan setiap anggota satu per satu.',
    },
    {
      q: 'Apakah pembayaran DP memastikan tempat?',
      a: 'Pembayaran DP menunjukkan komitmen pendaftaran. Konfirmasi resmi dilakukan setelah verifikasi data oleh panitia.',
    },
    {
      q: 'Apakah dokumen bisa diunggah belakangan?',
      a: 'Ya. Pendaftaran dapat dikirim terlebih dahulu dan dokumen dilengkapi kemudian sebelum verifikasi panitia.',
    },
    {
      q: 'Bagaimana cara memantau status atau melengkapi berkas setelah mendaftar?',
      a: 'Gunakan fitur "Cek Status Pendaftaran" di halaman ini. Cukup masukkan Kode Pendaftaran Anda untuk memantau proses verifikasi berkas, mengunggah bukti pembayaran, ataupun melengkapi berkas susulan (seperti paspor atau vaksin) tanpa perlu mendaftar ulang.',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* ============================================================
          Header
          ============================================================ */}
      <header className="border-b border-[var(--border)] bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={siteTitle}
                className="w-7 h-7 rounded object-contain bg-white shadow-2xs"
              />
            ) : (
              <div className="w-7 h-7 rounded bg-[var(--primary)] flex items-center justify-center">
                <span className="text-white text-xs font-bold">{brandLogoText}</span>
              </div>
            )}
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {siteTitle}
            </span>
          </div>
          {isAvailable ? (
            <Link href="/daftar">
              <Button size="sm">Mulai Pendaftaran</Button>
            </Link>
          ) : (
            <Link href="/status">
              <Button variant="outline" size="sm">Cek Status</Button>
            </Link>
          )}
        </div>
      </header>

      {/* ============================================================
          Hero
          ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 pb-12">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[var(--primary)] uppercase tracking-wider mb-3">
            {heroBadge}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] leading-snug mb-4">
            {siteTitle}
          </h1>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed mb-6 max-w-xl">
            {siteSubtitle}
          </p>

          {/* Registration Notice / Status */}
          {!isRegistrationOpen ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-8 flex items-start gap-3 text-amber-900">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-amber-950">Pendaftaran Periode Ini Sedang Ditutup</p>
                <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                  {(generalSettings.notes as string) ||
                    'Alhamdulillah rentetan pelaksanaan umrah telah selesai dan sistem sedang dalam persiapan untuk musim umrah berikutnya.'}
                </p>
              </div>
            </div>
          ) : !hasActivePackages ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-8 flex items-start gap-3 text-amber-900">
              <Layers className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-amber-950">Pilihan Paket Sedang Disiapkan</p>
                <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                  Pilihan paket kamar, biaya, dan akomodasi untuk periode ini sedang dalam tahap penyesuaian oleh Panitia. Pendaftaran akan dibuka segera setelah paket resmi diaktifkan.
                </p>
              </div>
            </div>
          ) : (
            /* Active Packages Info */
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activePackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="border border-emerald-200 bg-emerald-50/40 rounded-[var(--radius-md)] p-3.5 space-y-1"
                  >
                    <p className="text-xs font-semibold text-emerald-900 line-clamp-1">{pkg.name}</p>
                    <p className="text-base font-bold text-[var(--text-primary)]">
                      Rp{Number(pkg.price).toLocaleString('id-ID')}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      DP Rp{Number(pkg.dp_amount).toLocaleString('id-ID')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {isAvailable ? (
              <Link href="/daftar">
                <Button size="lg">
                  Mulai Pendaftaran
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/daftar">
                <Button variant="secondary" size="lg">
                  Informasi Pendaftaran
                </Button>
              </Link>
            )}
            <Link href="/status">
              <Button variant="outline" size="lg">
                Cek Status Pendaftaran
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* ============================================================
          Pilihan Paket Umrah & Tipe Kamar
          ============================================================ */}
      <section id="paket" className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2 border border-emerald-200">
              <Layers className="w-3.5 h-3.5 text-emerald-700" />
              Paket Resmi Terbuka
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Pilihan Paket Umrah & Tipe Kamar
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xl">
              Pilih tipe akomodasi kamar yang sesuai dengan preferensi kenyamanan ibadah Anda dan keluarga.
            </p>
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {activePackages.length} Paket Tersedia
          </div>
        </div>

        {activePackages.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-[var(--border)] rounded-[var(--radius-lg)] text-center text-sm text-[var(--text-secondary)]">
            <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Pilihan Paket Sedang Disiapkan</p>
            <p className="text-xs text-slate-500 mt-1">
              Rincian biaya paket kamar sedang dalam tahap penyesuaian oleh Panitia.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {activePackages.map((pkg) => {
              const upper = pkg.name.toUpperCase()
              const isDouble = upper.includes('DOUBLE') || upper.includes('BERDUA')
              const isTriple = upper.includes('TRIPLE') || upper.includes('BERTIGA')
              const roomBadge = isDouble
                ? 'Kamar Double (Berdua)'
                : isTriple
                ? 'Kamar Triple (Bertiga)'
                : 'Kamar Quad (Berempat)'

              return (
                <div
                  key={pkg.id}
                  className="flex flex-col justify-between border-2 border-emerald-100 hover:border-emerald-500/70 bg-gradient-to-b from-white to-emerald-50/20 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group"
                >
                  <div className="space-y-4">
                    {/* Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        {roomBadge}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-100">
                        Tersedia
                      </span>
                    </div>

                    {/* Name */}
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-emerald-800 transition-colors line-clamp-2">
                        {pkg.name}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Biaya resmi per jamaah termasuk bimbingan & akomodasi
                      </p>
                    </div>

                    {/* Price & DP */}
                    <div className="p-3.5 bg-white rounded-xl border border-emerald-100/80 shadow-2xs space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          Rp{Number(pkg.price).toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs font-medium text-slate-500">/ jamaah</span>
                      </div>
                      <p className="text-xs font-semibold text-emerald-800">
                        Uang Muka (DP): Rp{Number(pkg.dp_amount).toLocaleString('id-ID')}
                      </p>
                    </div>

                    {/* Inclusions */}
                    <div className="space-y-2 pt-1 border-t border-slate-100 text-xs text-slate-600">
                      {(pkg.benefits && pkg.benefits.length > 0 ? pkg.benefits : [
                        'Akomodasi Hotel Makkah & Madinah',
                        'Tiket Pesawat PP Internasional',
                        'Visa Umrah & Asuransi Perjalanan',
                        'Muthawwif & Bus AC Eksekutif',
                        'Perlengkapan Umrah Resmi Panitia',
                      ]).map((benefit: string, bIdx: number) => (
                        <div key={bIdx} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="pt-5 mt-4 border-t border-slate-100">
                    {isAvailable ? (
                      <Link href={`/daftar?package=${pkg.id}`} className="block">
                        <Button className="w-full justify-center group-hover:bg-emerald-700 shadow-2xs">
                          Pilih Paket Ini
                          <ChevronRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/daftar" className="block">
                        <Button variant="outline" className="w-full justify-center">
                          Lihat Syarat Pendaftaran
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* ============================================================
          Keberangkatan
          ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5">
          Titik Keberangkatan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {departurePoints.map((point) => (
            <div
              key={point.id}
              className="flex items-center gap-3 border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-3"
            >
              <MapPin className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{point.name}</p>
                {point.description && (
                  <p className="text-xs text-[var(--text-muted)]">{point.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-[var(--border)]" />

      {/* ============================================================
          Dokumen Persyaratan
          ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-start gap-2 mb-5">
          <FileText className="w-4 h-4 text-[var(--primary)] mt-0.5 flex-shrink-0" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Dokumen yang Diperlukan ({activeDocs.length} Berkas)
          </h2>
        </div>

        {activeDocs.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-[var(--border)] rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)]">
            Daftar persyaratan berkas sedang disiapkan dan disesuaikan oleh Panitia.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeDocs.map((doc) => (
              <div
                key={doc.id || doc.name}
                className="flex items-start gap-3 border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-3 bg-white"
              >
                <span className="text-lg shrink-0">{doc.icon || '📄'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{doc.name}</p>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        doc.isRequired
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {doc.isRequired ? 'Wajib' : 'Opsional / Menyusul'}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        doc.targetAudience === 'wna'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : doc.targetAudience === 'wni'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}
                    >
                      {doc.targetAudience === 'wna' ? 'Khusus WNA' : doc.targetAudience === 'wni' ? 'Khusus WNI' : 'WNI & WNA'}
                    </span>
                  </div>
                  {doc.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      {doc.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-[var(--warning-light)] rounded-[var(--radius-md)] border border-amber-200">
          <p className="text-sm text-[var(--warning-foreground)]">
            <span className="font-medium">Catatan kelengkapan berkas:</span> Berkas yang belum siap (seperti paspor atau vaksin) dapat dilengkapi menyusul melalui menu <strong>Cek Status Pendaftaran</strong> setelah formulir terkirim.
          </p>
        </div>
      </section>

      <div className="border-t border-[var(--border)]" />

      {/* ============================================================
          Alur Pendaftaran
          ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5">
          Alur Pendaftaran
        </h2>
        <div className="relative">
          {/* Line */}
          <div className="hidden sm:block absolute top-5 left-5 right-5 h-px bg-[var(--border)] z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
            {REGISTRATION_STEPS.map((s) => (
              <div key={s.step} className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2">
                <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] bg-white flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">{s.step}</span>
                </div>
                <div className="sm:text-center">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{s.label}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* ============================================================
          Penjelasan & Manfaat Cek Status Pendaftaran
          ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-gradient-to-br from-emerald-50/60 via-white to-slate-50/80 border border-emerald-100 rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-3 border border-emerald-200/60">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                Layanan Mandiri Jamaah
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                Apa Fungsi Fitur &ldquo;Cek Status Pendaftaran&rdquo;?
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                Setelah formulir pendaftaran terkirim, Anda tidak perlu cemas atau bolak-balik bertanya manual ke panitia. Melalui menu <strong>Cek Status</strong>, Anda memegang kendali penuh atas proses pendaftaran secara mandiri, transparan, dan terstruktur.
              </p>
            </div>
            <div className="shrink-0">
              <Link href="/status">
                <Button size="lg" className="w-full sm:w-auto shadow-xs">
                  <Search className="w-4 h-4 mr-2" />
                  Buka Cek Status
                </Button>
              </Link>
            </div>
          </div>

          {/* 4 Kartu Manfaat Utama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl border border-[var(--border)] shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 border border-emerald-100">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1.5">
                  1. Pantau Progres Real-Time
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Ketahui posisi berkas Anda secara transparan: verifikasi dokumen, validasi pembayaran, hingga penerbitan manifest keberangkatan.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 mt-4 pt-2.5 border-t border-slate-100 block">
                Transparan 24 Jam
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[var(--border)] shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3 border border-blue-100">
                  <FileUp className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1.5">
                  2. Upload Berkas Susulan
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Paspor atau kartu vaksin belum selesai saat mendaftar? Cukup unggah susulan langsung di halaman ini tanpa perlu mendaftar ulang.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-blue-700 mt-4 pt-2.5 border-t border-slate-100 block">
                Tanpa Daftar Ulang
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[var(--border)] shadow-xs flex flex-col justify-between hover:border-amber-300 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-3 border border-amber-100">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1.5">
                  3. Unggah Bukti Bayar
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Kirim slip transfer DP atau pelunasan dengan mudah agar segera divalidasi dan dicatat oleh bendahara panitia umrah.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-amber-700 mt-4 pt-2.5 border-t border-slate-100 block">
                Verifikasi Pembayaran
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[var(--border)] shadow-xs flex flex-col justify-between hover:border-purple-300 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-3 border border-purple-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1.5">
                  4. Aman & Terproteksi
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Data jamaah dan keluarga terlindungi dengan enkripsi keamanan perangkat dan verifikasi nomor HP PIC penanggung jawab.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-purple-700 mt-4 pt-2.5 border-t border-slate-100 block">
                Privasi Terjamin Aman
              </span>
            </div>
          </div>

          {/* Panduan 3 Langkah Mudah */}
          <div className="bg-white/90 border border-emerald-200/90 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 w-full md:w-auto">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  Cara Mudah Memeriksa Status Pendaftaran Anda:
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                  1. Masuk menu Cek Status &rarr; 2. Masukkan <strong>Kode Pendaftaran</strong> Anda (contoh: <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-mono font-medium border border-slate-200">UMR-2026-G0001</code>) &rarr; 3. Detail seluruh jamaah langsung terbuka!
                </p>
              </div>
            </div>
            <Link href="/status" className="shrink-0 w-full sm:w-auto">
              <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2.5 rounded-lg transition-colors w-full sm:w-auto">
                Cek Status Sekarang
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <div className="border-t border-[var(--border)]" />

      {/* ============================================================
          FAQ
          ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5">
          Pertanyaan Umum
        </h2>
        <div className="space-y-3 max-w-2xl">
          {FAQ.map((item) => (
            <details key={item.q} className="group border border-[var(--border)] rounded-[var(--radius-md)]">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none">
                <span className="text-sm font-medium text-[var(--text-primary)] pr-4">{item.q}</span>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-4 pb-3 pt-0">
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <div className="border-t border-[var(--border)]" />

      {/* ============================================================
          Contact
          ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
          Kontak Panitia
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          {rawWa && (
            <a
              href={`https://wa.me/${cleanWa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
            >
              <Phone className="w-4 h-4" />
              WhatsApp Panitia ({rawWa})
            </a>
          )}
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
            >
              <Mail className="w-4 h-4" />
              {contactEmail}
            </a>
          )}
        </div>
      </section>

      {/* ============================================================
          Footer
          ============================================================ */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {footerTitle}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {footerSubtitle}
            </p>
          </div>
          <p className="text-xs text-[var(--text-muted)]">{footerCopyright}</p>
        </div>
      </footer>
    </div>
  )
}
