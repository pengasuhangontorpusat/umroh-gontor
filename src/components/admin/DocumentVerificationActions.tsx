'use client'

import { useState } from 'react'
import { DocumentStatus } from '@/types'
import { DocumentStatusBadge } from '@/components/ui/StatusBadge'
import { Check, Edit3, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  documentId: string
  currentStatus: DocumentStatus
  rejectionReason?: string | null
}

export function DocumentVerificationActions({
  documentId,
  currentStatus: initialStatus,
  rejectionReason: initialReason,
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<DocumentStatus>(initialStatus)
  const [reason, setReason] = useState<string>(initialReason || '')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [targetAction, setTargetAction] = useState<'revision_required' | 'rejected' | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleVerify(newStatus: 'verified' | 'revision_required' | 'rejected', customReason?: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/verify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          status: newStatus,
          rejection_reason: customReason || undefined,
        }),
      })

      if (res.ok) {
        setStatus(newStatus)
        if (customReason) setReason(customReason)
        setShowNoteInput(false)
        setTargetAction(null)
        router.refresh()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Gagal mengubah status dokumen.')
      }
    } catch {
      alert('Terjadi kesalahan jaringan.')
    } finally {
      setLoading(false)
    }
  }

  function startNoteAction(action: 'revision_required' | 'rejected') {
    setTargetAction(action)
    setShowNoteInput(true)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <DocumentStatusBadge status={status} />

        <div className="flex items-center gap-1">
          {status !== 'verified' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => handleVerify('verified')}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
              title="Setujui Dokumen"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-emerald-600" />}
              Setujui
            </button>
          )}

          {status !== 'revision_required' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => startNoteAction('revision_required')}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
              title="Minta Revisi"
            >
              <Edit3 className="w-3 h-3 text-amber-600" />
              Revisi
            </button>
          )}

          {status !== 'rejected' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => startNoteAction('rejected')}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200 transition-colors"
              title="Tolak Dokumen"
            >
              <X className="w-3 h-3 text-rose-600" />
              Tolak
            </button>
          )}
        </div>
      </div>

      {reason && !showNoteInput && (
        <p className="text-xs text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
          Catatan: {reason}
        </p>
      )}

      {showNoteInput && (
        <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
          <p className="text-xs font-medium text-slate-700">
            {targetAction === 'revision_required' ? 'Alasan Permintaan Revisi:' : 'Alasan Penolakan:'}
          </p>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Foto buram/tidak terbaca, masa berlaku habis..."
            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-[var(--primary)] bg-white"
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowNoteInput(false)}
              className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => targetAction && handleVerify(targetAction, reason)}
              className="px-2.5 py-1 text-xs font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded"
            >
              Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
