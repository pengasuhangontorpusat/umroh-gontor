'use client'

import { useRegistration } from '@/contexts/RegistrationContext'
import { Button } from '@/components/ui/Button'
import { Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Step1Type() {
  const { draft, setDraft, nextStep, addMember } = useRegistration()

  function handleSelect(type: 'individual' | 'family') {
    setDraft({ type })
    // Initialize members array
    if (draft.members.length === 0) {
      addMember() // Add PIC as first member
    }
  }

  function handleNext() {
    const typeToSet = draft.type || 'individual'
    handleSelect(typeToSet)
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Jenis Pendaftaran</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Pilih apakah Anda mendaftar sendiri atau bersama keluarga.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Individual */}
        <button
          type="button"
          onClick={() => handleSelect('individual')}
          className={cn(
            'flex flex-col items-start gap-3 p-5 rounded-[var(--radius-lg)] border-2 text-left transition-all cursor-pointer relative',
            draft.type === 'individual'
              ? 'border-[var(--primary)] bg-emerald-50/50 shadow-sm'
              : 'border-[var(--border)] hover:border-[var(--primary)] bg-white'
          )}
        >
          {draft.type === 'individual' && (
            <span className="absolute top-4 right-4 text-xs font-semibold text-[var(--primary)] bg-emerald-100 px-2 py-0.5 rounded-full">
              ✓ Terpilih
            </span>
          )}
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              draft.type === 'individual'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
            )}
          >
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">Saya mendaftar sendiri</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Satu pendaftar untuk satu orang jamaah.
            </p>
          </div>
        </button>

        {/* Family */}
        <button
          type="button"
          onClick={() => handleSelect('family')}
          className={cn(
            'flex flex-col items-start gap-3 p-5 rounded-[var(--radius-lg)] border-2 text-left transition-all cursor-pointer relative',
            draft.type === 'family'
              ? 'border-[var(--primary)] bg-emerald-50/50 shadow-sm'
              : 'border-[var(--border)] hover:border-[var(--primary)] bg-white'
          )}
        >
          {draft.type === 'family' && (
            <span className="absolute top-4 right-4 text-xs font-semibold text-[var(--primary)] bg-emerald-100 px-2 py-0.5 rounded-full">
              ✓ Terpilih
            </span>
          )}
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              draft.type === 'family'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
            )}
          >
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">
              Saya mendaftarkan keluarga / rombongan
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Satu pendaftar (PIC) untuk beberapa anggota keluarga/rombongan sekaligus.
            </p>
          </div>
        </button>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleNext}
          size="lg"
        >
          Lanjut ke Data PIC →
        </Button>
      </div>
    </div>
  )
}
