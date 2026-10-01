'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { GroupStatus, GROUP_STATUS_LABELS } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface UpdateStatusFormProps {
  groupId: string
  currentStatus: GroupStatus
}

const UPDATABLE_STATUSES: GroupStatus[] = [
  'under_review',
  'revision_required',
  'documents_incomplete',
  'payment_pending',
  'verified',
  'ready_for_departure',
  'completed',
  'cancelled',
]

export function UpdateStatusForm({ groupId, currentStatus }: UpdateStatusFormProps) {
  const [status, setStatus] = useState<GroupStatus>(currentStatus)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleUpdate() {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          status,
          note: note.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui status.')
      }

      setSuccess(true)
      setNote('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Perbarui Status</p>

      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1">
          <Select
            id="group-status-select"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as GroupStatus)}
            options={UPDATABLE_STATUSES.map((s) => ({
              value: s,
              label: GROUP_STATUS_LABELS[s],
            }))}
          />
        </div>
        <Button
          onClick={handleUpdate}
          isLoading={loading}
          disabled={status === currentStatus}
        >
          Simpan Status
        </Button>
      </div>

      {/* Revision note */}
      {(status === 'revision_required' || status === 'documents_incomplete') && (
        <div className="mt-3">
          <label className="text-sm font-medium text-[var(--text-primary)] block mb-1.5">
            Catatan untuk jamaah
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Jelaskan apa yang perlu diperbaiki..."
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] resize-none"
          />
        </div>
      )}

      {success && (
        <div className="mt-3 flex items-center gap-2 text-sm text-[var(--success)]">
          <CheckCircle2 className="w-4 h-4" />
          Status berhasil diperbarui.
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-[var(--danger)]">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  )
}
