'use client'

import { useState } from 'react'
import { useRegistration, saveRegistrationHistory } from '@/contexts/RegistrationContext'
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
  const { draft, nextStep, prevStep, setDraft, pendingFiles, paymentProofFile } = useRegistration()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const paymentLabel = draft.payment_type === 'full' ? 'Pembayaran Penuh' : 'Down Payment (DP)'

  async function handleSubmit() {
    if (!confirmed) return
    setIsSubmitting(true)
    setError(null)
    setUploadStatus('Menyimpan data pendaftaran...')

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
          pic_name: draft.pic_name,
          pic_phone: draft.pic_phone,
          pic_email: draft.pic_email,
          pic_domicile_city: draft.pic_domicile_city,
          pic_is_departing: draft.pic_is_departing,
          members: draft.members,
          payment_type: draft.payment_type,
          payment_date: draft.payment_date,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kendala saat menyimpan data.')
      }

      // Collect all pending upload tasks
      const uploadTasks: Array<{
        file: File
        jamaahId: string
        docType: string
        paymentId?: string
      }> = []

      draft.members.forEach((member, index) => {
        const realJamaahId = data.jamaah_ids?.[index]
        if (!realJamaahId) return
        const mFiles = pendingFiles[member.id] || {}
        const docKeys = ['ktp', 'kk', 'vaksin', 'paspor', 'bukti_bayar'] as const
        docKeys.forEach((dType) => {
          const file = mFiles[dType]
          if (file) {
            uploadTasks.push({
              file,
              jamaahId: realJamaahId,
              docType: dType,
            })
          }
        })
      })

      if (paymentProofFile && data.jamaah_ids?.[0]) {
        uploadTasks.push({
          file: paymentProofFile,
          jamaahId: data.jamaah_ids[0],
          docType: 'bukti_bayar',
          paymentId: data.payment_id,
        })
      }

      // Upload each file to Google Drive via /api/upload
      if (uploadTasks.length > 0) {
        for (let i = 0; i < uploadTasks.length; i++) {
          const task = uploadTasks[i]
          setUploadStatus(`Mengunggah berkas ke Google Drive (${i + 1}/${uploadTasks.length})...`)

          try {
            const formData = new FormData()
            formData.append('file', task.file)
            formData.append('jamaahId', task.jamaahId)
            formData.append('docType', task.docType)
            if (task.paymentId) {
              formData.append('paymentId', task.paymentId)
            }

            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            })

            if (!uploadRes.ok) {
              const uErr = await uploadRes.json().catch(() => ({}))
              console.warn(`[upload] file ${task.file.name} failed:`, uErr)
            }
          } catch (uploadErr) {
            console.warn(`[upload] file ${task.file.name} error:`, uploadErr)
          }
        }
      }

      if (data.registration_code) {
        saveRegistrationHistory({
          code: data.registration_code,
          picName: draft.pic_name,
          memberCount: draft.members.length,
          date: new Date().toISOString(),
          token: data.auth_token,
        })
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
      setUploadStatus(null)
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

      {/* Uploading progress status */}
      {isSubmitting && uploadStatus && (
        <div className="flex items-center gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-[var(--radius-md)] text-blue-900 text-sm font-medium animate-pulse">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span>{uploadStatus}</span>
        </div>
      )}

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
          {uploadStatus || 'Kirim Pendaftaran'}
        </Button>
      </div>
    </div>
  )
}
