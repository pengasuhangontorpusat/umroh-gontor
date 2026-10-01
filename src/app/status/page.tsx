'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  RegistrationGroup,
  Jamaah,
  Document,
  Payment,
  DocumentType,
  MaritalStatus,
} from '@/types'
import {
  GroupStatusBadge,
  DocumentStatusBadge,
  PaymentStatusBadge,
} from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import {
  formatDate,
  formatDateShort,
  formatCurrency,
  isKtpRequired,
  calculateAge,
} from '@/lib/utils'
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
  Copy,
  Edit3,
  User,
  Phone,
  MapPin,
  HeartPulse,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import Link from 'next/link'

const MARITAL_STATUS_LABELS: Record<string, string> = {
  single: 'Belum Menikah',
  married: 'Menikah',
  widowed: 'Duda / Janda',
  divorced: 'Cerai',
}

const CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']

function StatusContent() {
  const searchParams = useSearchParams()
  const [kode, setKode] = useState(searchParams.get('kode') ?? '')
  const [inputKode, setInputKode] = useState(searchParams.get('kode') ?? '')
  const [loading, setLoading] = useState(false)
  const [group, setGroup] = useState<RegistrationGroup | null>(null)
  const [jamaahs, setJamaahs] = useState<Jamaah[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  // Accordion state for jamaahs (expanded by default)
  const [expandedJamaahs, setExpandedJamaahs] = useState<Record<string, boolean>>({})

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

  // Edit Jamaah profile modal state
  const [editJamaahModal, setEditJamaahModal] = useState<Jamaah | null>(null)
  const [editForm, setEditForm] = useState({
    full_name: '',
    father_name: '',
    nik: '',
    gender: 'male' as 'male' | 'female',
    birth_place: '',
    birth_date: '',
    marital_status: 'single' as MaritalStatus,
    occupation: '',
    phone: '',
    address: '',
    province: '',
    city: '',
    district: '',
    village: '',
    clothing_size: 'L',
    has_disability: false,
    disability_description: '',
    medical_history: '',
  })
  const [savingJamaah, setSavingJamaah] = useState(false)
  const [editJamaahSuccessMsg, setEditJamaahSuccessMsg] = useState<string | null>(null)
  const [editJamaahErrorMsg, setEditJamaahErrorMsg] = useState<string | null>(null)

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

      const fetchedGroup = data.group as RegistrationGroup
      const fetchedJamaahs = (data.jamaahs ?? []) as Jamaah[]
      setGroup(fetchedGroup)
      setJamaahs(fetchedJamaahs)
      setPayments((data.payments ?? []) as Payment[])

      // Expand all jamaahs by default so user sees everything clearly
      const initialExpanded: Record<string, boolean> = {}
      fetchedJamaahs.forEach((j) => {
        initialExpanded[j.id] = true
      })
      setExpandedJamaahs(initialExpanded)
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

  function copyRegistrationCode() {
    if (!group) return
    navigator.clipboard.writeText(group.registration_code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  function toggleJamaahExpand(id: string) {
    setExpandedJamaahs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // --- PASSPORT MODAL HANDLERS ---
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
          console.warn('[upload] scan paspor warning:', uErr)
        }
      }

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
      }, 1000)
    } catch (err) {
      setPassportErrorMsg(err instanceof Error ? err.message : 'Terjadi kendala saat menyimpan paspor.')
    } finally {
      setSavingPassport(false)
    }
  }

  // --- EDIT JAMAAH PROFILE MODAL HANDLERS ---
  function openEditJamaahModal(j: Jamaah) {
    setEditJamaahModal(j)
    setEditForm({
      full_name: j.full_name || '',
      father_name: j.father_name || '',
      nik: j.nik || '',
      gender: (j.gender as 'male' | 'female') || 'male',
      birth_place: j.birth_place || '',
      birth_date: j.birth_date ? j.birth_date.split('T')[0] : '',
      marital_status: (j.marital_status as MaritalStatus) || 'single',
      occupation: j.occupation || '',
      phone: j.phone || '',
      address: j.address || '',
      province: j.province || '',
      city: j.city || '',
      district: j.district || '',
      village: j.village || '',
      clothing_size: j.clothing_size || 'L',
      has_disability: Boolean(j.has_disability),
      disability_description: j.disability_description || '',
      medical_history: j.medical_history || '',
    })
    setEditJamaahSuccessMsg(null)
    setEditJamaahErrorMsg(null)
  }

  async function handleSaveJamaah(e: React.FormEvent) {
    e.preventDefault()
    if (!editJamaahModal || !group) return

    setSavingJamaah(true)
    setEditJamaahErrorMsg(null)
    setEditJamaahSuccessMsg(null)

    try {
      const res = await fetch('/api/registration/update-jamaah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_code: group.registration_code,
          jamaah_id: editJamaahModal.id,
          ...editForm,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui data jamaah.')
      }

      setEditJamaahSuccessMsg('Data jamaah berhasil diperbarui!')
      setTimeout(() => {
        setEditJamaahModal(null)
        if (kode) fetchStatus(kode)
      }, 1000)
    } catch (err) {
      setEditJamaahErrorMsg(err instanceof Error ? err.message : 'Terjadi kendala saat memperbarui data.')
    } finally {
      setSavingJamaah(false)
    }
  }

  // --- QUICK DOCUMENT UPLOAD HANDLERS ---
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
    <div className="min-h-screen bg-[var(--surface)] pb-12">
      {/* Hidden file input for quick upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
      />

      {/* Header */}
      <header className="bg-white border-b border-[var(--border)] sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--text-primary)] hover:text-emerald-700 transition-colors"
          >
            ← Kembali ke Beranda
          </Link>
          <div className="text-right">
            <span className="text-xs text-[var(--text-muted)]">Portal Pendaftaran Umrah</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Cek Status & Kelengkapan Berkas
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Pantau status pendaftaran, verifikasi dokumen, dan lengkapi data jamaah umrah Anda di sini.
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={inputKode}
              onChange={(e) => setInputKode(e.target.value.toUpperCase())}
              placeholder="Masukkan kode pendaftaran (contoh: U100-2026-XXXX)"
              className="w-full h-11 pl-10 pr-4 text-sm font-mono rounded-[var(--radius-md)] border border-[var(--border)] bg-white text-[var(--text-primary)] uppercase focus:outline-none focus:border-emerald-700 shadow-xs"
            />
          </div>
          <Button type="submit" size="md" isLoading={loading}>
            Cek Status
          </Button>
        </form>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-[var(--danger-light)] border border-red-200 rounded-[var(--radius-lg)] text-xs text-[var(--danger)] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Pencarian Gagal</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-[var(--radius-lg)]" />
            <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
            <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
          </div>
        )}

        {/* Group data */}
        {!loading && group && (
          <div className="space-y-6">
            {/* Banner Butuh Revisi */}
            {isRevisionRequired && (
              <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-amber-900">
                      Pendaftaran Membutuhkan Perbaikan / Revisi
                    </h3>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Panitia telah memeriksa pendaftaran Anda. Silakan periksa catatan revisi di bawah,
                      lalu klik tombol <strong>Unggah Revisi</strong> atau <strong>Edit Data Diri</strong> pada jamaah terkait.
                    </p>
                    {Boolean(group.notes) && (
                      <div className="mt-2.5 p-3 bg-white rounded-lg border border-amber-300 text-xs text-slate-800">
                        <span className="font-bold text-amber-900 block mb-0.5">Catatan Khusus Panitia:</span>
                        {group.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Card info rombongan */}
            <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <span className="text-xs text-[var(--text-muted)] font-medium">Nomor Pendaftaran</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                      {group.registration_code}
                    </p>
                    <button
                      type="button"
                      onClick={copyRegistrationCode}
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-md transition-colors inline-flex items-center gap-1 text-xs"
                      title="Salin Kode Pendaftaran"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-[11px] text-emerald-700 font-semibold">Tersalin!</span>
                        </>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GroupStatusBadge status={group.group_status} />
                </div>
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
                  <p className="text-xs text-[var(--text-muted)]">Status Verifikasi</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {group.group_status === 'verified'
                      ? 'Terverifikasi Lengkap'
                      : isRevisionRequired
                      ? 'Perlu Revisi'
                      : 'Dalam Peninjauan'}
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

            {/* DAFTAR & DETAIL LENGKAP SETIAP JAMAAH */}
            {jamaahs.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Data Lengkap Jamaah & Dokumen Persyaratan
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Rincian identitas dan berkas setiap anggota keluarga/rombongan yang terdaftar.
                    </p>
                  </div>
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                    {jamaahs.length} Jamaah Terdaftar
                  </span>
                </div>

                <div className="space-y-4">
                  {jamaahs.map((jamaah, index) => {
                    const docs = (jamaah as Jamaah & { documents?: Document[] }).documents ?? []
                    const isPic = index === 0 || jamaah.relationship_to_pic === 'self' || !jamaah.relationship_to_pic
                    const isExpanded = expandedJamaahs[jamaah.id] ?? true
                    const ktpRequired = jamaah.birth_date ? isKtpRequired(jamaah.birth_date) : true

                    const requiredDocTypes: Array<{
                      type: DocumentType
                      label: string
                      required: boolean
                      desc: string
                    }> = [
                      {
                        type: 'ktp',
                        label: 'KTP Asli',
                        required: ktpRequired,
                        desc: ktpRequired ? 'Wajib (usia 17 tahun ke atas)' : 'Tidak wajib (di bawah 17 th)',
                      },
                      {
                        type: 'kk',
                        label: 'Kartu Keluarga (KK)',
                        required: true,
                        desc: 'Wajib untuk seluruh anggota keluarga',
                      },
                      {
                        type: 'vaksin',
                        label: 'Buku Vaksin Meningitis',
                        required: false,
                        desc: 'Buku kuning atau sertifikat vaksin meningitis',
                      },
                      {
                        type: 'paspor',
                        label: 'Paspor Asli / Scan',
                        required: false,
                        desc: jamaah.passport_status === 'no_passport'
                          ? 'Dapat menyusul / dibantu pengurusan'
                          : 'Halaman identitas paspor yang masih berlaku',
                      },
                    ]

                    const uploadedDocsCount = docs.filter(
                      (d) => d.verification_status && d.verification_status !== 'not_uploaded'
                    ).length

                    return (
                      <div
                        key={jamaah.id}
                        className="bg-white border border-[var(--border)] rounded-xl overflow-hidden shadow-xs"
                      >
                        {/* Member Header Card */}
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-white border-b border-[var(--border)]">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="w-7 h-7 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base font-bold text-slate-900">
                                    {jamaah.full_name}
                                  </h3>
                                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                    {isPic ? 'PIC (Penanggung Jawab)' : jamaah.relationship_to_pic || 'Anggota'}
                                  </span>
                                  <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                    {jamaah.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                                  </span>
                                </div>

                                <p className="text-xs text-slate-500 mt-1">
                                  NIK: <span className="font-mono font-medium text-slate-700">{jamaah.nik || '—'}</span>
                                  {' · '}
                                  Usia: {jamaah.birth_date ? `${calculateAge(jamaah.birth_date)} Tahun` : '—'}
                                  {' · '}
                                  Berkas: <span className="font-medium text-emerald-700">{uploadedDocsCount}/4 Terunggah</span>
                                </p>
                              </div>
                            </div>

                            {/* Action Header Buttons */}
                            <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => openEditJamaahModal(jamaah)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-xs"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                                Edit Data Diri
                              </button>

                              <button
                                type="button"
                                onClick={() => openPassportModal(jamaah)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md hover:bg-emerald-600 hover:text-white transition-colors shadow-xs"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {jamaah.passport_number ? 'Edit Paspor' : 'Lengkapi Paspor'}
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleJamaahExpand(jamaah.id)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
                                title={isExpanded ? 'Tutup Detail' : 'Buka Detail'}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Content */}
                        {isExpanded && (
                          <div className="p-5 space-y-6">
                            {/* Grid 3 Kolom: Data Pribadi, Kontak, Paspor & Kesehatan */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Kolom 1: Data Identitas */}
                              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b border-slate-200 pb-1.5">
                                  <User className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Data Kependudukan</span>
                                </div>
                                <div className="space-y-1 text-slate-600">
                                  <p>
                                    <span className="text-slate-400 block text-[10px]">Nama Ayah Kandung:</span>
                                    <span className="font-medium text-slate-800">{jamaah.father_name || '—'}</span>
                                  </p>
                                  <p>
                                    <span className="text-slate-400 block text-[10px]">Tempat, Tgl Lahir:</span>
                                    <span className="font-medium text-slate-800">
                                      {jamaah.birth_place || '—'}, {jamaah.birth_date ? formatDate(jamaah.birth_date) : '—'}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="text-slate-400 block text-[10px]">Status Pernikahan / Pekerjaan:</span>
                                    <span className="font-medium text-slate-800">
                                      {jamaah.marital_status ? MARITAL_STATUS_LABELS[jamaah.marital_status] || jamaah.marital_status : '—'}
                                      {' / '}
                                      {jamaah.occupation || '—'}
                                    </span>
                                  </p>
                                </div>
                              </div>

                              {/* Kolom 2: Kontak & Domisili */}
                              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b border-slate-200 pb-1.5">
                                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Kontak & Domisili</span>
                                </div>
                                <div className="space-y-1 text-slate-600">
                                  <p>
                                    <span className="text-slate-400 block text-[10px]">Nomor HP / WhatsApp:</span>
                                    <span className="font-medium text-slate-800 font-mono">{jamaah.phone || '—'}</span>
                                  </p>
                                  <p>
                                    <span className="text-slate-400 block text-[10px]">Alamat Lengkap:</span>
                                    <span className="font-medium text-slate-800">
                                      {jamaah.address || '—'}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="text-slate-400 block text-[10px]">Wilayah:</span>
                                    <span className="font-medium text-slate-800">
                                      {[jamaah.village, jamaah.district, jamaah.city, jamaah.province]
                                        .filter(Boolean)
                                        .join(', ') || '—'}
                                    </span>
                                  </p>
                                </div>
                              </div>

                              {/* Kolom 3: Paspor & Kesehatan */}
                              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b border-slate-200 pb-1.5">
                                  <HeartPulse className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Paspor & Kesehatan</span>
                                </div>
                                <div className="space-y-1 text-slate-600">
                                  <p>
                                    <span className="text-slate-400 block text-[10px]">Status & Nomor Paspor:</span>
                                    <span className="font-mono font-bold text-slate-900">
                                      {jamaah.passport_number ? jamaah.passport_number : 'Belum Ada Paspor'}
                                    </span>
                                    {jamaah.passport_expiry_date && (
                                      <span className="block text-[11px] text-slate-500">
                                        Exp: {formatDateShort(jamaah.passport_expiry_date)}
                                      </span>
                                    )}
                                  </p>
                                  <p>
                                    <span className="text-slate-400 block text-[10px]">Ukuran Baju Seragam:</span>
                                    <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                      {jamaah.clothing_size || 'L'}
                                    </span>
                                  </p>
                                  {Boolean(jamaah.has_disability) ? (
                                    <div className="pt-1 text-[11px] text-amber-900 font-medium">
                                      ♿ Kebutuhan Khusus: {jamaah.disability_description || 'Kursi Roda'}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-slate-500">Kebutuhan Khusus: Tidak ada</p>
                                  )}
                                  {Boolean(jamaah.medical_history) && (
                                    <p className="text-[11px] text-slate-600">
                                      Medis: {jamaah.medical_history}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Kelengkapan Dokumen Slots */}
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                Berkas Persyaratan ({uploadedDocsCount}/4)
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {requiredDocTypes.map(({ type, label, required, desc }) => {
                                  const foundDoc = docs.find((d) => d.document_type === type)
                                  const isUploadingThis = uploadingDocKey === `${jamaah.id}-${type}`
                                  const status = foundDoc?.verification_status || 'not_uploaded'
                                  const isNeedRevision = status === 'revision_required'

                                  return (
                                    <div
                                      key={type}
                                      className={`p-3.5 rounded-lg border text-xs space-y-2.5 transition-all ${
                                        isNeedRevision
                                          ? 'bg-amber-50/70 border-amber-300'
                                          : foundDoc
                                          ? 'bg-white border-slate-200'
                                          : 'bg-slate-50 border-dashed border-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <p className="font-bold text-slate-800">
                                            {label} {required && <span className="text-red-500">*</span>}
                                          </p>
                                          <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                                          <div className="mt-1.5">
                                            {foundDoc ? (
                                              <DocumentStatusBadge status={status as never} />
                                            ) : (
                                              <span className="text-[11px] text-slate-500 font-medium">
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
                                              className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md inline-flex items-center gap-1 border border-emerald-200"
                                              title="Lihat dokumen terunggah"
                                            >
                                              <ExternalLink className="w-3.5 h-3.5" />
                                              <span className="text-[10px] font-semibold">Lihat</span>
                                            </a>
                                          )}

                                          {/* Upload / Re-upload Button */}
                                          <button
                                            type="button"
                                            disabled={isUploadingThis}
                                            onClick={() => triggerDocumentUpload(jamaah.id, type)}
                                            className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors inline-flex items-center gap-1 shadow-xs ${
                                              isNeedRevision
                                                ? 'bg-amber-600 text-white hover:bg-amber-700'
                                                : foundDoc
                                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                                : 'bg-emerald-700 text-white hover:bg-emerald-800'
                                            }`}
                                          >
                                            {isUploadingThis ? (
                                              <>
                                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                <span>Mengunggah...</span>
                                              </>
                                            ) : isNeedRevision ? (
                                              <>
                                                <Upload className="w-3 h-3" />
                                                Unggah Revisi
                                              </>
                                            ) : foundDoc ? (
                                              <>
                                                <Upload className="w-3 h-3" />
                                                Ganti Berkas
                                              </>
                                            ) : (
                                              <>
                                                <Upload className="w-3 h-3" />
                                                Unggah Berkas
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      {/* Catatan revisi jika ditolak panitia */}
                                      {isNeedRevision && foundDoc?.verification_note && (
                                        <div className="p-2.5 bg-white rounded border border-amber-300 text-[11px] text-amber-900 font-medium">
                                          ⚠️ <span className="font-bold">Catatan Revisi Panitia:</span> {foundDoc.verification_note}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )}
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
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Informasi Pembayaran Down Payment (DP)</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      DP Rp 5.000.000 per jamaah untuk mengamankan nomor porsi keberangkatan.
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {payments.map((payment) => {
                    const isUploadingProof = uploadingDocKey === `${jamaahs[0]?.id}-bukti_bayar`
                    return (
                      <div key={payment.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {payment.payment_type === 'full' ? 'Pembayaran Lunas' : 'Down Payment (DP)'}
                          </p>
                          <p className="text-xl font-bold text-slate-900 mt-0.5">
                            {formatCurrency(payment.amount)}
                          </p>
                          {payment.payment_date && (
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              Tanggal Transfer: {formatDate(payment.payment_date)}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <PaymentStatusBadge status={payment.verification_status} />
                            {payment.verification_note && (
                              <span className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Catatan: {payment.verification_note}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Bukti Transfer */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {payment.drive_web_view_url && (
                            <a
                              href={payment.drive_web_view_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5"
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
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 transition-colors inline-flex items-center gap-1.5 shadow-xs"
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

        {/* MODAL LENGKAPI / EDIT PASPOR */}
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

        {/* MODAL EDIT DATA DIRI JAMAAH */}
        {editJamaahModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Data Jamaah
                  </h3>
                  <p className="text-xs text-slate-500">
                    Perbarui profil data diri {editJamaahModal.full_name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditJamaahModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveJamaah} className="p-6 overflow-y-auto space-y-5 flex-1">
                {editJamaahSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    {editJamaahSuccessMsg}
                  </div>
                )}

                {editJamaahErrorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    {editJamaahErrorMsg}
                  </div>
                )}

                {/* Section Identitas */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-1">
                    1. Identitas Kependudukan
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Nama Lengkap (sesuai KTP/Paspor) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Nama Ayah Kandung
                      </label>
                      <input
                        type="text"
                        value={editForm.father_name}
                        onChange={(e) => setEditForm({ ...editForm, father_name: e.target.value })}
                        placeholder="Nama Ayah Kandung"
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        NIK (16 Digit)
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        value={editForm.nik}
                        onChange={(e) => setEditForm({ ...editForm, nik: e.target.value })}
                        placeholder="Contoh: 3501..."
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-mono font-medium focus:border-emerald-700 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Jenis Kelamin <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editForm.gender}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as 'male' | 'female' })}
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                      >
                        <option value="male">Laki-laki</option>
                        <option value="female">Perempuan</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Tempat Lahir
                      </label>
                      <input
                        type="text"
                        value={editForm.birth_place}
                        onChange={(e) => setEditForm({ ...editForm, birth_place: e.target.value })}
                        placeholder="Contoh: Surabaya"
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Tanggal Lahir
                      </label>
                      <input
                        type="date"
                        value={editForm.birth_date}
                        onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Status Perkawinan
                      </label>
                      <select
                        value={editForm.marital_status}
                        onChange={(e) => setEditForm({ ...editForm, marital_status: e.target.value as MaritalStatus })}
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                      >
                        <option value="single">Belum Menikah</option>
                        <option value="married">Menikah</option>
                        <option value="widowed">Duda / Janda</option>
                        <option value="divorced">Cerai</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Pekerjaan
                      </label>
                      <input
                        type="text"
                        value={editForm.occupation}
                        onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                        placeholder="Contoh: Pegawai Negeri / Wiraswasta"
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section Kontak & Alamat */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-1">
                    2. Kontak & Alamat Domisili
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Nomor HP / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="Contoh: 08123456789"
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Provinsi
                      </label>
                      <input
                        type="text"
                        value={editForm.province}
                        onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                        placeholder="Contoh: Jawa Timur"
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Kota / Kabupaten
                      </label>
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        placeholder="Contoh: Kab. Ponorogo"
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Kecamatan & Kelurahan
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editForm.district}
                          onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                          placeholder="Kecamatan"
                          className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={editForm.village}
                          onChange={(e) => setEditForm({ ...editForm, village: e.target.value })}
                          placeholder="Desa/Kel."
                          className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Alamat Lengkap (Jalan, RT/RW, No. Rumah)
                    </label>
                    <textarea
                      rows={2}
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      placeholder="Masukkan alamat domisili lengkap..."
                      className="w-full p-2.5 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Section Perlengkapan & Kebutuhan Khusus */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-1">
                    3. Perlengkapan & Catatan Kesehatan
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Ukuran Seragam Batik
                      </label>
                      <select
                        value={editForm.clothing_size}
                        onChange={(e) => setEditForm({ ...editForm, clothing_size: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                      >
                        {CLOTHING_SIZES.map((sz) => (
                          <option key={sz} value={sz}>{sz}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Riwayat Medis / Alergi (Opsional)
                      </label>
                      <input
                        type="text"
                        value={editForm.medical_history}
                        onChange={(e) => setEditForm({ ...editForm, medical_history: e.target.value })}
                        placeholder="Contoh: Asma, Alergi antibiotik"
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Disabilitas Checkbox */}
                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.has_disability}
                        onChange={(e) => setEditForm({ ...editForm, has_disability: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        Memerlukan Bantuan Khusus / Disabilitas (misal: Kursi Roda)
                      </span>
                    </label>

                    {editForm.has_disability && (
                      <div className="mt-2 pl-6 space-y-1">
                        <label className="text-xs text-slate-600">Rincian Bantuan yang Diperlukan:</label>
                        <input
                          type="text"
                          value={editForm.disability_description}
                          onChange={(e) => setEditForm({ ...editForm, disability_description: e.target.value })}
                          placeholder="Contoh: Memerlukan kursi roda saat tawaf & sa'i"
                          className="w-full h-9 px-3 border border-amber-300 bg-amber-50/50 rounded-md text-sm text-slate-900 font-medium focus:border-emerald-700 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditJamaahModal(null)}
                    disabled={savingJamaah}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingJamaah || !editForm.full_name.trim()}
                    isLoading={savingJamaah}
                  >
                    Simpan Perubahan Data
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
