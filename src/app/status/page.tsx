'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { RegistrationGroup, Jamaah, Document, Payment, DocumentType } from '@/types'
import { GroupStatusBadge, DocumentStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { formatDate, formatCurrency, isKtpRequired } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { FileUpload } from '@/components/ui/FileUpload'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  FileText,
  X,
  Check,
  Upload,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import Link from 'next/link'

function StatusContent() {
  const searchParams = useSearchParams()
  const [kode, setKode] = useState(searchParams.get('kode') ?? '')
  const [inputKode, setInputKode] = useState(searchParams.get('kode') ?? '')
  const [loading, setLoading] = useState(false)
  const [group, setGroup] = useState<RegistrationGroup | null>(null)
  const [jamaahs, setJamaahs] = useState<Jamaah[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [error, setError] = useState<string | null>(null)

  // Passport modal state
  const [passportModalJamaah, setPassportModalJamaah] = useState<Jamaah | null>(null)
  const [passportNumber, setPassportNumber] = useState('')
  const [passportPlace, setPassportPlace] = useState('')
  const [passportIssueDate, setPassportIssueDate] = useState('')
  const [passportExpiryDate, setPassportExpiryDate] = useState('')
  const [passportScanFile, setPassportScanFile] = useState<File | null>(null)
  const [savingPassport, setSavingPassport] = useState(false)
  const [passportSuccessMsg, setPassportSuccessMsg] = useState<string | null>(null)
  const [passportErrorMsg, setPassportErrorMsg] = useState<string | null>(null)

  // Quick document upload state
  const [uploadingDocKey, setUploadingDocKey] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentUploadTarget, setCurrentUploadTarget] = useState<{
    jamaahId: string
    docType: DocumentType
    paymentId?: string
  } | null>(null)

  useEffect(() => {
    if (kode) fetchStatus(kode)
  }, [kode]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchStatus(code: string) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/status?code=${encodeURIComponent(code.trim().toUpperCase())}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Kode pendaftaran tidak ditemukan. Periksa kembali kode yang Anda masukkan.')
        setGroup(null)
        setJamaahs([])
        setPayments([])
        setLoading(false)
        return
      }

      setGroup(data.group as RegistrationGroup)
      setJamaahs((data.jamaahs ?? []) as Jamaah[])
      setPayments((data.payments ?? []) as Payment[])
    } catch (err) {
      console.error('Fetch status error:', err)
      setError('Terjadi kendala saat memeriksa status pendaftaran.')
      setGroup(null)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (inputKode.trim()) setKode(inputKode.trim())
  }

  function openPassportModal(j: Jamaah) {
    setPassportModalJamaah(j)
    setPassportNumber(j.passport_number || '')
    setPassportPlace(j.passport_issue_place || '')
    setPassportIssueDate(j.passport_issue_date || '')
    setPassportExpiryDate(j.passport_expiry_date || '')
    setPassportScanFile(null)
    setPassportSuccessMsg(null)
    setPassportErrorMsg(null)
  }

  async function handleSavePassport(e: React.FormEvent) {
    e.preventDefault()
    if (!passportModalJamaah || !group) return

    setSavingPassport(true)
    setPassportErrorMsg(null)
    setPassportSuccessMsg(null)

    try {
      // 1. Upload scan paspor if attached
      if (passportScanFile) {
        const formData = new FormData()
        formData.append('file', passportScanFile)
        formData.append('jamaahId', passportModalJamaah.id)
        formData.append('docType', 'paspor')

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          const uErr = await uploadRes.json().catch(() => ({}))
          console.warn('[upload] scan paspor failed:', uErr)
        }
      }

      // 2. Update passport text data
      const res = await fetch('/api/registration/update-passport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_code: group.registration_code,
          jamaah_id: passportModalJamaah.id,
          passport_number: passportNumber,
          passport_issue_place: passportPlace,
          passport_issue_date: passportIssueDate,
          passport_expiry_date: passportExpiryDate,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan data paspor.')
      }

      setPassportSuccessMsg('Data paspor berhasil diperbarui!')
      setTimeout(() => {
        setPassportModalJamaah(null)
        if (kode) fetchStatus(kode)
      }, 1200)
    } catch (err) {
      setPassportErrorMsg(err instanceof Error ? err.message : 'Terjadi kendala saat menyimpan paspor.')
    } finally {
      setSavingPassport(false)
    }
  }

  function triggerDocumentUpload(jamaahId: string, docType: DocumentType, paymentId?: string) {
    setCurrentUploadTarget({ jamaahId, docType, paymentId })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  async function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUploadTarget) return

    const { jamaahId, docType, paymentId } = currentUploadTarget
    const targetKey = `${jamaahId}-${docType}`
    setUploadingDocKey(targetKey)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('jamaahId', jamaahId)
      formData.append('docType', docType)
      if (paymentId) formData.append('paymentId', paymentId)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Gagal mengunggah dokumen.')
        return
      }

      // Refresh status data
      if (kode) await fetchStatus(kode)
    } catch (err) {
      console.error('Quick upload error:', err)
      alert('Terjadi kesalahan koneksi saat mengunggah file.')
    } finally {
      setUploadingDocKey(null)
      setCurrentUploadTarget(null)
    }
  }

  const TIMELINE = [
    { label: 'Data Pendaftaran', key: 'data' },
    { label: 'Dokumen', key: 'dokumen' },
    { label: 'Pembayaran', key: 'pembayaran' },
    { label: 'Verifikasi', key: 'verifikasi' },
    { label: 'Selesai', key: 'selesai' },
  ]

  function getTimelineStep(status: string): number {
    const map: Record<string, number> = {
      draft: 0,
      submitted: 1,
      under_review: 2,
      revision_required: 1,
      documents_incomplete: 1,
      payment_pending: 2,
      verified: 3,
      ready_for_departure: 4,
      completed: 5,
      cancelled: 0,
    }
    return map[status] ?? 0
  }

  const isRevisionRequired = group?.group_status === 'revision_required'

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Hidden file input for quick upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
      />

      {/* Header */}
      <header className="bg-white border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--text-primary)]"
          >
            Umrah 100 Tahun Gontor
          </Link>
          <Link
            href="/daftar"
            className="text-xs text-[var(--primary)] font-medium hover:underline"
          >
            Form Pendaftaran
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Cek Status Pendaftaran
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Pantau status pendaftaran, perbaiki berkas revisi, dan lengkapi paspor jamaah Anda.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={inputKode}
                onChange={(e) => setInputKode(e.target.value.toUpperCase())}
                placeholder="Masukkan Kode Pendaftaran (contoh: UMR-2026-0003)"
                className="w-full h-11 pl-9 pr-3 rounded-[var(--radius-md)] border border-slate-300 bg-white text-sm text-slate-900 font-mono font-medium placeholder:text-slate-400 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 shadow-xs uppercase"
              />
            </div>
            <Button type="submit" disabled={loading} size="lg">
              {loading ? 'Memeriksa...' : 'Cari'}
            </Button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-[var(--radius-lg)] flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">{error}</p>
              <p className="text-xs text-red-700 mt-0.5">
                Pastikan kode pendaftaran yang dimasukkan sesuai dengan bukti yang Anda terima saat mendaftar.
              </p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* Result */}
        {!loading && group && (
          <div className="space-y-5 animate-fade-in">
            {/* ALERT JIKA BUTUH REVISI */}
            {isRevisionRequired && (
              <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-[var(--radius-lg)] shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="p-2 bg-amber-100 rounded-full text-amber-700 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-amber-900">
                      Pendaftaran Memerlukan Revisi / Perbaikan Berkas
                    </h2>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Panitia telah memeriksa berkas Anda dan meminta perbaikan data atau unggahan dokumen.
                      Silakan periksa tombol <strong>Unggah Revisi</strong> pada daftar berkas di bawah ini.
                    </p>
                    {Boolean(group.notes) && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200 text-xs text-slate-800">
                        <span className="font-semibold text-amber-900 block mb-0.5">Catatan dari Panitia:</span>
                        {group.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Card info pendaftaran */}
            <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Kode Pendaftaran</p>
                  <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                    {group.registration_code}
                  </p>
                </div>
                <GroupStatusBadge status={group.group_status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-t border-[var(--border)] pt-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Jenis Pendaftaran</p>
                  <p className="font-semibold text-[var(--text-primary)] capitalize">
                    {group.type === 'family' ? 'Keluarga' : 'Individu'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Jumlah Jamaah</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {jamaahs.length} Orang
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Tanggal Daftar</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {formatDate(group.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Status Berkas</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {group.group_status === 'verified'
                      ? 'Terverifikasi'
                      : isRevisionRequired
                      ? 'Perlu Revisi'
                      : 'Dalam Proses'}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-xs">
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                Tahapan Pendaftaran
              </p>
              <div className="flex items-center justify-between">
                {TIMELINE.map((step, index) => {
                  const currentStepIndex = getTimelineStep(group.group_status)
                  const isDone = index < currentStepIndex
                  const isActive = index === currentStepIndex

                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center relative">
                      {index > 0 && (
                        <div
                          className={`absolute top-3.5 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                            index <= currentStepIndex ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                          }`}
                        />
                      )}
                      <div className="relative z-10">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            isDone
                              ? 'bg-[var(--primary)]'
                              : isActive
                              ? isRevisionRequired
                                ? 'border-2 border-amber-500 bg-white'
                                : 'border-2 border-[var(--primary)] bg-white'
                              : 'border-2 border-[var(--border)] bg-white'
                          }`}
                        >
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          {isActive && (
                            isRevisionRequired ? (
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                            ) : (
                              <Clock className="w-3 h-3 text-[var(--primary)]" />
                            )
                          )}
                        </div>
                      </div>
                      <p
                        className={`text-xs mt-2 text-center ${
                          isActive
                            ? isRevisionRequired
                              ? 'text-amber-600 font-bold'
                              : 'text-[var(--primary)] font-semibold'
                            : isDone
                            ? 'text-[var(--text-secondary)]'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Jamaah & Document Management */}
            {jamaahs.length > 0 && (
              <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Data Jamaah & Kelengkapan Berkas
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Unggah berkas yang kurang atau perbaiki dokumen yang membutuhkan revisi.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-[var(--border)]">
                  {jamaahs.map((jamaah, index) => {
                    const docs = (jamaah as Jamaah & { documents?: Document[] }).documents ?? []
                    const ktpRequired = jamaah.birth_date ? isKtpRequired(jamaah.birth_date) : true

                    // Required documents for this jamaah
                    const requiredDocTypes: Array<{
                      type: DocumentType
                      label: string
                      required: boolean
                    }> = [
                      { type: 'ktp', label: 'KTP Asli', required: ktpRequired },
                      { type: 'kk', label: 'Kartu Keluarga (KK)', required: true },
                      { type: 'vaksin', label: 'Buku / Sertifikat Vaksin', required: false },
                      { type: 'paspor', label: 'Paspor', required: false },
                    ]

                    const hasPassportNumber = Boolean(jamaah.passport_number)

                    return (
                      <div key={jamaah.id} className="p-5 space-y-4">
                        {/* Member Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <p className="text-base font-bold text-slate-900">{jamaah.full_name}</p>
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {jamaah.relationship_to_pic || 'PIC'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 mt-1">
                              NIK: {jamaah.nik || '—'} · Tgl Lahir: {jamaah.birth_date ? formatDate(jamaah.birth_date) : '—'}
                            </p>

                            {Boolean(jamaah.has_disability) && (
                              <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                                <span>♿ Kebutuhan Khusus: {jamaah.disability_description || 'Kursi Roda'}</span>
                              </div>
                            )}
                          </div>

                          {/* Tombol Paspor */}
                          <div>
                            <button
                              type="button"
                              onClick={() => openPassportModal(jamaah)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md hover:bg-emerald-600 hover:text-white transition-colors shadow-xs"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {hasPassportNumber ? 'Edit Data Paspor' : 'Lengkapi Paspor'}
                            </button>
                          </div>
                        </div>

                        {/* Document Slots Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {requiredDocTypes.map(({ type, label, required }) => {
                            const foundDoc = docs.find((d) => d.document_type === type)
                            const isUploadingThis = uploadingDocKey === `${jamaah.id}-${type}`
                            const status = foundDoc?.verification_status || 'not_uploaded'
                            const isNeedRevision = status === 'revision_required'

                            return (
                              <div
                                key={type}
                                className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                                  isNeedRevision
                                    ? 'bg-amber-50/60 border-amber-300'
                                    : foundDoc
                                    ? 'bg-white border-slate-200'
                                    : 'bg-slate-50 border-dashed border-slate-300'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-semibold text-slate-800">
                                      {label} {required && <span className="text-red-500">*</span>}
                                    </p>
                                    <div className="mt-1">
                                      {foundDoc ? (
                                        <DocumentStatusBadge status={status as never} />
                                      ) : (
                                        <span className="text-[11px] text-slate-500">
                                          Belum Diunggah
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                    {foundDoc?.drive_web_view_url && (
                                      <a
                                        href={foundDoc.drive_web_view_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 text-emerald-700 hover:bg-emerald-50 rounded inline-flex items-center gap-0.5"
                                        title="Buka dokumen"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}

                                    {/* Upload / Re-upload Button */}
                                    <button
                                      type="button"
                                      disabled={isUploadingThis}
                                      onClick={() => triggerDocumentUpload(jamaah.id, type)}
                                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors inline-flex items-center gap-1 ${
                                        isNeedRevision
                                          ? 'bg-amber-600 text-white hover:bg-amber-700'
                                          : foundDoc
                                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                      }`}
                                    >
                                      {isUploadingThis ? (
                                        <>
                                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                          Mengunggah...
                                        </>
                                      ) : isNeedRevision ? (
                                        <>
                                          <RotateCcw className="w-3 h-3" />
                                          Unggah Revisi
                                        </>
                                      ) : foundDoc ? (
                                        'Ganti File'
                                      ) : (
                                        <>
                                          <Upload className="w-3 h-3" />
                                          Unggah Berkas
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Rejection note if revision required */}
                                {isNeedRevision && foundDoc?.verification_note && (
                                  <div className="p-2 bg-white rounded border border-amber-200 text-[11px] text-amber-900 font-medium">
                                    Catatan Revisi: {foundDoc.verification_note}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Payment Section */}
            {payments.length > 0 && (
              <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Informasi Pembayaran</p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {payments.map((payment) => {
                    const isUploadingProof = uploadingDocKey === `${jamaahs[0]?.id}-bukti_bayar`
                    return (
                      <div key={payment.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {payment.payment_type === 'full' ? 'Pembayaran Penuh' : 'Down Payment (DP)'}
                          </p>
                          <p className="text-lg font-bold text-slate-900 mt-0.5">
                            {formatCurrency(payment.amount)}
                          </p>
                          {payment.payment_date && (
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              Tanggal Transfer: {formatDate(payment.payment_date)}
                            </p>
                          )}
                          <div className="mt-2">
                            <PaymentStatusBadge status={payment.verification_status} />
                          </div>
                        </div>

                        {/* Action Bukti Transfer */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {payment.drive_web_view_url && (
                            <a
                              href={payment.drive_web_view_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Lihat Bukti Transfer
                            </a>
                          )}

                          {payment.verification_status !== 'verified' && (
                            <button
                              type="button"
                              disabled={isUploadingProof}
                              onClick={() => triggerDocumentUpload(jamaahs[0]?.id, 'bukti_bayar', payment.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 transition-colors inline-flex items-center gap-1.5 shadow-xs"
                            >
                              {isUploadingProof ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Mengunggah...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5" />
                                  {payment.drive_web_view_url ? 'Ganti Bukti Transfer' : 'Unggah Bukti Transfer'}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Lengkapi Paspor */}
        {passportModalJamaah && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Lengkapi Data Paspor
                  </h3>
                  <p className="text-xs text-slate-500">
                    {passportModalJamaah.full_name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPassportModalJamaah(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePassport} className="p-6 space-y-4">
                {passportSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    {passportSuccessMsg}
                  </div>
                )}

                {passportErrorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    {passportErrorMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Nomor Paspor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                    placeholder="Contoh: A 1234567"
                    className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-mono font-medium focus:border-emerald-700 focus:outline-none uppercase shadow-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Tempat Penerbitan (Kantor Imigrasi)
                  </label>
                  <input
                    type="text"
                    value={passportPlace}
                    onChange={(e) => setPassportPlace(e.target.value)}
                    placeholder="Contoh: Jakarta Selatan, Surabaya, Madiun"
                    className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Tanggal Dikeluarkan
                    </label>
                    <input
                      type="date"
                      value={passportIssueDate}
                      onChange={(e) => setPassportIssueDate(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Masa Berlaku Paspor
                    </label>
                    <input
                      type="date"
                      value={passportExpiryDate}
                      onChange={(e) => setPassportExpiryDate(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Unggah Scan / Foto Paspor (Opsional)
                  </label>
                  <FileUpload
                    id="passport-upload"
                    currentFileName={passportScanFile?.name}
                    onFileSelect={async (file) => {
                      setPassportScanFile(file)
                    }}
                  />
                  <p className="text-[11px] text-slate-500">
                    Format: JPG, PNG, atau PDF (maks 10MB). Pastikan halaman identitas terbaca jelas.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPassportModalJamaah(null)}
                    disabled={savingPassport}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingPassport || !passportNumber.trim()}
                    isLoading={savingPassport}
                  >
                    Simpan Data Paspor
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function StatusPage() {
  return (
    <Suspense>
      <StatusContent />
    </Suspense>
  )
}
