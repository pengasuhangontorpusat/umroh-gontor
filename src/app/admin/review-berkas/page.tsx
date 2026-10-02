'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  FileCheck,
  Search,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  User,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  Filter,
  Maximize2,
  Calendar,
  Phone,
  MapPin,
  Layers,
  ArrowRight,
  Eye,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DocumentStatusBadge } from '@/components/ui/StatusBadge'
import { DocumentType, DocumentStatus } from '@/types'
import { calculateAge, formatDate } from '@/lib/utils'

interface DocumentItem {
  id: string
  document_type: DocumentType
  file_name: string
  mime_type: string
  file_size: number
  drive_file_id: string
  drive_web_view_url: string
  verification_status: DocumentStatus
  verification_note: string | null
  verified_at: string | null
  uploaded_at: string | null
  version: number
}

interface JamaahRecord {
  id: string
  group_id: string
  registration_order: number
  full_name: string
  gender: string
  father_name: string | null
  nik: string | null
  passport_number: string | null
  passport_issue_place: string | null
  passport_issue_date: string | null
  passport_expiry_date: string | null
  passport_status: string
  birth_place: string
  birth_date: string
  nationality: string
  marital_status: string
  occupation: string | null
  phone: string | null
  address: string | null
  province: string | null
  city: string | null
  district: string | null
  village: string | null
  relationship_to_pic: string | null
  has_disability: boolean
  disability_description: string | null
  medical_history: string | null
  clothing_size: string | null
  ktp_required: boolean
  created_at: string
  documents: DocumentItem[]
  group?: {
    id: string
    registration_code: string
    type: string
    group_status: string
    created_at: string
    package?: { id: string; name: string; price: number }
    departure_point?: { id: string; name: string }
  }
}

const DOCUMENT_TABS: Array<{ type: DocumentType; label: string; icon: string }> = [
  { type: 'ktp', label: 'KTP', icon: '📄' },
  { type: 'kk', label: 'Kartu Keluarga', icon: '📋' },
  { type: 'paspor', label: 'Paspor', icon: '📘' },
  { type: 'vaksin', label: 'Vaksin', icon: '💉' },
]

const QUICK_REVISION_REASONS: Record<string, string[]> = {
  ktp: [
    'Foto atau scan KTP buram / tulisan tidak terbaca jelas',
    'NIK terpotong atau tidak sesuai dengan input sistem',
    'Masa berlaku KTP tidak jelas / dokumen rusak',
    'Scan bukan merupakan KTP asli',
  ],
  kk: [
    'Foto KK buram / nama anggota keluarga tidak terbaca',
    'Halaman KK terpotong / tidak lengkap',
    'Nama jamaah tidak tercantum di dalam Kartu Keluarga ini',
  ],
  paspor: [
    'Scan halaman identitas paspor terpotong atau buram',
    'Masa berlaku paspor kurang dari 7 bulan sebelum keberangkatan',
    'Nomor paspor tidak sesuai dengan dokumen fisik',
    'Nama di paspor berbeda dengan data diri jamaah',
  ],
  vaksin: [
    'Sertifikat vaksin belum mencantumkan vaksin Meningitis',
    'Foto barcode sertifikat vaksin buram atau tidak dapat dipindai',
    'Nama di sertifikat vaksin berbeda dengan data jamaah',
  ],
}

