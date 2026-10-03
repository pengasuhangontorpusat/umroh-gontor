import { createServiceClient } from '@/lib/supabase/server'
import { GroupStatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, maskNik, getGroupPic, formatCurrency } from '@/lib/utils'
import { DeleteRegistrationButton, DeleteJamaahButton } from '@/components/admin'
import Link from 'next/link'
import { Search, Users, ClipboardList } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{
    view?: 'groups' | 'jamaahs'
    status?: string
    payment_status?: string
    departure?: string
    q?: string
    page?: string
  }>
}

const PAGE_SIZE = 20

export default async function PendaftaranPage({ searchParams }: PageProps) {
  const params = await searchParams
  const view = params.view || 'groups'
  const page = parseInt(params.page ?? '1')
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createServiceClient()

  // 1. Groups Query
  let groupsQuery = supabase
    .from('registration_groups')
    .select(
      `
      *,
      departure_point:departure_points(name),
      package:packages(id, name, price, dp_amount),
      pic_jamaah:jamaahs!fk_pic_jamaah(full_name, phone),
      payments:payments(id, payment_type, amount, verification_status, drive_file_id),
      _count:jamaahs!jamaahs_group_id_fkey(count)
    `,
      { count: 'exact' }
    )

  if (params.status) groupsQuery = groupsQuery.eq('group_status', params.status)
  if (params.q && view === 'groups') {
    groupsQuery = groupsQuery.ilike('registration_code', `%${params.q}%`)
  }

  const { data: groups, count: totalGroups } = await groupsQuery
    .order('created_at', { ascending: false })
    .range(view === 'groups' ? offset : 0, view === 'groups' ? offset + PAGE_SIZE - 1 : 19)

  // 2. Jamaahs Query
  let jamaahsQuery = supabase
    .from('jamaahs')
    .select(
      `
      *,
      registration_groups!jamaahs_group_id_fkey!inner(
        id,
        registration_code,
        group_status,
        departure_point:departure_points(name)
      )
    `,
      { count: 'exact' }
    )

  if (params.q && view === 'jamaahs') {
    jamaahsQuery = jamaahsQuery.or(`full_name.ilike.%${params.q}%,nik.ilike.%${params.q}%,phone.ilike.%${params.q}%`)
  }

  const { data: jamaahs, count: totalJamaahs } = await jamaahsQuery
    .order('created_at', { ascending: false })
    .range(view === 'jamaahs' ? offset : 0, view === 'jamaahs' ? offset + PAGE_SIZE - 1 : 19)

  const activeCount = view === 'groups' ? (totalGroups ?? 0) : (totalJamaahs ?? 0)
  const totalPages = Math.ceil(activeCount / PAGE_SIZE)

  const GROUP_STATUSES = [
    { value: '', label: 'Semua Status Berkas' },
    { value: 'submitted', label: 'Terkirim' },
    { value: 'under_review', label: 'Dalam Pemeriksaan' },
    { value: 'revision_required', label: 'Perlu Revisi' },
    { value: 'verified', label: 'Terverifikasi' },
    { value: 'ready_for_departure', label: 'Siap Berangkat' },
    { value: 'completed', label: 'Selesai' },
  ]

  const PAYMENT_STATUSES = [
    { value: '', label: 'Semua Status Pembayaran' },
    { value: 'belum_bayar', label: 'Belum Bayar (Daftar Saja)' },
    { value: 'menunggu_verifikasi', label: 'Perlu Cek Bukti Transfer' },
    { value: 'dp', label: 'DP Masuk (Belum Lunas)' },
    { value: 'lunas', label: 'Lunas Sepenuhnya' },
  ]

  let displayedGroups = (groups as Record<string, unknown>[]) || []
  if (params.payment_status) {
    displayedGroups = displayedGroups.filter((g) => {
      const gPayments = (g.payments as any[]) || []
      const jCount = Array.isArray(g._count)
        ? (g._count[0]?.count ?? 1)
        : (((g._count as Record<string, unknown>)?.count as number) ?? 1)
      const pkg = g.package as any
      const pkgPrice = pkg?.price ? Number(pkg.price) : 37200000
      const dpPrice = pkg?.dp_amount ? Number(pkg.dp_amount) : 5000000
      const bill = pkgPrice * jCount
      const minDp = dpPrice * jCount
      const verified = gPayments
        .filter((p) => p.verification_status === 'verified')
        .reduce((sum, p) => sum + Number(p.amount), 0)
      const hasProof = gPayments.some(
        (p) => p.verification_status === 'proof_uploaded' || (p.verification_status === 'pending' && Boolean(p.drive_file_id))
      )

      if (params.payment_status === 'lunas') return verified >= bill && bill > 0
      if (params.payment_status === 'dp') return verified >= minDp && verified < bill
      if (params.payment_status === 'menunggu_verifikasi') return hasProof && verified < bill
      if (params.payment_status === 'belum_bayar') return verified === 0 && !hasProof
      return true
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Pendaftaran & Jamaah</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Kelola data pendaftaran rombongan dan seluruh jamaah terdaftar.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)]">
        <Link
          href={`/admin/pendaftaran?view=groups${params.status ? `&status=${params.status}` : ''}`}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            view === 'groups'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Pendaftaran Kelompok ({totalGroups ?? 0})
        </Link>
        <Link
          href={`/admin/pendaftaran?view=jamaahs`}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            view === 'jamaahs'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Users className="w-4 h-4" />
          Semua Data Jamaah ({totalJamaahs ?? 0})
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <form className="flex items-center gap-2 flex-wrap">
          <input type="hidden" name="view" value={view} />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              name="q"
              defaultValue={params.q}
              placeholder={view === 'groups' ? 'Cari kode...' : 'Cari nama / NIK / no HP...'}
              className="h-8 pl-8 pr-3 text-sm border border-[var(--border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--primary)] w-48 sm:w-64"
            />
          </div>

          {view === 'groups' && (
            <>
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

              <select
                name="payment_status"
                defaultValue={params.payment_status ?? ''}
                className="h-8 px-2.5 text-sm border border-[var(--border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--primary)] bg-white font-medium text-slate-700"
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </>
          )}

          <button
            type="submit"
            className="h-8 px-3 text-sm bg-[var(--primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            Filter
          </button>
          {Boolean(params.q || params.status || params.payment_status) && (
            <Link
              href={`/admin/pendaftaran?view=${view}`}
              className="h-8 px-2.5 text-xs flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Reset
            </Link>
          )}
        </form>
      </div>

      {/* Main Content */}
      {view === 'groups' ? (
        /* TABLE GROUPS */
        <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-sm">
          {!displayedGroups?.length ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[var(--text-muted)]">Tidak ada pendaftaran ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Kode</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">PIC / Kontak</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Jamaah</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Keberangkatan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Status Berkas</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Status Pembayaran</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Tanggal Daftar</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {displayedGroups.map((group: Record<string, unknown>) => (
                    <tr key={group.id as string} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/pendaftaran/${group.id as string}`}
                          className="font-mono font-bold text-[var(--primary)] hover:underline text-sm"
                        >
                          {group.registration_code as string}
                        </Link>
                        <div className="text-[10px] text-[var(--text-muted)] capitalize">
                          {group.type === 'family' ? 'Keluarga' : 'Individu'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const pic = getGroupPic(group as Record<string, unknown>)
                          return (
                            <>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-[var(--text-primary)] font-medium">
                                  {pic.name}
                                </p>
                                {!pic.is_departing && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.2 rounded border border-amber-200">
                                    Tidak Berangkat
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-muted)]">
                                {pic.phone}
                              </p>
                            </>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const count = Array.isArray(group._count)
                            ? (group._count[0]?.count ?? 1)
                            : (((group._count as Record<string, unknown>)?.count as number) ?? 1)
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {count} org
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {((group.departure_point as Record<string, unknown>)?.name as string) ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <GroupStatusBadge status={group.group_status as never} />
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const gPayments = (group.payments as any[]) || []
                          const count = Array.isArray(group._count)
                            ? (group._count[0]?.count ?? 1)
                            : (((group._count as Record<string, unknown>)?.count as number) ?? 1)
                          const pkg = group.package as any
                          const pkgPrice = pkg?.price ? Number(pkg.price) : 37200000
                          const dpPrice = pkg?.dp_amount ? Number(pkg.dp_amount) : 5000000
                          const bill = pkgPrice * count
                          const minDp = dpPrice * count
                          const verified = gPayments
                            .filter((p) => p.verification_status === 'verified')
                            .reduce((sum, p) => sum + Number(p.amount), 0)
                          const hasProof = gPayments.some(
                            (p) => p.verification_status === 'proof_uploaded' || (p.verification_status === 'pending' && Boolean(p.drive_file_id))
                          )

                          if (verified >= bill && bill > 0) {
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Lunas (100%)
                              </span>
                            )
                          }
                          if (verified >= minDp) {
                            return (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                  DP Masuk
                                </span>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  Sisa: {formatCurrency(bill - verified)}
                                </p>
                              </div>
                            )
                          }
                          if (hasProof) {
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                Perlu Cek Bukti
                              </span>
                            )
                          }
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              Belum Bayar (Daftar Saja)
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {formatDate(group.created_at as string)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/admin/pendaftaran/${group.id as string}`}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--primary)] hover:text-white transition-colors"
                          >
                            Kelola & Verifikasi
                          </Link>
                          <DeleteRegistrationButton
                            groupId={group.id as string}
                            registrationCode={group.registration_code as string}
                            picName={getGroupPic(group as Record<string, unknown>).name}
                            variant="icon"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* TABLE ALL JAMAAHS */
        <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-sm">
          {!jamaahs?.length ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[var(--text-muted)]">Tidak ada data jamaah ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Nama Jamaah</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">L/P</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">NIK</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">No. HP</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">No. Paspor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Kebutuhan Khusus</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Kode Rombongan</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {jamaahs.map((j: Record<string, unknown>) => {
                    const group = j.registration_groups as Record<string, unknown>
                    return (
                      <tr key={j.id as string} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[var(--text-primary)]">{j.full_name as string}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {j.birth_date ? formatDate(j.birth_date as string) : '—'} ({j.relationship_to_pic as string || 'PIC'})
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {j.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[var(--text-secondary)]">
                          {j.nik ? maskNik(j.nik as string) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {(j.phone as string) || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[var(--text-secondary)]">
                          {(j.passport_number as string) || 'Belum ada'}
                        </td>
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
                          <Link
                            href={`/admin/pendaftaran/${group?.id as string}`}
                            className="font-mono text-xs font-bold text-[var(--primary)] hover:underline"
                          >
                            {group?.registration_code as string}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/admin/pendaftaran/${group?.id as string}`}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--primary)] hover:text-white transition-colors"
                            >
                              Detail
                            </Link>
                            <DeleteJamaahButton
                              jamaahId={j.id as string}
                              jamaahName={j.full_name as string}
                              variant="icon"
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border border-[var(--border)] bg-white rounded-[var(--radius-lg)] flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            Halaman {page} dari {totalPages} (Total {activeCount} {view === 'groups' ? 'kelompok' : 'jamaah'})
          </p>
          <div className="flex gap-1">
            {page > 1 && (
              <Link
                href={`?view=${view}&page=${page - 1}${params.status ? `&status=${params.status}` : ''}${params.q ? `&q=${params.q}` : ''}`}
                className="px-3 py-1.5 text-xs border border-[var(--border)] rounded hover:bg-[var(--surface)] transition-colors"
              >
                Sebelumnya
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?view=${view}&page=${page + 1}${params.status ? `&status=${params.status}` : ''}${params.q ? `&q=${params.q}` : ''}`}
                className="px-3 py-1.5 text-xs border border-[var(--border)] rounded hover:bg-[var(--surface)] transition-colors"
              >
                Berikutnya
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
