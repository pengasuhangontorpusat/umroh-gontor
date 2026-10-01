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
import { ChevronLeft, RotateCcw } from 'lucide-react'

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

  // Success page - no wizard chrome
  if (step === 7) {
    return <Step7Success />
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