export default function ReviewBerkasPage() {
  const [jamaahs, setJamaahs] = useState<JamaahRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_review' | 'verified' | 'revision_required'>('needs_review')
  const [selectedJamaahId, setSelectedJamaahId] = useState<string>('')
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('ktp')

  // Viewer controls
  const [zoomLevel, setZoomLevel] = useState(100)
  const [rotation, setRotation] = useState(0)

  // Action states
  const [submitting, setSubmitting] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [showRevisionBox, setShowRevisionBox] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Stats summary
  const [stats, setStats] = useState({
    totalJamaahs: 0,
    totalDocsUploaded: 0,
    pendingReviewCount: 0,
    verifiedCount: 0,
    revisionRequiredCount: 0,
  })

  const fetchJamaahs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/review-berkas?status=${statusFilter}&search=${encodeURIComponent(search)}`)
      const data = await res.json()
      if (res.ok && data.jamaahs) {
        setJamaahs(data.jamaahs)
        if (data.summary) setStats(data.summary)

        // Select first jamaah if not already selected or if current selection not in list
        if (data.jamaahs.length > 0) {
          const currentExists = data.jamaahs.some((j: JamaahRecord) => j.id === selectedJamaahId)
          if (!currentExists) {
            setSelectedJamaahId(data.jamaahs[0].id)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching review-berkas:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, selectedJamaahId])

  useEffect(() => {
    fetchJamaahs()
  }, [fetchJamaahs])

  // Active jamaah
  const activeJamaah = useMemo(() => {
    return jamaahs.find((j) => j.id === selectedJamaahId) || jamaahs[0] || null
  }, [jamaahs, selectedJamaahId])

  // Active document for the selected docType
  const activeDocument = useMemo(() => {
    if (!activeJamaah) return null
    return activeJamaah.documents?.find((d) => d.document_type === selectedDocType) || null
  }, [activeJamaah, selectedDocType])

  // Reset zoom & rotation when document changes
  useEffect(() => {
    setZoomLevel(100)
    setRotation(0)
    setShowRevisionBox(false)
    setSelectedReason('')
    setCustomReason('')
  }, [selectedJamaahId, selectedDocType])

  // Copy to clipboard helper
  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Navigation handlers
  const currentIndex = jamaahs.findIndex((j) => j.id === activeJamaah?.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < jamaahs.length - 1

  const goToPrevJamaah = () => {
    if (hasPrev) {
      setSelectedJamaahId(jamaahs[currentIndex - 1].id)
    }
  }

  const goToNextJamaah = () => {
    if (hasNext) {
      setSelectedJamaahId(jamaahs[currentIndex + 1].id)
    }
  }

  // Action: Submit Verification (Verified, Revision, Rejected)
  const handleVerify = async (status: 'verified' | 'revision_required' | 'rejected', reasonText?: string) => {
    if (!activeJamaah) return
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        status,
        verification_note: reasonText || undefined,
      }

      if (activeDocument?.id) {
        payload.document_id = activeDocument.id
      } else {
        payload.jamaah_id = activeJamaah.id
        payload.document_type = selectedDocType
      }

      const res = await fetch('/api/admin/verify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        // Update local state smoothly
        setJamaahs((prev) =>
          prev.map((j) => {
            if (j.id !== activeJamaah.id) return j
            const existingDocs = [...j.documents]
            const docIdx = existingDocs.findIndex((d) => d.document_type === selectedDocType)
            if (docIdx >= 0) {
              existingDocs[docIdx] = {
                ...existingDocs[docIdx],
                verification_status: status,
                verification_note: reasonText || null,
                verified_at: new Date().toISOString(),
              }
            } else {
              existingDocs.push({
                id: 'temp_' + Date.now(),
                document_type: selectedDocType,
                file_name: '',
                mime_type: '',
                file_size: 0,
                drive_file_id: '',
                drive_web_view_url: '',
                verification_status: status,
                verification_note: reasonText || null,
                verified_at: new Date().toISOString(),
                uploaded_at: null,
                version: 1,
              })
            }
            return { ...j, documents: existingDocs }
          })
        )

        setShowRevisionBox(false)

        // Auto advance logic
        if (autoAdvance) {
          // Check if there are other unverified documents for this jamaah
          const unverifiedDoc = activeJamaah.documents?.find(
            (d) => d.document_type !== selectedDocType && (d.verification_status === 'uploaded' || d.verification_status === 'under_review')
          )
          if (unverifiedDoc) {
            setSelectedDocType(unverifiedDoc.document_type)
          } else if (hasNext) {
            goToNextJamaah()
          }
        }
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Gagal mengubah status verifikasi.')
      }
    } catch {
      alert('Terjadi kesalahan koneksi.')
    } finally {
      setSubmitting(false)
    }
  }

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      if (e.key === 'ArrowLeft' && e.altKey) {
        goToPrevJamaah()
      } else if (e.key === 'ArrowRight' && e.altKey) {
        goToNextJamaah()
      } else if (e.key === '1') {
        setSelectedDocType('ktp')
      } else if (e.key === '2') {
        setSelectedDocType('kk')
      } else if (e.key === '3') {
        setSelectedDocType('paspor')
      } else if (e.key === '4') {
        setSelectedDocType('vaksin')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrevJamaah, goToNextJamaah])

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      {/* Top Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[var(--border)] rounded-xl p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Review & Verifikasi Berkas Jamaah
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Stasiun verifikasi cepat untuk memeriksa berkas scan langsung berdampingan dengan data input jamaah tanpa perlu klik buka file satu per satu.
              </p>
            </div>
          </div>
        </div>

        {/* Global Stats Pill */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs">
            <span className="text-amber-800 font-medium">Perlu Review:</span>{' '}
            <strong className="text-amber-950 font-bold">{stats.pendingReviewCount}</strong>
          </div>
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
            <span className="text-emerald-800 font-medium">Terverifikasi:</span>{' '}
            <strong className="text-emerald-950 font-bold">{stats.verifiedCount}</strong>
          </div>
          <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs">
            <span className="text-rose-800 font-medium">Revisi:</span>{' '}
            <strong className="text-rose-950 font-bold">{stats.revisionRequiredCount}</strong>
          </div>
          <button
            onClick={() => fetchJamaahs()}
            className="p-2 border border-[var(--border)] rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Left Jamaah Queue + Right Review Station */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ============================================================
            LEFT COLUMN: Jamaah Queue & Filter (4 cols)
            ============================================================ */}
        <div className="lg:col-span-4 bg-white border border-[var(--border)] rounded-xl shadow-xs overflow-hidden flex flex-col h-[calc(100vh-210px)] min-h-[580px]">
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-[var(--border)] space-y-2.5 bg-slate-50/50">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, NIK, kode rombongan..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            {/* Status Filter Pill Tabs */}
            <div className="flex gap-1 overflow-x-auto text-[11px] pb-1">
              <button
                type="button"
                onClick={() => setStatusFilter('needs_review')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                  statusFilter === 'needs_review'
                    ? 'bg-amber-100 text-amber-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🟡 Perlu Review ({stats.pendingReviewCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Semua ({stats.totalJamaahs})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('verified')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                  statusFilter === 'verified'
                    ? 'bg-emerald-100 text-emerald-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🟢 Valid ({stats.verifiedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('revision_required')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                  statusFilter === 'revision_required'
                    ? 'bg-rose-100 text-rose-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🔴 Revisi ({stats.revisionRequiredCount})
              </button>
            </div>
          </div>

          {/* Jamaah List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
                <span>Memuat daftar antrean jamaah...</span>
              </div>
            ) : jamaahs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-1">
                <p className="font-semibold text-slate-700">Tidak ada jamaah dalam antrean</p>
                <p className="text-[11px] text-slate-400">
                  {statusFilter === 'needs_review'
                    ? 'Alhamdulillah seluruh berkas jamaah saat ini telah ditinjau.'
                    : 'Coba ubah kata kunci pencarian atau filter status.'}
                </p>
              </div>
            ) : (
              jamaahs.map((j, idx) => {
                const isSelected = j.id === activeJamaah?.id
                const docs = j.documents || []
                const hasPending = docs.some(
                  (d) => (d.verification_status || 'uploaded') === 'uploaded' || d.verification_status === 'under_review'
                )
                const hasRevision = docs.some(
                  (d) => d.verification_status === 'revision_required' || d.verification_status === 'rejected'
                )

                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setSelectedJamaahId(j.id)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-emerald-50/70 border-l-4 border-l-[var(--primary)]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-semibold text-slate-400">
                          #{idx + 1}
                        </span>
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-950' : 'text-slate-900'}`}>
                          {j.full_name}
                        </p>
                        {j.relationship_to_pic && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                            {j.relationship_to_pic}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span className="font-mono">{j.group?.registration_code || '-'}</span>
                        <span>•</span>
                        <span>{j.city || j.province || 'Domisili -'}</span>
                      </div>

                      {/* Mini Document Status Dots */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {DOCUMENT_TABS.map((tab) => {
                          const doc = docs.find((d) => d.document_type === tab.type)
                          let dotColor = 'bg-slate-200 text-slate-400'
                          if (doc) {
                            if (doc.verification_status === 'verified') dotColor = 'bg-emerald-500 text-white'
                            else if (doc.verification_status === 'revision_required' || doc.verification_status === 'rejected')
                              dotColor = 'bg-rose-500 text-white'
                            else dotColor = 'bg-amber-400 text-slate-900'
                          }

                          return (
                            <span
                              key={tab.type}
                              title={`${tab.label}: ${doc ? doc.verification_status : 'Belum upload'}`}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${dotColor}`}
                            >
                              {tab.label}
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {hasPending ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block animate-pulse" title="Ada berkas perlu direview" />
                      ) : hasRevision ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" title="Ada berkas perlu revisi" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" title="Semua berkas terverifikasi" />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ============================================================
            RIGHT COLUMN: Dual-Pane Review Station (8 cols)
            ============================================================ */}
        <div className="lg:col-span-8 space-y-4">
          {!activeJamaah ? (
            <div className="p-12 text-center bg-white border border-[var(--border)] rounded-xl space-y-2">
              <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Pilih Jamaah untuk Mulai Review</p>
              <p className="text-xs text-slate-400">Pilih salah satu nama jamaah di sebelah kiri untuk melihat berkas.</p>
            </div>
          ) : (
            <div className="bg-white border border-[var(--border)] rounded-xl shadow-xs overflow-hidden flex flex-col">
              {/* Active Jamaah Header Bar */}
              <div className="p-4 border-b border-[var(--border)] bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-[var(--text-primary)]">
                      {activeJamaah.full_name}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                      {activeJamaah.relationship_to_pic || 'Jamaah'}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({activeJamaah.gender === 'male' ? 'Laki-laki' : 'Perempuan'}, {calculateAge(activeJamaah.birth_date)} th)
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2 flex-wrap">
                    <span>
                      Rombongan: <strong>{activeJamaah.group?.registration_code}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Paket: <strong>{activeJamaah.group?.package?.name || '-'}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Embarkasi: <strong>{activeJamaah.group?.departure_point?.name || '-'}</strong>
                    </span>
                  </p>
                </div>

                {/* Prev & Next Jamaah Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/pendaftaran/${activeJamaah.group_id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                    title="Buka Detail Rombongan di Tab Baru"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Detail Rombongan</span>
                  </Link>

                  <div className="flex items-center border border-[var(--border)] rounded-lg bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={goToPrevJamaah}
                      disabled={!hasPrev}
                      className="p-1.5 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-[var(--border)] text-slate-700"
                      title="Jamaah Sebelumnya (Alt + Left)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2.5 py-1 text-xs font-mono font-medium text-slate-600">
                      {currentIndex + 1} / {jamaahs.length}
                    </span>
                    <button
                      type="button"
                      onClick={goToNextJamaah}
                      disabled={!hasNext}
                      className="p-1.5 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700"
                      title="Jamaah Berikutnya (Alt + Right)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Document Selector Tabs Strip */}
              <div className="flex border-b border-[var(--border)] bg-white px-4 pt-2 gap-2 overflow-x-auto">
                {DOCUMENT_TABS.map((tab, tIdx) => {
                  const isSelected = selectedDocType === tab.type
                  const doc = activeJamaah.documents?.find((d) => d.document_type === tab.type)
                  const st = doc?.verification_status || 'not_uploaded'

                  return (
                    <button
                      key={tab.type}
                      type="button"
                      onClick={() => setSelectedDocType(tab.type)}
                      className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                        isSelected
                          ? 'border-[var(--primary)] text-[var(--primary)] font-bold bg-emerald-50/30'
                          : 'border-transparent text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>
                        {tab.label} <span className="text-[10px] text-slate-400 font-mono">[{tIdx + 1}]</span>
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          st === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : st === 'revision_required' || st === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : st === 'uploaded' || st === 'under_review'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {st === 'verified'
                          ? 'Valid'
                          : st === 'revision_required'
                          ? 'Revisi'
                          : st === 'rejected'
                          ? 'Ditolak'
                          : st === 'uploaded' || st === 'under_review'
                          ? 'Perlu Review'
                          : 'Belum Ada'}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Workstation Split: Left Live Viewer + Right Data Comparison & Decision */}
              <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
                {/* ============================================================
                    EMBEDDED FILE VIEWER (7 cols)
                    ============================================================ */}
                <div className="md:col-span-7 border-b md:border-b-0 md:border-r border-[var(--border)] bg-slate-900 flex flex-col justify-between relative overflow-hidden">
                  {/* Viewer Controls Toolbar */}
                  <div className="p-2 bg-slate-950/80 backdrop-blur-xs text-white flex items-center justify-between text-xs z-10">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-300 truncate max-w-[200px]">
                        {activeDocument?.file_name || `${selectedDocType.toUpperCase()} - ${activeJamaah.full_name}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="Perkecil (Zoom Out)"
                      >
                        <ZoomOut className="w-3.5 h-3.5 text-slate-300" />
                      </button>
                      <span className="text-[11px] font-mono px-1 text-slate-300">{zoomLevel}%</span>
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="Perbesar (Zoom In)"
                      >
                        <ZoomIn className="w-3.5 h-3.5 text-slate-300" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors ml-1"
                        title="Putar 90 Derajat (Rotate)"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-slate-300" />
                      </button>
                      {activeDocument?.drive_file_id && (
                        <a
                          href={`/api/drive/public-preview/${activeDocument.drive_file_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-white/10 rounded transition-colors ml-1"
                          title="Buka Gambar/PDF di Tab Penuh"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Document Render Area */}
                  <div className="flex-1 flex items-center justify-center p-4 overflow-auto min-h-[420px] bg-slate-900/90">
                    {!activeDocument || !activeDocument.drive_file_id ? (
                      <div className="text-center p-6 space-y-2 text-slate-400">
                        <FileText className="w-12 h-12 mx-auto text-slate-600" />
                        <p className="text-sm font-semibold text-slate-300">
                          Berkas {selectedDocType.toUpperCase()} Belum Diunggah
                        </p>
                        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                          Calon jamaah belum mengunggah dokumen ini saat pendaftaran. Dokumen dapat diminta untuk diunggah menyusul melalui menu Cek Status.
                        </p>
                      </div>
                    ) : activeDocument.mime_type === 'application/pdf' ? (
                      <iframe
                        src={`/api/drive/public-preview/${activeDocument.drive_file_id}#toolbar=1`}
                        className="w-full h-full min-h-[460px] rounded border-0 bg-white"
                        title="PDF Preview"
                      />
                    ) : (
                      <div
                        className="transition-transform duration-150 flex items-center justify-center max-w-full max-h-full"
                        style={{
                          transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/drive/public-preview/${activeDocument.drive_file_id}`}
                          alt={activeDocument.file_name || 'Dokumen Jamaah'}
                          className="max-w-full max-h-[460px] object-contain rounded shadow-lg select-none"
                          loading="eager"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* ============================================================
                    DATA COMPARISON & DECISION PANEL (5 cols)
                    ============================================================ */}
                <div className="md:col-span-5 p-4 sm:p-5 flex flex-col justify-between space-y-5 bg-white">
                  {/* Section A: Side-by-Side Data Comparison */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Pencocokan Data Input Jamaah
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Cek kesesuaian dengan scan
                      </span>
                    </div>

                    {/* Data Fields based on Document Type */}
                    {selectedDocType === 'ktp' && (
                      <div className="space-y-2.5 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">Nomor Induk Kependudukan (NIK)</span>
                            {activeJamaah.nik && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(activeJamaah.nik || '', 'nik')}
                                className="inline-flex items-center gap-1 text-[10px] text-[var(--primary)] hover:underline"
                              >
                                {copiedField === 'nik' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                {copiedField === 'nik' ? 'Disalin' : 'Salin'}
                              </button>
                            )}
                          </div>
                          <p className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                            {activeJamaah.nik || 'Belum diisi'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-500 block">Nama Lengkap</span>
                            <span className="font-semibold text-slate-900 text-xs">{activeJamaah.full_name}</span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-500 block">Jenis Kelamin</span>
                            <span className="font-semibold text-slate-900 text-xs">
                              {activeJamaah.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                            </span>
                          </div>
                        </div>

                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">Tempat & Tanggal Lahir</span>
                          <span className="font-semibold text-slate-900 text-xs">
                            {activeJamaah.birth_place || '-'}, {formatDate(activeJamaah.birth_date)} ({calculateAge(activeJamaah.birth_date)} tahun)
                          </span>
                        </div>

                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">Alamat Domisili KTP</span>
                          <span className="text-slate-800 text-[11px] leading-relaxed">
                            {activeJamaah.address || '-'}{activeJamaah.city ? `, ${activeJamaah.city}` : ''}{activeJamaah.province ? `, ${activeJamaah.province}` : ''}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedDocType === 'paspor' && (
                      <div className="space-y-2.5 text-xs">
                        <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-blue-800 font-medium">Nomor Paspor RI</span>
                            {activeJamaah.passport_number && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(activeJamaah.passport_number || '', 'passport')}
                                className="inline-flex items-center gap-1 text-[10px] text-blue-700 hover:underline"
                              >
                                {copiedField === 'passport' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                {copiedField === 'passport' ? 'Disalin' : 'Salin'}
                              </button>
                            )}
                          </div>
                          <p className="text-sm font-bold font-mono text-blue-950 mt-0.5">
                            {activeJamaah.passport_number || 'Belum memiliki paspor'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-500 block">Status Paspor</span>
                            <span className="font-semibold text-slate-900 text-xs">
                              {activeJamaah.passport_status === 'has_passport'
                                ? 'Sudah Ada'
                                : activeJamaah.passport_status === 'in_process'
                                ? 'Sedang Proses'
                                : 'Belum Ada'}
                            </span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-500 block">Tempat Diterbitkan</span>
                            <span className="font-semibold text-slate-900 text-xs">
                              {activeJamaah.passport_issue_place || '-'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-500 block">Tanggal Terbit</span>
                            <span className="font-semibold text-slate-900 text-xs">
                              {activeJamaah.passport_issue_date ? formatDate(activeJamaah.passport_issue_date) : '-'}
                            </span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-500 block">Tanggal Habis Berlaku</span>
                            <span className="font-semibold text-slate-900 text-xs">
                              {activeJamaah.passport_expiry_date ? formatDate(activeJamaah.passport_expiry_date) : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedDocType === 'kk' && (
                      <div className="space-y-2.5 text-xs">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">Nama Ayah Kandung</span>
                          <span className="font-semibold text-slate-900 text-xs">
                            {activeJamaah.father_name || '-'}
                          </span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">Hubungan dengan PIC</span>
                          <span className="font-semibold text-slate-900 text-xs">
                            {activeJamaah.relationship_to_pic || '-'}
                          </span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">Alamat Kartu Keluarga</span>
                          <span className="text-slate-800 text-[11px] leading-relaxed">
                            {activeJamaah.address || '-'}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedDocType === 'vaksin' && (
                      <div className="space-y-2.5 text-xs">
                        <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-200">
                          <span className="text-[11px] text-emerald-800 font-medium block">
                            Ketentuan Vaksinasi Wajib
                          </span>
                          <p className="text-xs text-emerald-950 mt-0.5 leading-relaxed">
                            Vaksin Meningitis wajib untuk seluruh jamaah umrah. Pastikan nama pada sertifikat vaksin sesuai dengan nama pada paspor/KTP.
                          </p>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">Riwayat Penyakit / Catatan Khusus</span>
                          <span className="font-medium text-slate-800 text-xs">
                            {activeJamaah.medical_history || 'Tidak ada riwayat medis khusus'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Current Verification Status Display */}
                    <div className="p-3 rounded-lg border bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Status Dokumen Saat Ini:</span>
                        <DocumentStatusBadge status={activeDocument?.verification_status || 'not_uploaded'} />
                      </div>
                      {activeDocument?.verification_note && (
                        <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                          <strong>Catatan Panitia:</strong> {activeDocument.verification_note}
                        </p>
                      )}
                      {activeDocument?.verified_at && (
                        <p className="text-[10px] text-slate-400">
                          Ditinjau pada: {formatDate(activeDocument.verified_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Section B: Instant Verification Actions */}
                  <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                    {/* Auto-advance checkbox */}
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoAdvance}
                          onChange={(e) => setAutoAdvance(e.target.checked)}
                          className="rounded border-slate-300 text-[var(--primary)]"
                        />
                        <span>Lanjut ke berkas berikutnya otomatis setelah verifikasi</span>
                      </label>
                    </div>

                    {/* Decision Buttons */}
                    {!showRevisionBox ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerify('verified')}
                          disabled={submitting || !activeDocument}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          <span>Valid / Terima Berkas</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowRevisionBox(true)}
                          disabled={submitting || !activeDocument}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span>Minta Revisi</span>
                        </button>
                      </div>
                    ) : (
                      /* Quick Reason Selector for Revision */
                      <div className="space-y-2.5 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Pilih Alasan Permintaan Revisi:
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowRevisionBox(false)}
                            className="text-xs text-slate-500 hover:text-slate-800"
                          >
                            Batal
                          </button>
                        </div>

                        {/* Preset Reasons Chips */}
                        <div className="space-y-1">
                          {(QUICK_REVISION_REASONS[selectedDocType] || []).map((reason) => (
                            <button
                              key={reason}
                              type="button"
                              onClick={() => {
                                setSelectedReason(reason)
                                setCustomReason(reason)
                              }}
                              className={`w-full text-left p-1.5 text-xs rounded border transition-colors ${
                                selectedReason === reason
                                  ? 'bg-amber-200/70 border-amber-400 font-semibold text-amber-950'
                                  : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-100/50'
                              }`}
                            >
                              • {reason}
                            </button>
                          ))}
                        </div>

                        <textarea
                          rows={2}
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                          placeholder="Atau ketik catatan revisi khusus untuk jamaah..."
                          className="w-full p-2 text-xs border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        />

                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRevisionBox(false)}
                            className="text-xs"
                          >
                            Batal
                          </Button>
                          <button
                            type="button"
                            disabled={!customReason.trim() || submitting}
                            onClick={() => handleVerify('revision_required', customReason.trim())}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            {submitting ? 'Menyimpan...' : 'Kirim Status Revisi'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
