'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'

interface DeleteJamaahButtonProps {
  jamaahId: string
  jamaahName: string
  variant?: 'icon' | 'button'
}

export function DeleteJamaahButton({
  jamaahId,
  jamaahName,
  variant = 'icon',
}: DeleteJamaahButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleDelete = async () => {
    setIsDeleting(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/admin/pendaftaran/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jamaahId, reason }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus jamaah')
      }

      setIsOpen(false)
      router.refresh()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Hapus Data Jamaah Ini"
          className="inline-flex items-center justify-center p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-[var(--radius-md)] border border-transparent hover:border-red-200 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Hapus Jamaah
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-[var(--border)]">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Hapus Data Jamaah
                </h3>
                <p className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                  {jamaahName}
                </p>
              </div>
            </div>

            <div className="text-xs text-[var(--text-secondary)] space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p>
                Apakah Anda yakin ingin menghapus data jamaah{' '}
                <strong className="text-[var(--text-primary)]">{jamaahName}</strong>?
              </p>
              <p className="text-red-600 font-medium">
                Seluruh dokumen lampiran jamaah ini juga akan dihapus.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                Alasan (Opsional):
              </label>
              <input
                type="text"
                placeholder="Contoh: Batal berangkat / data dobel"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-8 px-2.5 text-xs border border-[var(--border)] rounded-[var(--radius-md)] focus:outline-none focus:border-red-500"
              />
            </div>

            {errorMsg && (
              <div className="p-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] bg-white border border-[var(--border)] rounded hover:bg-[var(--surface)] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3" />
                    Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
