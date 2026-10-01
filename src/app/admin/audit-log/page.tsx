import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

const PAGE_SIZE = 50

export default async function AuditLogPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  const { data: logs, count } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Audit Log</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Riwayat aktivitas sistem.
        </p>
      </div>

      <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
        {!logs?.length ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[var(--text-muted)]">Belum ada log aktivitas.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {logs.map((log: Record<string, unknown>) => (
              <div key={log.id as string} className="px-5 py-3 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[var(--text-primary)] font-mono">
                      {log.action as string}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-muted)] px-1.5 py-0.5 rounded">
                      {log.entity_type as string}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {log.actor_type as string}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Entity: {log.entity_id as string}
                  </p>
                </div>
                <p className="text-xs text-[var(--text-muted)] flex-shrink-0">
                  {formatDate(log.created_at as string)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
