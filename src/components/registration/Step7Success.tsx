'use client'

import { useRegistration, saveRegistrationHistory } from '@/contexts/RegistrationContext'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { CheckCircle2, Copy } from 'lucide-react'
import { useState, useEffect } from 'react'

export function Step7Success() {
  const { draft } = useRegistration()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (draft.registration_code) {
      saveRegistrationHistory({
        code: draft.registration_code,
        picName: draft.pic_name,
        memberCount: draft.members.length,
        date: new Date().toISOString(),
      })
    }
  }, [draft.registration_code, draft.pic_name, draft.members.length])

  function handleCopy() {
    navigator.clipboard.writeText(draft.registration_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] flex items-start justify-center pt-16 px-4">
      <div className="max-w-md w-full bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-8 text-center space-y-6 shadow-[var(--shadow-md)]">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-[var(--success-light)] flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-[var(--success)]" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Pendaftaran berhasil diterima.
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Panitia akan segera memeriksa data pendaftaran Anda.
          </p>
        </div>

        {/* Code */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Kode Pendaftaran</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-2xl font-bold tracking-wider text-[var(--text-primary)] font-mono">
              {draft.registration_code}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Salin kode pendaftaran"
              className="p-1.5 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Info */}
        <p className="text-sm text-[var(--text-secondary)]">
          Simpan kode ini untuk memeriksa status pendaftaran Anda.
        </p>

        {/* CTA */}
        <div className="flex flex-col gap-2">
          <Link href={`/status?kode=${draft.registration_code}`}>
            <Button fullWidth size="lg">
              Lihat Status Pendaftaran
            </Button>
          </Link>
          <Link href="/">
            <Button fullWidth variant="ghost">
              Kembali ke Halaman Utama
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
