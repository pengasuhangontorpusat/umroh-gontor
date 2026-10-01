import { createClient } from '@/lib/supabase/server'
import { GroupStatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Search } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{
    status?: string
    departure?: string
    q?: string
    page?: string
  }>
}

const PAGE_SIZE = 20

export default async function PendaftaranPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()

  let query = supabase
    .from('registration_groups')
    .select(`
      *,
      departure_point:departure_points(name),
      pic_jamaah:jamaahs!pic_jamaah_id(full_name, phone),
      _count:jamaahs(count)
    `, { count: 'exact' })

  if (params.status) query = query.eq('group_status', params.status)
  if (params.q) {
    query = query.or(
      `registration_code.ilike.%${params.q}%`
    )
  }

  const { data: groups, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const GROUP_STATUSES = [
    { value: '', label: 'Semua Status' },
    { value: 'submitted', label: 'Terkirim' },
    { value: 'under_review', label: 'Dalam Pemeriksaan' },
    { value: 'revision_required', label: 'Perlu Revisi' },
    { value: 'verified', label: 'Terverifikasi' },
    { value: 'ready_for_departure', label: 'Siap Berangkat' },
    { value: 'completed', label: 'Selesai' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Pendaftaran</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {count ?? 0} total pendaftaran
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <form className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Cari kode..."
              className="h-8 pl-8 pr-3 text-sm border border-[var(--border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--primary)] w-40"
            />
          </div>
          <select
            name="status"
            defaultValue={params.status ?? ''}
            className="h-8 px-2.5 text-sm border border-[var(--border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--primary)] bg-white"
          >
            {GROUP_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-8 px-3 text-sm bg-[var(--primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
        {!groups?.length ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[var(--text-muted)]">Tidak ada pendaftaran ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Kode</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">PIC</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Jamaah</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Keberangkatan</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {groups.map((group: Record<string, unknown>) => (
                  <tr key={group.id as string} className="hover:bg-[var(--surface)] transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pendaftaran/${group.id as string}`}
                        className="font-mono text-[var(--primary)] hover:underline font-medium text-sm"
                      >
                        {group.registration_code as string}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[var(--text-primary)] font-medium">
                        {((group.pic_jamaah as Record<string, unknown>)?.full_name as string) ?? '—'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {((group.pic_jamaah as Record<string, unknown>)?.phone as string) ?? ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                      {(group._count as number) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {((group.departure_point as Record<string, unknown>)?.name as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <GroupStatusBadge status={group.group_status as never} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {formatDate(group.created_at as string)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex gap-1">
              {page > 1 && (
                <Link
                  href={`?page=${page - 1}${params.status ? `&status=${params.status}` : ''}`}
                  className="px-3 py-1.5 text-xs border border-[var(--border)] rounded hover:bg-[var(--surface)] transition-colors"
                >
                  Sebelumnya
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`?page=${page + 1}${params.status ? `&status=${params.status}` : ''}`}
                  className="px-3 py-1.5 text-xs border border-[var(--border)] rounded hover:bg-[var(--surface)] transition-colors"
                >
                  Berikutnya
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
