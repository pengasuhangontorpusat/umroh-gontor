'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'

interface DeleteRegistrationButtonProps {
  groupId: string
  registrationCode: string
  picName?: string
  redirectAfterDelete?: boolean
  variant?: 'icon' | 'button'
}

export function DeleteRegistrationButton({
  groupId,
  registrationCode,
  picName,
  redirectAfterDelete = false,
  variant = 'icon',
}: DeleteRegistrationButtonProps) {
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
        body: JSON.stringify({ groupId, reason }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus pendaftaran')
      }

      setIsOpen(false)
      if (redirectAfterDelete) {
        router.push('/admin/pendaftaran')
      } else {
        router.refresh()
      }
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
          title="Hapus Pendaftaran"
          className="inline-flex items-center justify-center p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-[var(--radius-md)] border border-transparent hover:border-red-200 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-[var(--radius-md)] hover:bg-red-100 transition-colors shadow-sm"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Hapus Pendaftaran
        </button>
      )}

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-[var(--border)]">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Konfirmasi Hapus Pendaftaran
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  {registrationCode}
                </p>
              </div>
            </div>

            <div className="text-sm text-[var(--text-secondary)] space-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <p>
                Apakah Anda yakin ingin menghapus pendaftaran{' '}
                <strong className="text-[var(--text-primary)] font-mono">{registrationCode}</strong>
                {picName ? (
                  <>
                    {' '}atas nama <strong className="text-[var(--text-primary)]">{picName}</strong>
                  </>
                ) : null}
                ?
              </p>
              <p className="text-xs text-red-600 font-medium leading-relaxed">
                ⚠️ Peringatan: Tindakan ini permanen. Seluruh data jamaah, berkas dokumen, dan pembayaran dalam pendaftaran ini akan dihapus dari sistem.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Alasan Penghapusan (Opsional):
              </label>
              <input
                type="text"
                placeholder="Contoh: Permintaan pembatalan dari jamaah / data duplikat"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-8 px-3 text-xs border border-[var(--border)] rounded-[var(--radius-md)] focus:outline-none focus:border-red-500"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] bg-white border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--surface)] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-[var(--radius-md)] hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Ya, Hapus Data
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
