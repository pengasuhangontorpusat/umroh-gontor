'use client'

import { useRegistration } from '@/contexts/RegistrationContext'
import { ProgressSteps } from '@/components/ui/ProgressSteps'
import { Step1Type } from '@/components/registration/Step1Type'
import { Step2Pic } from '@/components/registration/Step2Pic'
import { Step3Members } from '@/components/registration/Step3Members'
import { Step4Documents } from '@/components/registration/Step4Documents'
import { Step5Payment } from '@/components/registration/Step5Payment'
import { Step6Review } from '@/components/registration/Step6Review'
import { Step7Success } from '@/components/registration/Step7Success'
import Link from 'next/link'
import { ChevronLeft, RotateCcw, AlertCircle, Clock, Search, Home, Layers, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

const STEPS = [
  { id: 1, label: 'Jenis' },
  { id: 2, label: 'Data' },
  { id: 3, label: 'Jamaah' },
  { id: 4, label: 'Dokumen' },
  { id: 5, label: 'Pembayaran' },
  { id: 6, label: 'Review' },
]

export default function DaftarPage() {
  const { draft, hasRestoredDraft, dismissRestoredNotice, clearDraftAndReset } = useRegistration()
  const { step } = draft

  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean | null>(null)
  const [closedNotes, setClosedNotes] = useState<string>('')
  const [activePackagesCount, setActivePackagesCount] = useState<number | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings/general').then((res) => res.json()).catch(() => ({})),
      fetch('/api/admin/settings/packages').then((res) => res.json()).catch(() => ({})),
    ])
      .then(([genData, pkgData]) => {
        if (genData?.parameters) {
          setIsRegistrationOpen(genData.parameters.registrationOpen ?? true)
          setClosedNotes(genData.parameters.notes || '')
        } else {
          setIsRegistrationOpen(true)
        }

        const activePkgs = (pkgData?.packages || []).filter((p: { is_active?: boolean }) => p.is_active !== false)
        setActivePackagesCount(activePkgs.length)
        setIsLoadingConfig(false)
      })
      .catch(() => {
        setIsRegistrationOpen(true)
        setActivePackagesCount(1)
        setIsLoadingConfig(false)
      })
  }, [])

  // Success page - no wizard chrome
  if (step === 7) {
    return <Step7Success />
  }

  // Loading state while checking system settings
  if (isLoadingConfig) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex flex-col justify-center items-center px-4 py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        <p className="text-xs text-[var(--text-muted)] mt-2">Memeriksa ketersediaan pendaftaran...</p>
      </div>
    )
  }

  // Registration closed notice (by admin setting)
  if (isRegistrationOpen === false) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-[var(--border)] rounded-2xl shadow-sm p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Pendaftaran Ditutup
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] pt-1">
              Pendaftaran Umrah Belum Dibuka
            </h1>
          </div>

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {closedNotes ||
              'Alhamdulillah rentetan pelaksanaan umrah periode ini telah selesai dan saat ini sistem sedang dalam persiapan untuk musim umrah berikutnya. Jadwal, paket, dan pembukaan pendaftaran baru akan diumumkan secara resmi oleh Pondok Modern Darussalam Gontor.'}
          </p>

          <div className="pt-4 border-t border-[var(--border)] flex flex-col gap-2">
            <Link
              href="/status"
              className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors shadow-xs"
            >
              <Search className="w-4 h-4" />
              Cek Status / Riwayat Pendaftaran
            </Link>

            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-lg border border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface)] transition-colors"
            >
              <Home className="w-4 h-4" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Notice when no packages are active in admin settings
  if (activePackagesCount === 0) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-[var(--border)] rounded-2xl shadow-sm p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Layers className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Paket Belum Tersedia
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] pt-1">
              Pilihan Paket Umrah Belum Tersedia
            </h1>
          </div>

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Saat ini belum ada paket kamar umrah yang diaktifkan oleh Panitia untuk periode ini. Formulir pendaftaran hanya dapat dibuka setelah pilihan paket kamar dirilis resmi oleh Panitia agar tidak terjadi kekeliruan pemilihan paket.
          </p>

          <div className="pt-4 border-t border-[var(--border)] flex flex-col gap-2">
            <Link
              href="/status"
              className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors shadow-xs"
            >
              <Search className="w-4 h-4" />
              Cek Status / Riwayat Pendaftaran
            </Link>

            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-lg border border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface)] transition-colors"
            >
              <Home className="w-4 h-4" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border)] sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali</span>
          </Link>
          <div className="flex-1">
            <ProgressSteps steps={STEPS} currentStep={Math.min(step, 6)} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Restored Draft Alert Banner */}
        {hasRestoredDraft && (
          <div className="mb-6 p-4 rounded-[var(--radius-lg)] bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-800">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  Draf Pendaftaran Sebelumnya Dipulihkan
                </p>
                <p className="text-xs text-emerald-800/90 mt-0.5">
                  Data formulir otomatis dimuat kembali dari memori perangkat ini ({draft.members.length} anggota). Anda dapat melanjutkan atau mulai dari awal.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={clearDraftAndReset}
                className="text-xs px-3 py-1.5 rounded-[var(--radius-md)] border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-medium transition-colors cursor-pointer"
              >
                Mulai Baru
              </button>
              <button
                type="button"
                onClick={dismissRestoredNotice}
                className="text-xs px-3 py-1.5 rounded-[var(--radius-md)] bg-emerald-700 hover:bg-emerald-800 text-white font-medium transition-colors shadow-xs cursor-pointer"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        )}

        <div className="animate-fade-in">
          {step === 1 && <Step1Type />}
          {step === 2 && <Step2Pic />}
          {step === 3 && <Step3Members />}
          {step === 4 && <Step4Documents />}
          {step === 5 && <Step5Payment />}
          {step === 6 && <Step6Review />}
        </div>
      </main>
    </div>
  )
}
