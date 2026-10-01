import { createClient } from '@/lib/supabase/server'
import { GroupStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { Users, ClipboardList, FileText, CreditCard, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

async function getDashboardStats() {
  const supabase = await createClient()

  const [
    { count: totalJamaah },
    { count: totalGroups },
    { count: docsToReview },
    { count: paymentsToVerify },
    { count: readyToDepart },
    { data: recentGroups },
  ] = await Promise.all([
    supabase.from('jamaahs').select('*', { count: 'exact', head: true }),
    supabase
      .from('registration_groups')
      .select('*', { count: 'exact', head: true })
      .neq('group_status', 'cancelled'),
    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'uploaded'),
    supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'proof_uploaded'),
    supabase
      .from('registration_groups')
      .select('*', { count: 'exact', head: true })
      .eq('group_status', 'ready_for_departure'),
    supabase
      .from('registration_groups')
      .select(`
        *,
        departure_point:departure_points(name),
        pic_jamaah:jamaahs!pic_jamaah_id(full_name)
      `)
      .not('group_status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return {
    totalJamaah: totalJamaah ?? 0,
    totalGroups: totalGroups ?? 0,
    docsToReview: docsToReview ?? 0,
    paymentsToVerify: paymentsToVerify ?? 0,
    readyToDepart: readyToDepart ?? 0,
    recentGroups: recentGroups ?? [],
  }
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats()

  const STAT_CARDS = [
    {
      label: 'Total Jamaah',
      value: stats.totalJamaah,
      icon: Users,
      color: 'text-[var(--primary)]',
      bg: 'bg-[var(--primary-light)]',
    },
    {
      label: 'Total Kelompok',
      value: stats.totalGroups,
      icon: ClipboardList,
      color: 'text-[var(--info)]',
      bg: 'bg-[var(--info-light)]',
    },
    {
      label: 'Dokumen Perlu Diperiksa',
      value: stats.docsToReview,
      icon: FileText,
      color: 'text-[var(--warning)]',
      bg: 'bg-[var(--warning-light)]',
      href: '/admin/dokumen?status=uploaded',
    },
    {
      label: 'Pembayaran Perlu Verifikasi',
      value: stats.paymentsToVerify,
      icon: CreditCard,
      color: 'text-[var(--warning)]',
      bg: 'bg-[var(--warning-light)]',
      href: '/admin/pembayaran?status=proof_uploaded',
    },
    {
      label: 'Siap Berangkat',
      value: stats.readyToDepart,
      icon: CheckCircle2,
      color: 'text-[var(--success)]',
      bg: 'bg-[var(--success-light)]',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Ringkasan data pendaftaran jamaah.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {STAT_CARDS.map((card) => {
          const CardWrapper = card.href ? Link : 'div'
          return (
            <CardWrapper
              key={card.label}
              href={card.href as string}
              className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] p-4 space-y-2 hover:border-[var(--primary)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-[var(--radius-sm)] ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{card.value}</p>
              <p className="text-xs text-[var(--text-muted)] leading-tight">{card.label}</p>
            </CardWrapper>
          )
        })}
      </div>

      {/* Recent registrations */}
      <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Pendaftaran Terbaru</p>
          <Link
            href="/admin/pendaftaran"
            className="text-xs text-[var(--primary)] hover:underline"
          >
            Lihat semua
          </Link>
        </div>

        {stats.recentGroups.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-[var(--text-muted)]">Belum ada pendaftaran.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Pendaftaran jamaah akan muncul di halaman ini setelah jamaah mengirim formulir.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)]">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)]">Kode</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)]">PIC</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)]">Keberangkatan</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)]">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)]">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {stats.recentGroups.map((group: Record<string, unknown>) => (
                  <tr key={group.id as string} className="hover:bg-[var(--surface)] transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pendaftaran/${group.id as string}`}
                        className="font-mono text-sm text-[var(--primary)] hover:underline font-medium"
                      >
                        {group.registration_code as string}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      {((group.pic_jamaah as Record<string, unknown>)?.full_name as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {((group.departure_point as Record<string, unknown>)?.name as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <GroupStatusBadge status={group.group_status as string as never} />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                      {formatDate(group.created_at as string)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
