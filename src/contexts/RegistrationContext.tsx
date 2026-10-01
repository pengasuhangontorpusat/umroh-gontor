'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { RegistrationType, PaymentType, DocumentType } from '@/types'

export const DRAFT_STORAGE_KEY = 'umroh_gontor_registration_draft_v1'
export const HISTORY_STORAGE_KEY = 'umroh_gontor_reg_codes_history'

export interface RegistrationHistoryItem {
  code: string
  picName: string
  memberCount: number
  date: string
}

export function saveRegistrationHistory(item: RegistrationHistoryItem) {
  if (typeof window === 'undefined' || !item.code) return
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    const list: RegistrationHistoryItem[] = raw ? JSON.parse(raw) : []
    const filtered = list.filter((i) => i.code !== item.code)
    filtered.unshift(item)
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered.slice(0, 10)))
  } catch (err) {
    console.warn('Failed to save registration history to localStorage:', err)
  }
}

export function getRegistrationHistory(): RegistrationHistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function clearRegistrationHistory() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY)
  } catch {}
}

export interface JamaahDraft {
  id: string // local temp id
  full_name: string
  gender: string
  father_name: string
  nik: string
  birth_place: string
  birth_date: string
  nationality: string
  marital_status: string
  occupation: string
  phone: string
  address: string
  province: string
  city: string
  district: string
  village: string
  relationship_to_pic: string
  passport_status: string
  passport_number: string
  passport_issue_place: string
  passport_issue_date: string
  passport_expiry_date: string
  has_disability: boolean
  disability_description: string
  medical_history: string
  clothing_size: string
}

export interface RegistrationDraft {
  step: number
  type: RegistrationType | null
  departure_point_id: string
  package_id: string
  pic_name: string
  pic_phone: string
  pic_email: string
  pic_domicile_city: string
  pic_is_departing: boolean
  members: JamaahDraft[]
  payment_type: PaymentType | null
  payment_date: string
  // After submit
  group_id: string
  registration_code: string
}

const defaultDraft: RegistrationDraft = {
  step: 1,
  type: null,
  departure_point_id: '',
  package_id: '',
  pic_name: '',
  pic_phone: '',
  pic_email: '',
  pic_domicile_city: '',
  pic_is_departing: true,
  members: [],
  payment_type: null,
  payment_date: '',
  group_id: '',
  registration_code: '',
}

function createEmptyMember(id: string): JamaahDraft {
  return {
    id,
    full_name: '',
    gender: '',
    father_name: '',
    nik: '',
    birth_place: '',
    birth_date: '',
    nationality: 'Indonesia',
    marital_status: '',
    occupation: '',
    phone: '',
    address: '',
    province: '',
    city: '',
    district: '',
    village: '',
    relationship_to_pic: '',
    passport_status: 'no_passport',
    passport_number: '',
    passport_issue_place: '',
    passport_issue_date: '',
    passport_expiry_date: '',
    has_disability: false,
    disability_description: '',
    medical_history: '',
    clothing_size: 'L',
  }
}

interface RegistrationContextType {
  draft: RegistrationDraft
  pendingFiles: Record<string, Partial<Record<DocumentType, File>>>
  paymentProofFile: File | null
  hasRestoredDraft: boolean
  dismissRestoredNotice: () => void
  clearDraftAndReset: () => void
  setDraft: (updates: Partial<RegistrationDraft>) => void
  setMemberFile: (memberId: string, docType: DocumentType, file: File | null) => void
  setPaymentProofFile: (file: File | null) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  addMember: () => void
  removeMember: (id: string) => void
  updateMember: (id: string, updates: Partial<JamaahDraft>) => void
  reset: () => void
}

const RegistrationContext = createContext<RegistrationContextType | null>(null)

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<RegistrationDraft>(defaultDraft)
  const [pendingFiles, setPendingFiles] = useState<Record<string, Partial<Record<DocumentType, File>>>>({})
  const [paymentProofFile, setPaymentProofFileState] = useState<File | null>(null)
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false)
  const isInitialized = useRef(false)

  // Auto-restore draft from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as RegistrationDraft
        if (
          parsed &&
          (parsed.members?.length > 0 ||
            parsed.pic_name?.trim() ||
            parsed.type ||
            parsed.package_id)
        ) {
          // If the user already finished (step 7), don't restore wizard
          if (parsed.step < 7) {
            setDraftState(parsed)
            setHasRestoredDraft(true)
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved draft from localStorage:', e)
    } finally {
      isInitialized.current = true
    }
  }, [])

  // Auto-save draft changes to localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized.current) return
    try {
      if (draft.step === 7) {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
      } else {
        const hasData =
          Boolean(draft.type) ||
          Boolean(draft.pic_name?.trim()) ||
          draft.members.length > 0 ||
          Boolean(draft.package_id) ||
          Boolean(draft.departure_point_id)
        if (hasData) {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
        }
      }
    } catch (e) {
      console.warn('Failed to save draft to localStorage:', e)
    }
  }, [draft])

  const setDraft = useCallback((updates: Partial<RegistrationDraft>) => {
    setDraftState((prev) => ({ ...prev, ...updates }))
  }, [])

  const setMemberFile = useCallback((memberId: string, docType: DocumentType, file: File | null) => {
    setPendingFiles((prev) => {
      const memberDocs = { ...(prev[memberId] || {}) }
      if (file) {
        memberDocs[docType] = file
      } else {
        delete memberDocs[docType]
      }
      return {
        ...prev,
        [memberId]: memberDocs,
      }
    })
  }, [])

  const setPaymentProofFile = useCallback((file: File | null) => {
    setPaymentProofFileState(file)
  }, [])

  const nextStep = useCallback(() => {
    setDraftState((prev) => ({ ...prev, step: prev.step + 1 }))
  }, [])

  const prevStep = useCallback(() => {
    setDraftState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) }))
  }, [])

  const goToStep = useCallback((step: number) => {
    setDraftState((prev) => ({ ...prev, step }))
  }, [])

  const addMember = useCallback(() => {
    const id = `tmp_${Date.now()}`
    setDraftState((prev) => ({
      ...prev,
      members: [...prev.members, createEmptyMember(id)],
    }))
  }, [])

  const removeMember = useCallback((id: string) => {
    setDraftState((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== id),
    }))
    setPendingFiles((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const updateMember = useCallback((id: string, updates: Partial<JamaahDraft>) => {
    setDraftState((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }))
  }, [])

  const clearDraftAndReset = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
      } catch {}
    }
    setDraftState(defaultDraft)
    setPendingFiles({})
    setPaymentProofFileState(null)
    setHasRestoredDraft(false)
  }, [])

  const dismissRestoredNotice = useCallback(() => {
    setHasRestoredDraft(false)
  }, [])

  const reset = useCallback(() => {
    clearDraftAndReset()
  }, [clearDraftAndReset])

  return (
    <RegistrationContext.Provider
      value={{
        draft,
        pendingFiles,
        paymentProofFile,
        hasRestoredDraft,
        dismissRestoredNotice,
        clearDraftAndReset,
        setDraft,
        setMemberFile,
        setPaymentProofFile,
        nextStep,
        prevStep,
        goToStep,
        addMember,
        removeMember,
        updateMember,
        reset,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  )
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext)
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider')
  return ctx
}

export { createEmptyMember }
