import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { GroupStatusBadge, DocumentStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, formatCurrency, maskNik } from '@/lib/utils'
import {
  UpdateStatusForm,
  DocumentVerificationActions,
  PaymentVerificationActions,
} from '@/components/admin'
import Link from 'next/link'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { DOCUMENT_TYPE_LABELS, DocumentStatus, PaymentStatus } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServiceClient()

  const { data: group, error } = await supabase
    .from('registration_groups')
    .select(`
      *,
      departure_point:departure_points(*),
      package:packages(*),
      pic_jamaah:jamaahs!fk_pic_jamaah(full_name, phone),
      jamaahs:jamaahs!jamaahs_group_id_fkey(*, documents(*)),
      payments(*)
    `)
    .eq('id', id)
    .single()

  if (error || !group) {
    if (error) console.error('[admin/pendaftaran/[id]] fetch error:', error)
    notFound()
  }

  const jamaahs = (group.jamaahs ?? []) as Record<string, unknown>[]
  const payments = (group.payments ?? []) as Record<string, unknown>[]

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back */}
      <Link
        href="/admin/pendaftaran"
        className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors w-fit"
      >
        <ChevronLeft className="w-4 h-4" />
        Kembali ke Pendaftaran
      </Link>

      {/* Header */}
      <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Kode Pendaftaran</p>
            <h1 className="text-2xl font-bold font-mono text-[var(--text-primary)]">
              {group.registration_code}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <GroupStatusBadge status={group.group_status} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-[var(--text-muted)]">PIC</p>
            <p className="font-medium text-[var(--text-primary)]">
              {(group.pic_jamaah as Record<string, unknown>)?.full_name as string ?? '—'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {(group.pic_jamaah as Record<string, unknown>)?.phone as string}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Jenis</p>
            <p className="font-medium text-[var(--text-primary)]">
              {group.type === 'family' ? 'Keluarga' : 'Individu'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Keberangkatan</p>
            <p className="font-medium text-[var(--text-primary)]">
              {(group.departure_point as Record<string, unknown>)?.name as string ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Tanggal Daftar</p>
            <p className="font-medium text-[var(--text-primary)]">
              {formatDate(group.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Update Status */}
      <UpdateStatusForm groupId={id} currentStatus={group.group_status} />

      {/* Jamaah */}
      <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
        <div className="px-5 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Jamaah ({jamaahs.length} orang)
          </p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {jamaahs.map((jamaah) => {
            const docs = (jamaah.documents ?? []) as Record<string, unknown>[]
            return (
              <div key={jamaah.id as string} className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {jamaah.full_name as string}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {jamaah.relationship_to_pic as string} ·{' '}
                      {jamaah.birth_date ? formatDate(jamaah.birth_date as string) : '—'} ·{' '}
                      NIK: {jamaah.nik ? maskNik(jamaah.nik as string) : '—'}
                    </p>
                    {Boolean(jamaah.has_disability) && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-md text-xs font-medium">
                        <span>♿ Kebutuhan Khusus / Disabilitas:</span>
                        <span className="font-semibold">{String(jamaah.disability_description || 'Kursi Roda / Pendampingan')}</span>
                      </div>
                    )}
                    {Boolean(jamaah.medical_history) && (
                      <p className="mt-1 text-xs text-slate-600">
                        <span className="font-medium text-slate-700">Riwayat Penyakit:</span> {String(jamaah.medical_history)}
                      </p>
                    )}
                    {Boolean(jamaah.clothing_size) && (
                      <p className="mt-0.5 text-xs text-slate-600">
                        <span className="font-medium text-slate-700">Ukuran Batik:</span> {String(jamaah.clothing_size)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Documents */}
                {docs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                      Dokumen
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {docs.map((doc) => (
                        <div
                          key={doc.id as string}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[var(--surface)] rounded-[var(--radius-md)] border border-[var(--border)]"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {DOCUMENT_TYPE_LABELS[doc.document_type as keyof typeof DOCUMENT_TYPE_LABELS]}
                              </p>
                              {doc.drive_web_view_url != null && String(doc.drive_web_view_url) && (
                                <a
                                  href={String(doc.drive_web_view_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label="Lihat dokumen di Google Drive"
                                  className="inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Buka File
                                </a>
                              )}
                            </div>
                            {Boolean(doc.file_name) && (
                              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">
                                {String(doc.file_name)}
                              </p>
                            )}
                          </div>

                          <DocumentVerificationActions
                            documentId={doc.id as string}
                            currentStatus={doc.verification_status as DocumentStatus}
                            rejectionReason={doc.rejection_reason as string}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Payments */}
      {payments.length > 0 && (
        <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
          <div className="px-5 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Pembayaran</p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {payments.map((payment) => (
              <div key={payment.id as string} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {payment.payment_type === 'full' ? 'Pembayaran Penuh' : 'Down Payment'}
                  </p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {formatCurrency(payment.amount as number)}
                  </p>
                  {payment.payment_date != null && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Tanggal: {formatDate(String(payment.payment_date))}
                    </p>
                  )}
                  {payment.drive_web_view_url != null && String(payment.drive_web_view_url) && (
                    <a
                      href={String(payment.drive_web_view_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Lihat bukti pembayaran"
                      className="mt-1.5 text-xs text-[var(--primary)] hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Lihat Bukti Transfer
                    </a>
                  )}
                </div>

                <PaymentVerificationActions
                  paymentId={payment.id as string}
                  currentStatus={payment.verification_status as PaymentStatus}
                  verificationNote={payment.verification_note as string}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
