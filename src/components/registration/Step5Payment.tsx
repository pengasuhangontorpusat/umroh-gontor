'use client'

import { useState, useEffect } from 'react'
import { useRegistration } from '@/contexts/RegistrationContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { Package, BankAccount } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, Building2, Copy, Check, CreditCard } from 'lucide-react'
import { FileUpload } from '@/components/ui/FileUpload'

const DEFAULT_BANKS: BankAccount[] = [
  {
    id: '1',
    bankName: 'Bank Syariah Indonesia (BSI)',
    accountNumber: '7100100100',
    accountHolder: 'PANITIA UMRAH 100 TAHUN GONTOR',
    isActive: true,
  },
  {
    id: '2',
    bankName: 'Bank Mandiri',
    accountNumber: '1370010010012',
    accountHolder: 'YAYASAN PEMELIHARAAN DAN PERLUASAN PONDOK MODERN GONTOR',
    isActive: true,
  },
]

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
  const { draft, setDraft, nextStep, prevStep, paymentProofFile, setPaymentProofFile } = useRegistration()
  const [pkg, setPkg] = useState<Package>(FALLBACK_PACKAGE)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(DEFAULT_BANKS)
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null)
  const [loadingBanks, setLoadingBanks] = useState(false)

  // Fetch bank accounts from API (synced with Admin Settings)
  useEffect(() => {
    setLoadingBanks(true)
    fetch('/api/banks')
      .then((res) => res.json())
      .then((data) => {
        if (data?.banks && Array.isArray(data.banks) && data.banks.length > 0) {
          setBankAccounts(data.banks)
        }
      })
      .catch((err) => {
        console.error('Gagal mengambil daftar rekening bank:', err)
      })
      .finally(() => {
        setLoadingBanks(false)
      })
  }, [])

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

  const handleCopyAccount = (accountNumber: string, id: string) => {
    navigator.clipboard.writeText(accountNumber.replace(/\s+/g, ''))
    setCopiedBankId(id)
    setTimeout(() => {
      setCopiedBankId((curr) => (curr === id ? null : curr))
    }, 2000)
  }

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
          Pilih nominal pembayaran dan lakukan transfer ke salah satu rekening resmi panitia di bawah ini.
        </p>
      </div>

      {/* Rekening Resmi Panitia (Dynamic from Admin Settings) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Rekening Resmi Panitia
            </h3>
          </div>
          <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-muted)] px-2.5 py-1 rounded-full border border-[var(--border)]">
            {loadingBanks ? 'Memuat...' : `${bankAccounts.length} Rekening Aktif`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bankAccounts.map((bank) => {
            const isCopied = copiedBankId === bank.id
            return (
              <div
                key={bank.id}
                className="relative p-4 rounded-[var(--radius-lg)] bg-gradient-to-br from-white to-[var(--surface)] border border-[var(--border)] shadow-xs hover:border-[var(--primary)] transition-all flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {bank.bankName}
                    </span>
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">
                      Resmi
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-[var(--text-muted)] font-medium">Nomor Rekening</p>
                    <div className="flex items-center justify-between bg-white border border-[var(--border)] rounded-md px-3 py-2">
                      <span className="font-mono text-base font-bold text-[var(--text-primary)] tracking-wider select-all">
                        {bank.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyAccount(bank.accountNumber, bank.id)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer',
                          isCopied
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-[var(--surface-muted)] hover:bg-[var(--primary-light)] text-[var(--text-primary)] hover:text-[var(--primary)] border border-[var(--border)]'
                        )}
                        title="Salin nomor rekening"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border)]/70 flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Atas Nama:</span>
                  <span
                    className="font-semibold text-[var(--text-primary)] text-right truncate max-w-[210px]"
                    title={bank.accountHolder}
                  >
                    {bank.accountHolder}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-[var(--text-muted)] italic">
          * Transfer dapat dilakukan melalui ATM, Mobile Banking, atau Teller ke salah satu rekening di atas.
        </p>
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

      {/* Date & Upload */}
      {draft.payment_type && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="Tanggal Transfer"
              id="payment-date"
              type="date"
              required
              value={draft.payment_date}
              onChange={(e) => setDraft({ payment_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Bukti Transfer (Opsional)
            </label>
            <FileUpload
              id="payment-proof"
              currentFileName={paymentProofFile?.name}
              onFileSelect={async (file) => {
                setPaymentProofFile(file)
              }}
              onFileRemove={() => {
                setPaymentProofFile(null)
              }}
            />
          </div>
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
