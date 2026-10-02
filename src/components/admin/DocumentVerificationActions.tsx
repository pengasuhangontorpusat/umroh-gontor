'use client'

import { useState } from 'react'
import { DocumentStatus, DocumentType } from '@/types'
import { DocumentStatusBadge } from '@/components/ui/StatusBadge'
import { Check, Edit3, X, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  documentId?: string
  jamaahId?: string
  docType?: DocumentType
  currentStatus: DocumentStatus
  verificationNote?: string | null
}

export function DocumentVerificationActions({
  documentId,
  jamaahId,
  docType,
  currentStatus: initialStatus,
  verificationNote: initialReason,
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
      const payload: Record<string, unknown> = {
        status: newStatus,
        verification_note: customReason || undefined,
      }

      if (documentId) {
        payload.document_id = documentId
      } else if (jamaahId && docType) {
        payload.jamaah_id = jamaahId
        payload.document_type = docType
      }

      const res = await fetch('/api/admin/verify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setStatus(newStatus)
        if (customReason !== undefined) setReason(customReason)
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

  const isUploaded = status !== 'not_uploaded'

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <DocumentStatusBadge status={status} />

        <div className="flex items-center gap-1">
          {/* If document is already uploaded, allow Setujui */}
          {isUploaded && status !== 'verified' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => handleVerify('verified')}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
              title="Setujui Dokumen Ini"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-emerald-600" />}
              Setujui
            </button>
          )}

          {/* Minta Revisi button (available whether uploaded or not) */}
          {status !== 'revision_required' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => startNoteAction('revision_required')}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
              title={isUploaded ? 'Minta Jamaah Revisi Dokumen' : 'Minta Jamaah Mengunggah Dokumen'}
            >
              <Edit3 className="w-3 h-3 text-amber-600" />
              {isUploaded ? 'Revisi' : 'Minta Unggah'}
            </button>
          )}

          {/* Tolak Dokumen */}
          {isUploaded && status !== 'rejected' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => startNoteAction('rejected')}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200 transition-colors"
              title="Tolak Dokumen Ini"
            >
              <X className="w-3 h-3 text-rose-600" />
              Tolak
            </button>
          )}
        </div>
      </div>

      {/* Note input form */}
      {showNoteInput && (
        <div className="w-full max-w-sm mt-1 p-3 bg-amber-50/90 rounded-lg border border-amber-200 text-xs space-y-2">
          <p className="font-semibold text-amber-900 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            {targetAction === 'revision_required' ? 'Catatan Revisi / Instruksi untuk Jamaah:' : 'Alasan Penolakan Dokumen:'}
          </p>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              targetAction === 'revision_required'
                ? 'Contoh: Foto buram/terpotong, mohon unggah ulang scan halaman identitas yang jelas...'
                : 'Contoh: Dokumen tidak sesuai atau masa berlaku habis...'
            }
            className="w-full text-xs p-2 border border-amber-300 rounded bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] resize-none"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setShowNoteInput(false)
                setTargetAction(null)
              }}
              className="px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-white rounded transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={loading || !reason.trim()}
              onClick={() => targetAction && handleVerify(targetAction, reason)}
              className="px-3 py-1 text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 rounded transition-colors disabled:opacity-50 inline-flex items-center gap-1"
            >
              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
              Kirim Catatan
            </button>
          </div>
        </div>
      )}

      {/* Display existing note if any */}
      {!showNoteInput && reason && (status === 'revision_required' || status === 'rejected') && (
        <div className="w-full text-right">
          <p className="text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200/80 px-2 py-1 rounded inline-block text-left">
            <span className="font-semibold">Catatan Panitia:</span> {reason}
            <button
              type="button"
              onClick={() => startNoteAction(status as 'revision_required' | 'rejected')}
              className="ml-2 text-[var(--primary)] underline hover:text-[var(--primary-hover)] font-medium"
            >
              Ubah
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
