import Link from 'next/link'
import { MapPin, FileText, CreditCard, CheckCircle, ChevronRight, Phone, Mail, AlertCircle, Clock, Layers } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/server'

async function getDeparturePoints() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('departure_points')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  return data ?? []
}

async function getActivePackages() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })
  return data ?? []
}

async function getGeneralSettings() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'general_parameters')
    .maybeSingle()
  return (data?.value as Record<string, unknown> | undefined) || {}
}

export default async function HomePage() {
  const [departurePoints, activePackages, generalSettings] = await Promise.all([
    getDeparturePoints(),
    getActivePackages(),
    getGeneralSettings(),
  ])

  const isRegistrationOpen = generalSettings.registrationOpen !== false
  const hasActivePackages = activePackages.length > 0
  const isAvailable = isRegistrationOpen && hasActivePackages

  const minPrice = hasActivePackages ? activePackages[0].price : null
  const minDp = hasActivePackages ? activePackages[0].dp_amount : null

  const REQUIRED_DOCS = [
    { icon: '📄', label: 'KTP', note: 'Wajib untuk jamaah usia 17 tahun ke atas' },
    { icon: '📋', label: 'Kartu Keluarga', note: 'Untuk semua anggota keluarga' },
    {
      icon: '💉',
      label: 'Kartu Vaksin Meningitis & Polio',
      note: 'Dapat dikoordinasikan dengan panitia',
    },
    { icon: '📘', label: 'Paspor', note: 'Jika belum memiliki, dapat ditandai dan dilengkapi kemudian' },
  ]

  const REGISTRATION_STEPS = [
    { step: '01', label: 'Pilih Jenis', desc: 'Individu atau bersama keluarga' },
    { step: '02', label: 'Data Diri', desc: 'Isi informasi pribadi setiap jamaah' },
    { step: '03', label: 'Dokumen', desc: 'Unggah KTP, KK, vaksin, dan paspor' },
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
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* ============================================================
          Header
          ============================================================ */}
      <header className="border-b border-[var(--border)] bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[var(--primary)] flex items-center justify-center">
              <span className="text-white text-xs font-bold">G</span>
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Umrah 100 Tahun Gontor
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
            Pendaftaran Resmi
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] leading-snug mb-4">
            Umrah 100 Tahun Gontor
          </h1>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed mb-6 max-w-xl">
            Daftarkan diri Anda atau keluarga untuk program umrah dalam rangka peringatan 100
            tahun Pondok Modern Darussalam Gontor. Proses pendaftaran dirancang sesederhana
            mungkin.
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
          Dokumen
          ============================================================ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-start gap-2 mb-5">
          <FileText className="w-4 h-4 text-[var(--primary)] mt-0.5 flex-shrink-0" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Dokumen yang Diperlukan
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REQUIRED_DOCS.map((doc) => (
            <div
              key={doc.label}
              className="flex items-start gap-3 border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-3"
            >
              <span className="text-base">{doc.icon}</span>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{doc.label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{doc.note}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-[var(--warning-light)] rounded-[var(--radius-md)] border border-amber-200">
          <p className="text-sm text-[var(--warning-foreground)]">
            <span className="font-medium">Catatan jamaah di bawah umur:</span> Jamaah yang belum
            berusia 17 tahun tidak diwajibkan menyertakan KTP. Kartu Keluarga sudah mencukupi
            sebagai dokumen identitas.
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
          <a
            href="https://wa.me/6281234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
          >
            <Phone className="w-4 h-4" />
            WhatsApp Panitia
          </a>
          <a
            href="mailto:umrah@gontor.ac.id"
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
          >
            <Mail className="w-4 h-4" />
            umrah@gontor.ac.id
          </a>
        </div>
      </section>

      {/* ============================================================
          Footer
          ============================================================ */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Panitia Umrah 100 Tahun Gontor
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Pondok Modern Darussalam Gontor
            </p>
          </div>
          <p className="text-xs text-[var(--text-muted)]">© 2026</p>
        </div>
      </footer>
    </div>
  )
}
