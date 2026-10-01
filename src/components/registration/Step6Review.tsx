'use client'

import { useState } from 'react'
import { useRegistration } from '@/contexts/RegistrationContext'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDateShort, generateIdempotencyKey } from '@/lib/utils'
import { AlertCircle, CheckCircle2, Users, MapPin, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

function SummarySection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
      <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-[var(--border-muted)] last:border-0">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className="text-sm text-[var(--text-primary)] font-medium text-right">
        {value || '—'}
      </span>
    </div>
  )
}

export function Step6Review() {
  const { draft, nextStep, prevStep, setDraft } = useRegistration()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const paymentLabel = draft.payment_type === 'full' ? 'Pembayaran Penuh' : 'Down Payment (DP)'

  async function handleSubmit() {
    if (!confirmed) return
    setIsSubmitting(true)
    setError(null)

    try {
      const idempotencyKey = generateIdempotencyKey()

      const res = await fetch('/api/registration/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          type: draft.type,
          departure_point_id: draft.departure_point_id,
          package_id: draft.package_id,
          pic_phone: draft.pic_phone,
          pic_email: draft.pic_email,
          members: draft.members,
          payment_type: draft.payment_type,
          payment_date: draft.payment_date,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kendala saat menyimpan data.')
      }

      setDraft({
        group_id: data.group_id,
        registration_code: data.registration_code,
        step: 7,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kendala. Silakan coba kembali.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Tinjau & Kirim</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Periksa kembali data sebelum mengirim. Pendaftaran dapat direvisi jika panitia meminta.
        </p>
      </div>

      {/* Data Pendaftaran */}
      <SummarySection title="Data Pendaftaran">
        <DataRow
          label="Jenis"
          value={draft.type === 'family' ? 'Keluarga' : 'Individu'}
        />
        <DataRow
          label="Jumlah Jamaah"
          value={`${draft.members.length} orang`}
        />
        <DataRow label="Kontak" value={draft.pic_phone} />
      </SummarySection>

      {/* Jamaah */}
      <SummarySection title={`Jamaah (${draft.members.length} orang)`}>
        <div className="space-y-3">
          {draft.members.map((m, i) => (
            <div key={m.id} className="flex items-start gap-3 py-1">
              <div className="w-6 h-6 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-xs font-semibold text-[var(--text-secondary)] flex-shrink-0">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {m.full_name || '—'}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {m.birth_date ? new Date(m.birth_date).toLocaleDateString('id-ID') : '—'}{' '}
                  {m.relationship_to_pic && `· ${m.relationship_to_pic}`}
                  {m.clothing_size && ` · Batik: ${m.clothing_size}`}
                </p>
                {m.has_disability && (
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      ♿ Kebutuhan Khusus: {m.disability_description || 'Kursi roda / pendampingan'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </SummarySection>

      {/* Pembayaran */}
      <SummarySection title="Pembayaran">
        <DataRow label="Jenis" value={paymentLabel} />
        <DataRow
          label="Tanggal Transfer"
          value={draft.payment_date ? formatDateShort(draft.payment_date) : '—'}
        />
        <div className="mt-2 flex items-center gap-2 text-xs text-[var(--warning-foreground)] bg-[var(--warning-light)] px-3 py-2 rounded-[var(--radius-sm)]">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Status: Menunggu Verifikasi Panitia
        </div>
      </SummarySection>

      {/* Confirmation */}
      <div className="flex items-start gap-3 p-4 border border-[var(--border)] rounded-[var(--radius-lg)]">
        <input
          type="checkbox"
          id="confirm"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-[var(--primary)] cursor-pointer"
        />
        <label htmlFor="confirm" className="text-sm text-[var(--text-secondary)] cursor-pointer">
          Saya menyatakan bahwa data yang dimasukkan adalah benar dan saya bertanggung jawab atas
          kebenaran informasi tersebut.
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-[var(--danger-light)] rounded-[var(--radius-md)]">
          <AlertCircle className="w-4 h-4 text-[var(--danger)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--danger-foreground)]">{error}</p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={prevStep} disabled={isSubmitting}>
          Kembali
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!confirmed || isSubmitting}
          isLoading={isSubmitting}
          size="lg"
        >
          Kirim Pendaftaran
        </Button>
      </div>
    </div>
  )
}
