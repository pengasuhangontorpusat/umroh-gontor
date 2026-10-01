import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { GroupStatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Download } from 'lucide-react'

async function getManifestData(departure?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('jamaahs')
    .select(`
      *,
      registration_groups!inner(
        registration_code,
        group_status,
        departure_point:departure_points(name, code)
      )
    `)
    .order('full_name')
    .neq('registration_groups.group_status', 'cancelled')

  if (departure) {
    query = (query as typeof query).eq('registration_groups.departure_point.code', departure)
  }

  const { data } = await query
  return data ?? []
}

async function getDeparturePoints() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('departure_points')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  return data ?? []
}

interface PageProps {
  searchParams: Promise<{ departure?: string }>
}

export default async function ManifestPage({ searchParams }: PageProps) {
  const params = await searchParams
  const [jamaahs, departurePoints] = await Promise.all([
    getManifestData(params.departure),
    getDeparturePoints(),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Manifest</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {jamaahs.length} jamaah
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Export buttons */}
          <a
            href={`/api/admin/manifest?format=xlsx${params.departure ? `&departure=${params.departure}` : ''}`}
            className="flex items-center gap-2 px-4 h-9 text-sm bg-[var(--primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export XLSX
          </a>
          <a
            href={`/api/admin/manifest?format=csv${params.departure ? `&departure=${params.departure}` : ''}`}
            className="flex items-center gap-2 px-4 h-9 text-sm border border-[var(--border)] bg-white rounded-[var(--radius-md)] hover:bg-[var(--surface)] transition-colors text-[var(--text-primary)]"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Filter by departure */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/admin/manifest"
          className={`px-3 py-1.5 text-sm rounded-[var(--radius-md)] border transition-colors ${
            !params.departure
              ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
              : 'border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-secondary)]'
          }`}
        >
          Semua
        </Link>
        {departurePoints.map((dp: Record<string, unknown>) => (
          <Link
            key={dp.id as string}
            href={`/admin/manifest?departure=${dp.code as string}`}
            className={`px-3 py-1.5 text-sm rounded-[var(--radius-md)] border transition-colors ${
              params.departure === dp.code
                ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                : 'border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-secondary)]'
            }`}
          >
            {dp.name as string}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
        {jamaahs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[var(--text-muted)]">Belum ada data manifest.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">No</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">Nama</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">L/P</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">No. Paspor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">Tgl Lahir</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">Keberangkatan</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">Kode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {jamaahs.map((j: Record<string, unknown>, i: number) => {
                  const group = j.registration_groups as Record<string, unknown>
                  const dep = (group?.departure_point as Record<string, unknown>)?.name as string

                  return (
                    <tr key={j.id as string} className="hover:bg-[var(--surface)] transition-colors">
                      <td className="px-4 py-3 text-[var(--text-muted)]">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        <div>{j.full_name as string}</div>
                        {Boolean(j.has_disability) && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                            ♿ {String(j.disability_description || 'Kursi Roda')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {j.gender === 'male' ? 'L' : 'P'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">
                        {(j.passport_number as string) ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {j.birth_date ? formatDate(j.birth_date as string) : '—'}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{dep ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/pendaftaran/${(group.id as string)}`}
                          className="font-mono text-xs text-[var(--primary)] hover:underline"
                        >
                          {group.registration_code as string}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
