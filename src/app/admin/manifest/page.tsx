import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Download, Search, PlaneTakeoff, Users, FileSpreadsheet } from 'lucide-react'

async function getManifestData(departure?: string, q?: string) {
  const supabase = await createServiceClient()

  let query = supabase
    .from('jamaahs')
    .select(`
      *,
      registration_groups!inner(
        id,
        registration_code,
        group_status,
        departure_point:departure_points(name, code)
      )
    `)
    .order('full_name')
    .neq('registration_groups.group_status', 'cancelled')

  if (departure) {
    query = query.eq('registration_groups.departure_point.code', departure)
  }

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,passport_number.ilike.%${q}%,nik.ilike.%${q}%`)
  }

  const { data } = await query
  return data ?? []
}

async function getDeparturePoints() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('departure_points')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  return data ?? []
}

interface PageProps {
  searchParams: Promise<{ departure?: string; q?: string }>
}

export default async function ManifestPage({ searchParams }: PageProps) {
  const params = await searchParams
  const [jamaahs, departurePoints] = await Promise.all([
    getManifestData(params.departure, params.q),
    getDeparturePoints(),
  ])

  const withPassportCount = jamaahs.filter((j: Record<string, unknown>) => Boolean(j.passport_number)).length
  const disabilityCount = jamaahs.filter((j: Record<string, unknown>) => Boolean(j.has_disability)).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Manifest & Ekspor Jamaah</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Daftar resmi manifes keberangkatan jamaah untuk maskapai, hotel, dan Kemenag RI (Siskopatuh).
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href={`/api/admin/manifest?format=xlsx${params.departure ? `&departure=${params.departure}` : ''}`}
            download
            className="flex items-center gap-2 px-4 h-9 text-sm font-medium bg-[var(--primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Ekspor Excel (XLSX)
          </a>
          <a
            href={`/api/admin/manifest?format=csv${params.departure ? `&departure=${params.departure}` : ''}`}
            download
            className="flex items-center gap-2 px-4 h-9 text-sm font-medium border border-[var(--border)] bg-white rounded-[var(--radius-md)] hover:bg-[var(--surface)] transition-colors text-[var(--text-primary)]"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </a>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-[var(--border)] rounded-[var(--radius-lg)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Total di Manifest</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{jamaahs.length} Jamaah</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-[var(--border)] rounded-[var(--radius-lg)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <PlaneTakeoff className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Paspor Lengkap</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{withPassportCount} Paspor</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-[var(--border)] rounded-[var(--radius-lg)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <span className="text-lg">♿</span>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Kebutuhan Khusus</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{disabilityCount} Jamaah</p>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        {/* Filter by departure points */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-medium text-[var(--text-muted)] mr-1">Titik Kumpul:</span>
          <Link
            href={`/admin/manifest${params.q ? `?q=${params.q}` : ''}`}
            className={`px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] border transition-colors ${
              !params.departure
                ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                : 'border-[var(--border)] bg-white hover:bg-[var(--surface)] text-[var(--text-secondary)]'
            }`}
          >
            Semua Titik
          </Link>
          {departurePoints.map((dp: Record<string, unknown>) => (
            <Link
              key={dp.id as string}
              href={`/admin/manifest?departure=${dp.code as string}${params.q ? `&q=${params.q}` : ''}`}
              className={`px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] border transition-colors ${
                params.departure === dp.code
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'border-[var(--border)] bg-white hover:bg-[var(--surface)] text-[var(--text-secondary)]'
              }`}
            >
              {dp.name as string}
            </Link>
          ))}
        </div>

        {/* Search */}
        <form className="flex items-center gap-2">
          {params.departure && <input type="hidden" name="departure" value={params.departure} />}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Cari nama / paspor..."
              className="h-8 pl-8 pr-3 text-xs border border-[var(--border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--primary)] w-48 sm:w-56 bg-white"
            />
          </div>
          <button
            type="submit"
            className="h-8 px-3 text-xs font-medium bg-[var(--primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            Cari
          </button>
          {Boolean(params.q) && (
            <Link
              href={`/admin/manifest${params.departure ? `?departure=${params.departure}` : ''}`}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Reset
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-sm">
        {jamaahs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[var(--text-muted)]">Belum ada data manifest untuk filter ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">No</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">Nama Jamaah</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">L/P</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">No. Paspor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">Tgl Lahir / Usia</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">Keberangkatan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">Disabilitas</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">Kode Kelompok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {jamaahs.map((j: Record<string, unknown>, i: number) => {
                  const group = j.registration_groups as Record<string, unknown>
                  const dep = (group?.departure_point as Record<string, unknown>)?.name as string

                  return (
                    <tr key={j.id as string} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--text-primary)]">{j.full_name as string}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          Ayah: {(j.father_name as string) || '—'} · NIK: {(j.nik as string) || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                        {j.gender === 'male' ? 'L' : 'P'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                        {(j.passport_number as string) ? (
                          <span className="font-semibold text-slate-800">{j.passport_number as string}</span>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">Belum ada</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                        {j.birth_date ? formatDate(j.birth_date as string) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{dep ?? '—'}</td>
                      <td className="px-4 py-3">
                        {Boolean(j.has_disability) ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            ♿ {String(j.disability_description || 'Kursi Roda')}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {group?.id ? (
                          <Link
                            href={`/admin/pendaftaran/${group.id as string}`}
                            className="font-mono text-xs font-bold text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                          >
                            {group.registration_code as string}
                          </Link>
                        ) : (
                          <span className="font-mono text-xs text-[var(--text-muted)]">
                            {group?.registration_code as string}
                          </span>
                        )}
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
