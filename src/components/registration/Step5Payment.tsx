'use client'

import { useState, useEffect } from 'react'
import { useRegistration } from '@/contexts/RegistrationContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { Package } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle } from 'lucide-react'

const FALLBACK_PACKAGE: Package = {
  id: '99999999-9999-9999-9999-999999999999',
  name: 'Paket Umrah 100 Tahun Gontor',
  price: 37200000,
  dp_amount: 5000000,
  currency: 'IDR',
  departure_date: '2026-10-01',
  return_date: '2026-10-12',
  is_active: true,
  created_at: '',
  updated_at: '',
}

export function Step5Payment() {
  const { draft, setDraft, nextStep, prevStep } = useRegistration()
  const [pkg, setPkg] = useState<Package>(FALLBACK_PACKAGE)

  useEffect(() => {
    // Auto-select DP and today's date by default if not set
    if (!draft.payment_type) {
      setDraft({
        payment_type: 'dp',
        payment_date: draft.payment_date || new Date().toISOString().split('T')[0],
      })
    }

    if (draft.package_id) {
      const supabase = createClient()
      supabase
        .from('packages')
        .select('*')
        .eq('id', draft.package_id)
        .single()
        .then(
          ({ data }) => {
            if (data) setPkg(data)
          },
          () => {
            setPkg(FALLBACK_PACKAGE)
          }
        )
    }
  }, [draft.package_id, draft.payment_type, draft.payment_date, setDraft])

  const totalMembers = draft.members.length || 1

  const PAYMENT_OPTIONS = [
    {
      type: 'dp' as const,
      label: 'Bayar DP (Uang Muka)',
      amount: pkg.dp_amount * totalMembers,
      description: `Rp ${Number(pkg.dp_amount).toLocaleString('id-ID')} × ${totalMembers} jamaah`,
    },
    {
      type: 'full' as const,
      label: 'Bayar Lunas',
      amount: pkg.price * totalMembers,
      description: `Rp ${Number(pkg.price).toLocaleString('id-ID')} × ${totalMembers} jamaah`,
    },
  ]

  function handleSelect(type: 'full' | 'dp') {
    setDraft({ payment_type: type })
  }

  function handleNext() {
    const pType = draft.payment_type || 'dp'
    const pDate = draft.payment_date || new Date().toISOString().split('T')[0]
    setDraft({ payment_type: pType, payment_date: pDate })
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Pembayaran</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Pilih jenis pembayaran. Bukti transfer diunggah setelah memilih.
        </p>
      </div>

      {/* Rekening info */}
      <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Rekening Panitia</p>
        <div className="space-y-1">
          <p className="text-sm text-[var(--text-secondary)]">Bank: <span className="font-medium text-[var(--text-primary)]">Bank Syariah Indonesia</span></p>
          <p className="text-sm text-[var(--text-secondary)]">No. Rek: <span className="font-medium text-[var(--text-primary)] select-all">1234567890</span></p>
          <p className="text-sm text-[var(--text-secondary)]">a.n. <span className="font-medium text-[var(--text-primary)]">Panitia Umrah 100 Tahun Gontor</span></p>
        </div>
      </div>

      {/* Payment options */}
      {pkg && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => handleSelect(opt.type)}
              className={cn(
                'flex flex-col items-start gap-2 p-4 rounded-[var(--radius-lg)] border-2 text-left transition-all',
                draft.payment_type === opt.type
                  ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                  : 'border-[var(--border)] hover:border-[var(--primary)] bg-white'
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {opt.label}
                </span>
                {draft.payment_type === opt.type && (
                  <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
                )}
              </div>
              <p className="text-xl font-semibold text-[var(--text-primary)]">
                {formatCurrency(opt.amount)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{opt.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Date */}
      {draft.payment_type && (
        <div className="max-w-xs">
          <Input
            label="Tanggal Transfer"
            id="payment-date"
            type="date"
            required
            value={draft.payment_date}
            onChange={(e) => setDraft({ payment_date: e.target.value })}
          />
        </div>
      )}

      {/* Note */}
      <div className="flex items-start gap-2 p-3 bg-[var(--info-light)] rounded-[var(--radius-md)]">
        <AlertCircle className="w-4 h-4 text-[var(--info)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--info-foreground)]">
          Upload bukti transfer pada langkah ini bersifat opsional. Pembayaran dianggap{' '}
          <strong>Menunggu Verifikasi</strong> sampai dikonfirmasi oleh panitia.
        </p>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={prevStep}>
          Kembali
        </Button>
        <Button
          onClick={handleNext}
          disabled={!draft.payment_type}
          size="lg"
        >
          Lanjutkan
        </Button>
      </div>
    </div>
  )
}
