'use client'

import { useState, useEffect } from 'react'
import { useRegistration } from '@/contexts/RegistrationContext'
import { Button } from '@/components/ui/Button'
import { FileUpload } from '@/components/ui/FileUpload'
import { DocumentStatusBadge } from '@/components/ui/StatusBadge'
import { DocumentType, DocumentStatus, DOCUMENT_TYPE_LABELS, DocumentRequirement } from '@/types'
import { isKtpRequired } from '@/lib/utils'
import { ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentState {
  status: DocumentStatus
  fileName?: string
  fileUrl?: string
}

interface MemberDocumentState {
  memberId: string
  docs: Partial<Record<DocumentType, DocumentState>>
}

async function uploadDocument(
  jamaahId: string,
  docType: DocumentType,
  file: File
): Promise<{ fileName: string; fileUrl: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('jamaahId', jamaahId) // temp id - will be real after submission
  formData.append('docType', docType)

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Upload gagal')
  }

  return res.json()
}

function MemberDocs({
  memberIndex,
  memberId,
  memberName,
  birthDate,
  passportStatus,
  citizenshipType,
  country,
  nationality,
  configuredDocs,
  state,
  onUpload,
}: {
  memberIndex: number
  memberId: string
  memberName: string
  birthDate: string
  passportStatus: string
  citizenshipType?: 'wni' | 'wna'
  country?: string
  nationality?: string
  configuredDocs: DocumentRequirement[]
  state: Partial<Record<DocumentType, DocumentState>>
  onUpload: (docType: DocumentType, file: File) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(memberIndex === 0)
  const isWna = citizenshipType === 'wna' || (nationality && nationality.toLowerCase() !== 'indonesia')
  const ktpRequired = birthDate ? isKtpRequired(birthDate) : true
  const isPassportLocked = passportStatus !== 'has_passport'
  const isPassportInProcess = passportStatus === 'in_process'

  // Filter documents based on targetAudience set in Admin Settings
  const relevantDocs = (configuredDocs && configuredDocs.length > 0
    ? configuredDocs
    : [
        { id: 'ktp', name: 'KTP (Kartu Tanda Penduduk)', description: 'Wajib untuk WNI usia 17 tahun ke atas', icon: '📄', isRequired: true, isActive: true, targetAudience: 'wni' as const },
        { id: 'kk', name: 'Kartu Keluarga', description: 'Untuk semua anggota keluarga/rombongan', icon: '📋', isRequired: true, isActive: true, targetAudience: 'wni' as const },
        { id: 'vaksin', name: 'Kartu Vaksin Meningitis & Polio', description: 'Dapat dikoordinasikan dengan panitia', icon: '💉', isRequired: false, isActive: true, targetAudience: 'all' as const },
        { id: 'paspor', name: 'Buku Paspor', description: 'Wajib untuk WNA & pelengkap perjalanan internasional', icon: '📘', isRequired: false, isActive: true, targetAudience: 'all' as const },
      ]
  )
    .filter((d) => d.isActive !== false)
    .filter((d) => {
      const aud = d.targetAudience || 'all'
      if (aud === 'all') return true
      if (isWna) return aud === 'wna'
      return aud === 'wni'
    })
    .map((d) => {
      const typeKey = (d.id as DocumentType) || 'ktp'
      const isPass = typeKey === 'paspor'
      const isKtp = typeKey === 'ktp'
      const locked = isPass && isPassportLocked

      let isReq = d.isRequired
      if (isKtp) isReq = isReq && ktpRequired
      if (isPass && isWna) isReq = true // WNA always needs passport for travel

      let note = d.description
      if (isKtp && !ktpRequired) note = 'Tidak wajib (di bawah 17 tahun)'
      if (isPass) {
        note = isPassportLocked
          ? isPassportInProcess
            ? 'Paspor sedang proses (dapat dilengkapi menyusul di menu Cek Status)'
            : 'Belum ada paspor (dapat dilengkapi menyusul di menu Cek Status)'
          : isWna
          ? 'Wajib untuk identitas resmi dan penerbitan visa jamaah luar negeri'
          : 'Lampirkan scan/foto halaman depan paspor yang jelas'
      }

      return {
        type: typeKey,
        name: d.name,
        icon: d.icon || '📄',
        required: isReq,
        note,
        locked,
        audience: d.targetAudience || 'all',
      }
    })

  const activeDocs = relevantDocs.filter((d) => !d.locked)
  const uploadedCount = activeDocs.filter(
    (d) => state[d.type]?.status !== 'not_uploaded' && state[d.type]?.status !== undefined
  ).length

  return (
    <div className="border border-[var(--border)] rounded-[var(--radius-lg)] bg-white overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-xs font-semibold text-[var(--text-secondary)]">
            {String(memberIndex + 1).padStart(2, '0')}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{memberName || `Anggota ${memberIndex + 1}`}</p>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isWna
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isWna ? `🌏 WNA (${country || nationality || 'Luar Negeri'})` : '🇮🇩 WNI'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {uploadedCount} dari {activeDocs.length} dokumen wajib diunggah
              {isPassportLocked && ' • Paspor menyusul'}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-4 space-y-5">
          {relevantDocs.map(({ type, name, icon, required, note, locked, audience }) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-base">{icon}</span>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {name || DOCUMENT_TYPE_LABELS[type]}
                  {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
                </p>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                  {audience === 'wna' ? 'Khusus WNA' : audience === 'wni' ? 'Khusus WNI' : 'Semua Jamaah'}
                </span>
                {locked ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    <Lock className="w-3 h-3" />
                    {isPassportInProcess ? 'Sedang Diproses' : 'Belum Ada Paspor'}
                  </span>
                ) : (
                  state[type] && <DocumentStatusBadge status={state[type]!.status} />
                )}
              </div>
              {note && (
                <p className="text-xs text-[var(--text-muted)] mb-2">{note}</p>
              )}
              {locked ? (
                <div className="flex items-start gap-3 p-3.5 rounded-[var(--radius-md)] bg-amber-50/80 border border-amber-200/80 text-amber-900">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="text-xs leading-relaxed">
                    <p className="font-semibold text-amber-900">
                      {isPassportInProcess ? 'Paspor Sedang Diproses' : 'Belum Memiliki Paspor'}
                    </p>
                    <p className="text-amber-800/90 mt-0.5">
                      Unggah dokumen paspor dikunci untuk anggota ini karena berstatus{' '}
                      <strong>{isPassportInProcess ? 'Sedang Diproses' : 'Belum Memiliki Paspor'}</strong>. Dokumen paspor
                      dapat Anda lengkapi menyusul melalui halaman <strong>Cek Status Pendaftaran</strong> setelah buku paspor
                      diterbitkan oleh pihak Imigrasi.
                    </p>
                  </div>
                </div>
              ) : (
                <FileUpload
                  id={`${memberId}-${type}`}
                  currentFileName={state[type]?.fileName}
                  currentFileUrl={state[type]?.fileUrl}
                  onFileSelect={(file) => onUpload(type, file)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Step4Documents() {
  const { draft, nextStep, prevStep, pendingFiles, setMemberFile } = useRegistration()
  const [configuredDocs, setConfiguredDocs] = useState<DocumentRequirement[]>([])

  useEffect(() => {
    fetch('/api/admin/settings/general')
      .then((res) => res.json())
      .then((data) => {
        if (data?.parameters?.documentRequirements) {
          setConfiguredDocs(data.parameters.documentRequirements)
        }
      })
      .catch((err) => console.warn('Failed to load configured docs, fallback to defaults:', err))
  }, [])

  async function handleUpload(memberId: string, docType: DocumentType, file: File) {
    setMemberFile(memberId, docType, file)
  }

  // Derive docStates from pendingFiles in context
  const docStates: Record<string, Partial<Record<DocumentType, DocumentState>>> = {}
  draft.members.forEach((member) => {
    docStates[member.id] = {}
    const mFiles = pendingFiles[member.id] || {}
    const docKeys: DocumentType[] = ['ktp', 'kk', 'vaksin', 'paspor', 'bukti_bayar']
    docKeys.forEach((dType) => {
      const f = mFiles[dType]
      if (f) {
        docStates[member.id][dType] = {
          status: 'uploaded',
          fileName: f.name,
        }
      }
    })
  })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Dokumen</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Unggah berkas persyaratan sesuai ketentuan. Dokumen dapat dilengkapi setelah pendaftaran jika belum tersedia.
        </p>
      </div>

      <div className="space-y-3">
        {draft.members.map((member, index) => (
          <MemberDocs
            key={member.id}
            memberIndex={index}
            memberId={member.id}
            memberName={member.full_name}
            birthDate={member.birth_date}
            passportStatus={member.passport_status}
            citizenshipType={member.citizenship_type}
            country={member.country}
            nationality={member.nationality}
            configuredDocs={configuredDocs}
            state={docStates[member.id] ?? {}}
            onUpload={(docType, file) => handleUpload(member.id, docType, file)}
          />
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={prevStep}>
          Kembali
        </Button>
        <Button onClick={nextStep} size="lg">
          Lanjutkan
        </Button>
      </div>
    </div>
  )
}
