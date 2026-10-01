'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RegistrationGroup, Jamaah, Document, Payment } from '@/types'
import { GroupStatusBadge, DocumentStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { CheckCircle2, Clock, AlertCircle, Search } from 'lucide-react'
import Link from 'next/link'

function StatusContent() {
  const searchParams = useSearchParams()
  const [kode, setKode] = useState(searchParams.get('kode') ?? '')
  const [inputKode, setInputKode] = useState(searchParams.get('kode') ?? '')
  const [loading, setLoading] = useState(false)
  const [group, setGroup] = useState<RegistrationGroup | null>(null)
  const [jamaahs, setJamaahs] = useState<Jamaah[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (kode) fetchStatus(kode)
  }, [kode]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchStatus(code: string) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/status?code=${encodeURIComponent(code.trim().toUpperCase())}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Kode pendaftaran tidak ditemukan. Periksa kembali kode yang Anda masukkan.')
        setGroup(null)
        setJamaahs([])
        setPayments([])
        setLoading(false)
        return
      }

      setGroup(data.group as RegistrationGroup)
      setJamaahs((data.jamaahs ?? []) as Jamaah[])
      setPayments((data.payments ?? []) as Payment[])
    } catch (err) {
      console.error('Fetch status error:', err)
      setError('Terjadi kendala saat memeriksa status pendaftaran.')
      setGroup(null)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (inputKode.trim()) setKode(inputKode.trim())
  }

  const TIMELINE = [
    { label: 'Data Pendaftaran', key: 'data' },
    { label: 'Dokumen', key: 'dokumen' },
    { label: 'Pembayaran', key: 'pembayaran' },
    { label: 'Verifikasi', key: 'verifikasi' },
    { label: 'Selesai', key: 'selesai' },
  ]

  function getTimelineStep(status: string): number {
    const map: Record<string, number> = {
      draft: 0,
      submitted: 1,
      under_review: 2,
      revision_required: 1,
      documents_incomplete: 1,
      payment_pending: 2,
      verified: 3,
      ready_for_departure: 4,
      completed: 5,
      cancelled: 0,
    }
    return map[status] ?? 0
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--text-primary)]"
          >
            Umrah 100 Tahun Gontor
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Status Pendaftaran</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Masukkan kode pendaftaran untuk melihat status.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            id="kode-input"
            placeholder="UMR-2026-G0001"
            value={inputKode}
            onChange={(e) => setInputKode(e.target.value.toUpperCase())}
            className="flex-1 font-mono"
          />
          <Button type="submit" isLoading={loading}>
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Cari</span>
          </Button>
        </form>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-[var(--danger-light)] rounded-[var(--radius-md)]">
            <AlertCircle className="w-4 h-4 text-[var(--danger)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--danger-foreground)]">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* Result */}
        {!loading && group && (
          <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Kode Pendaftaran</p>
                  <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                    {group.registration_code}
                  </p>
                </div>
                <GroupStatusBadge status={group.group_status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[var(--text-muted)] text-xs">Jenis</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {group.type === 'family' ? 'Keluarga' : 'Individu'}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-xs">Jumlah Jamaah</p>
                  <p className="font-medium text-[var(--text-primary)]">{jamaahs.length} orang</p>
                </div>
                {group.departure_point != null && (
                  <div>
                    <p className="text-[var(--text-muted)] text-xs">Keberangkatan</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {(group.departure_point as { name: string })?.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Progress</p>
              <div className="flex items-start gap-0">
                {TIMELINE.map((step, i) => {
                  const currentStep = getTimelineStep(group.group_status)
                  const isDone = i < currentStep
                  const isActive = i === currentStep
                  const isLast = i === TIMELINE.length - 1

                  return (
                    <div key={step.key} className={`flex-1 flex flex-col items-center ${!isLast ? '' : ''}`}>
                      <div className="relative w-full flex justify-center">
                        {/* Line left */}
                        {i > 0 && (
                          <div className={`absolute top-3 right-1/2 left-0 h-0.5 ${isDone || isActive ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
                        )}
                        {/* Line right */}
                        {!isLast && (
                          <div className={`absolute top-3 left-1/2 right-0 h-0.5 ${isDone ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
                        )}
                        {/* Circle */}
                        <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isDone
                            ? 'bg-[var(--primary)]'
                            : isActive
                            ? 'border-2 border-[var(--primary)] bg-white'
                            : 'border-2 border-[var(--border)] bg-white'
                        }`}>
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          {isActive && <Clock className="w-3 h-3 text-[var(--primary)]" />}
                        </div>
                      </div>
                      <p className={`text-xs mt-2 text-center ${isActive ? 'text-[var(--primary)] font-semibold' : isDone ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                        {step.label}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Jamaah status */}
            {jamaahs.length > 0 && (
              <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
                <div className="px-5 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Jamaah</p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {jamaahs.map((jamaah) => {
                    const docs = (jamaah as Jamaah & { documents?: Document[] }).documents ?? []
                    const allVerified = docs.every((d) => d.verification_status === 'verified')
                    const someRevision = docs.some((d) => d.verification_status === 'revision_required')

                    return (
                      <div key={jamaah.id} className="px-5 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {jamaah.full_name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {jamaah.relationship_to_pic || 'Pendaftar'}
                            </p>
                            {Boolean(jamaah.has_disability) && (
                              <div className="mt-1 inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                                <span>♿ Bantuan / Disabilitas: {jamaah.disability_description || 'Kursi Roda'}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {someRevision ? (
                              <span className="text-xs text-[var(--warning-foreground)] bg-[var(--warning-light)] px-2 py-0.5 rounded">
                                Perlu Perbaikan
                              </span>
                            ) : allVerified && docs.length > 0 ? (
                              <span className="text-xs text-[var(--success-foreground)] bg-[var(--success-light)] px-2 py-0.5 rounded">
                                Dokumen Lengkap
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-muted)] px-2 py-0.5 rounded">
                                {docs.length} dokumen
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Payment status */}
            {payments.length > 0 && (
              <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
                <div className="px-5 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Pembayaran</p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {payments.map((payment) => (
                    <div key={payment.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {payment.payment_type === 'full' ? 'Pembayaran Penuh' : 'Down Payment'}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {formatCurrency(payment.amount)}
                        </p>
                        {payment.payment_date && (
                          <p className="text-xs text-[var(--text-muted)]">
                            {formatDate(payment.payment_date)}
                          </p>
                        )}
                      </div>
                      <PaymentStatusBadge status={payment.verification_status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function StatusPage() {
  return (
    <Suspense>
      <StatusContent />
    </Suspense>
  )
}
