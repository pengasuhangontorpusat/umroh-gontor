'use client'

import { useState } from 'react'
import { PaymentStatus } from '@/types'
import { PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { Check, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  paymentId: string
  currentStatus: PaymentStatus
  verificationNote?: string | null
}

export function PaymentVerificationActions({
  paymentId,
  currentStatus: initialStatus,
  verificationNote: initialNote,
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<PaymentStatus>(initialStatus)
  const [note, setNote] = useState<string>(initialNote || '')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleVerify(newStatus: 'verified' | 'rejected', customNote?: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: paymentId,
          status: newStatus,
          note: customNote || undefined,
        }),
      })

      if (res.ok) {
        setStatus(newStatus)
        if (customNote) setNote(customNote)
        setShowNoteInput(false)
        router.refresh()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Gagal mengubah status pembayaran.')
      }
    } catch {
      alert('Terjadi kesalahan jaringan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <PaymentStatusBadge status={status} />

        <div className="flex items-center gap-1">
          {status !== 'verified' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => handleVerify('verified')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded transition-colors"
              title="Konfirmasi Pembayaran Diterima"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Verifikasi Diterima
            </button>
          )}

          {status !== 'rejected' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowNoteInput((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200 transition-colors"
              title="Tolak Pembayaran"
            >
              <X className="w-3.5 h-3.5" />
              Tolak
            </button>
          )}
        </div>
      </div>

      {note && !showNoteInput && (
        <p className="text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          Catatan: {note}
        </p>
      )}

      {showNoteInput && (
        <div className="w-full max-w-xs mt-1 p-2 bg-slate-50 border border-slate-200 rounded space-y-1.5 text-left">
          <p className="text-xs font-medium text-slate-700">Catatan Penolakan Pembayaran:</p>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Alasan (contoh: bukti tidak terbaca, mutasi belum masuk)..."
            className="w-full text-xs px-2 py-1 border border-slate-300 rounded bg-white"
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowNoteInput(false)}
              className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200 rounded"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleVerify('rejected', note)}
              className="px-2 py-0.5 text-xs bg-rose-600 text-white rounded hover:bg-rose-700"
            >
              Tolak Pembayaran
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
