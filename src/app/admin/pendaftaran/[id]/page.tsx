import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { GroupStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge'
import {
  formatDate,
  formatCurrency,
  maskNik,
  getGroupPic,
  calculateAge,
  isKtpRequired,
  normalizePhone,
} from '@/lib/utils'
import {
  UpdateStatusForm,
  DocumentVerificationActions,
  PaymentVerificationActions,
  DeleteRegistrationButton,
  DeleteJamaahButton,
} from '@/components/admin'
import Link from 'next/link'
import {
  ChevronLeft,
  ExternalLink,
  Phone,
  User,
  CreditCard,
  MapPin,
  Plane,
  Calendar,
  FileText,
  ShieldAlert,
  Info,
  CheckCircle,
} from 'lucide-react'
import { DOCUMENT_TYPE_LABELS, DocumentStatus, DocumentType, PaymentStatus } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

const MARITAL_STATUS_LABELS: Record<string, string> = {
  single: 'Belum Menikah',
  married: 'Menikah',
  widowed: 'Duda / Janda',
  divorced: 'Cerai',
}

const PASSPORT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  has_passport: { label: 'Sudah Ada Paspor', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  in_process: { label: 'Sedang Diproses', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  no_passport: { label: 'Belum Ada Paspor', color: 'bg-amber-50 text-amber-800 border-amber-200' },
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
  const pic = getGroupPic(group as Record<string, unknown>)
  const pkg = group.package as Record<string, unknown> | null
  const depPoint = group.departure_point as Record<string, unknown> | null

  // 4 Standard documents to check for every jamaah
  const STANDARD_DOCS: Array<{ type: DocumentType; label: string; desc: string }> = [
    { type: 'ktp', label: 'KTP (Kartu Tanda Penduduk)', desc: 'Wajib bagi jamaah usia >= 17 tahun' },
    { type: 'kk', label: 'KK (Kartu Keluarga)', desc: 'Wajib untuk verifikasi hubungan keluarga' },
    { type: 'paspor', label: 'Paspor RI', desc: 'Scan halaman depan identitas paspor yang jelas' },
    { type: 'vaksin', label: 'Kartu/Sertifikat Vaksin', desc: 'Vaksin meningitis / polio' },
  ]

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      {/* Back Link */}
      <Link
        href="/admin/pendaftaran"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Kembali ke Daftar Pendaftaran
      </Link>

      {/* Header & Quick Summary */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-xs p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                Kode Registrasi Rombongan
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                {group.type === 'family' ? 'Keluarga / Rombongan' : 'Pendaftaran Individu'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--text-primary)] mt-1 tracking-tight">
              {group.registration_code}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <GroupStatusBadge status={group.group_status} />
            <DeleteRegistrationButton
              groupId={id}
              registrationCode={group.registration_code}
              picName={pic.name}
              redirectAfterDelete={true}
              variant="button"
            />
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
          {/* PIC */}
          <div className="p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-medium mb-1">
              <User className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Penanggung Jawab (PIC)</span>
            </div>
            <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
              {pic.name}
            </p>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {pic.phone ? (
                <a
                  href={`https://wa.me/${normalizePhone(pic.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-mono font-medium"
                >
                  <Phone className="w-3 h-3 text-emerald-600" />
                  {pic.phone}
                </a>
              ) : (
                <span className="text-[var(--text-muted)]">—</span>
              )}
              {!pic.is_departing && (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded border border-amber-200">
                  Koordinator
                </span>
              )}
            </div>
          </div>

          {/* Keberangkatan */}
          <div className="p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-medium mb-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Titik Kumpul</span>
            </div>
            <p className="font-semibold text-sm text-[var(--text-primary)]">
              {(depPoint?.name as string) ?? '—'}
            </p>
            <p className="text-[var(--text-muted)] mt-0.5">
              Kode: {(depPoint?.code as string) ?? '—'}
            </p>
          </div>

          {/* Paket */}
          <div className="p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-medium mb-1">
              <CreditCard className="w-3.5 h-3.5 text-amber-600" />
              <span>Paket Umrah</span>
            </div>
            <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
              {(pkg?.name as string) ?? 'Umrah 100 Thn Gontor'}
            </p>
            <p className="text-[var(--text-muted)] mt-0.5">
              {pkg?.price ? formatCurrency(Number(pkg.price)) : '—'} / jamaah
            </p>
          </div>

          {/* Tanggal Daftar */}
          <div className="p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-medium mb-1">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <span>Waktu Pendaftaran</span>
            </div>
            <p className="font-semibold text-sm text-[var(--text-primary)]">
              {formatDate(group.created_at)}
            </p>
            <p className="text-[var(--text-muted)] mt-0.5">
              Total {jamaahs.length} Jamaah Terdaftar
            </p>
          </div>
        </div>
      </div>

      {/* Update Status Rombongan */}
      <UpdateStatusForm groupId={id} currentStatus={group.group_status} />

      {/* DETAIL SELURUH JAMAAH & BERKAS DOKUMEN */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <User className="w-5 h-5 text-[var(--primary)]" />
              Data Lengkap Seluruh Jamaah ({jamaahs.length} Orang)
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Tinjau data diri lengkap dan periksa status berkas dokumen masing-masing jamaah. Berikan instruksi revisi jika ada berkas yang perlu diperbaiki.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {jamaahs.map((jamaah, index) => {
            const docs = (jamaah.documents ?? []) as Record<string, unknown>[]
            const birthDate = jamaah.birth_date ? String(jamaah.birth_date) : ''
            const age = birthDate ? calculateAge(birthDate) : null
            const passportStatusKey = (jamaah.passport_status as string) || 'no_passport'
            const passportStatusInfo = PASSPORT_STATUS_LABELS[passportStatusKey] || PASSPORT_STATUS_LABELS.no_passport

            return (
              <div
                key={jamaah.id as string}
                className="bg-white border border-[var(--border)] rounded-xl shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Header Card Jamaah */}
                <div className="bg-slate-50/80 px-5 py-3.5 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                          {jamaah.full_name as string}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {(jamaah.relationship_to_pic as string) || 'Anggota'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {jamaah.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {jamaah.birth_place as string}, {birthDate ? formatDate(birthDate) : '—'} {age !== null && `(${age} tahun)`}
                      </p>
                    </div>
                  </div>

                  {jamaahs.length > 1 && (
                    <DeleteJamaahButton
                      jamaahId={jamaah.id as string}
                      jamaahName={jamaah.full_name as string}
                      variant="button"
                    />
                  )}
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-5">
                  {/* Grid 1: Identitas Lengkap */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[var(--primary)]" />
                      1. Identitas & Kependudukan
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-[var(--surface)] p-3.5 rounded-lg border border-[var(--border)] text-xs">
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">Nomor NIK</span>
                        <span className="font-mono font-semibold text-[var(--text-primary)] text-xs">
                          {(jamaah.nik as string) || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">Nama Ayah Kandung</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {(jamaah.father_name as string) || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">Status Pernikahan</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {MARITAL_STATUS_LABELS[jamaah.marital_status as string] || (jamaah.marital_status as string) || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">Pekerjaan</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {(jamaah.occupation as string) || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">No. HP / WhatsApp</span>
                        {jamaah.phone ? (
                          <a
                            href={`https://wa.me/${normalizePhone(jamaah.phone as string)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-emerald-700 hover:underline inline-flex items-center gap-1"
                          >
                            <Phone className="w-2.5 h-2.5 text-emerald-600" />
                            {jamaah.phone as string}
                          </a>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">Kewarganegaraan</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {(jamaah.nationality as string) || 'Indonesia'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">Ukuran Seragam Batik</span>
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                          {(jamaah.clothing_size as string) || 'L'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">Kebutuhan Disabilitas</span>
                        {Boolean(jamaah.has_disability) ? (
                          <span className="font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px] inline-flex items-center gap-1">
                            ♿ {String(jamaah.disability_description || 'Kursi Roda')}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">Tidak ada</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grid 2: Paspor & Alamat */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Data Paspor */}
                    <div className="p-3.5 bg-[var(--surface)] rounded-lg border border-[var(--border)] text-xs space-y-2">
                      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
                        <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <Plane className="w-3.5 h-3.5 text-emerald-700" />
                          2. Data Paspor RI
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${passportStatusInfo.color}`}>
                          {passportStatusInfo.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-[var(--text-muted)] block text-[11px]">Nomor Paspor</span>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {(jamaah.passport_number as string) || 'Belum Ada'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block text-[11px]">Kantor Imigrasi Terbit</span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {(jamaah.passport_issue_place as string) || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block text-[11px]">Tanggal Terbit</span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {jamaah.passport_issue_date ? formatDate(jamaah.passport_issue_date as string) : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block text-[11px]">Masa Berlaku</span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {jamaah.passport_expiry_date ? formatDate(jamaah.passport_expiry_date as string) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Data Alamat Domisili */}
                    <div className="p-3.5 bg-[var(--surface)] rounded-lg border border-[var(--border)] text-xs space-y-2">
                      <div className="border-b border-[var(--border)] pb-2 font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        3. Alamat Domisili KTP
                      </div>

                      <div className="space-y-1 pt-1">
                        <p className="font-medium text-[var(--text-primary)]">
                          {(jamaah.address as string) || '—'}
                        </p>
                        <p className="text-[var(--text-muted)] text-[11px]">
                          Desa/Kel. {(jamaah.village as string) || '—'}, Kec. {(jamaah.district as string) || '—'}
                        </p>
                        <p className="text-[var(--text-muted)] text-[11px]">
                          {(jamaah.city as string) || '—'}, Prov. {(jamaah.province as string) || '—'}
                        </p>
                        {Boolean(jamaah.medical_history) && (
                          <div className="mt-2 pt-2 border-t border-[var(--border)] text-[11px]">
                            <span className="font-semibold text-rose-800">Riwayat Penyakit: </span>
                            <span className="text-rose-900">{String(jamaah.medical_history)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grid 3: Berkas Dokumen & Verifikasi */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                      4. Berkas Dokumen & Verifikasi Panitia
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {STANDARD_DOCS.map((docItem) => {
                        const existingDoc = docs.find((d) => d.document_type === docItem.type)
                        const isUploaded = Boolean(existingDoc && existingDoc.verification_status !== 'not_uploaded')
                        const hasFileUrl = Boolean(existingDoc?.drive_web_view_url)

                        return (
                          <div
                            key={docItem.type}
                            className={`p-3.5 rounded-lg border transition-colors ${
                              isUploaded
                                ? 'bg-white border-slate-200'
                                : 'bg-slate-50/70 border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="text-xs font-bold text-[var(--text-primary)]">
                                  {docItem.label}
                                </p>
                                <p className="text-[11px] text-[var(--text-muted)]">
                                  {docItem.desc}
                                </p>
                              </div>

                              {hasFileUrl && (
                                <a
                                  href={String(existingDoc?.drive_web_view_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded shadow-2xs transition-colors shrink-0"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Buka File
                                </a>
                              )}
                            </div>

                            {/* File Name & Verification Actions */}
                            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                              {Boolean(existingDoc?.file_name) && (
                                <p className="text-[11px] text-[var(--text-muted)] font-mono truncate max-w-xs">
                                  📄 {String(existingDoc?.file_name)}
                                </p>
                              )}

                              <DocumentVerificationActions
                                documentId={existingDoc?.id as string}
                                jamaahId={jamaah.id as string}
                                docType={docItem.type}
                                currentStatus={
                                  (existingDoc?.verification_status as DocumentStatus) || 'not_uploaded'
                                }
                                verificationNote={
                                  (existingDoc?.verification_note as string) || null
                                }
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pembayaran */}
      {payments.length > 0 && (
        <div className="bg-white border border-[var(--border)] rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              Bukti Pembayaran & Verifikasi Keuangan
            </h3>
            <span className="text-xs text-[var(--text-muted)]">
              {payments.length} transaksi tercatat
            </span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {payments.map((payment) => (
              <div
                key={payment.id as string}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                      {payment.payment_type === 'full' ? 'Pelunasan Penuh' : 'Down Payment (DP)'}
                    </span>
                    <PaymentStatusBadge status={payment.verification_status as PaymentStatus} />
                  </div>
                  <p className="text-xl font-extrabold text-[var(--text-primary)] mt-1 font-mono">
                    {formatCurrency(payment.amount as number)}
                  </p>
                  {payment.payment_date != null && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Tanggal Bayar: {formatDate(String(payment.payment_date))}
                    </p>
                  )}
                  {payment.drive_web_view_url != null && String(payment.drive_web_view_url) && (
                    <a
                      href={String(payment.drive_web_view_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 text-xs text-[var(--primary)] hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Lihat Bukti Transfer di Google Drive
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
