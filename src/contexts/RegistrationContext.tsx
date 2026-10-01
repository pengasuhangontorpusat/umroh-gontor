'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { RegistrationType, PaymentType } from '@/types'

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
  pic_phone: string
  pic_email: string
  pic_domicile_city: string
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
  pic_phone: '',
  pic_email: '',
  pic_domicile_city: '',
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
  setDraft: (updates: Partial<RegistrationDraft>) => void
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

  const setDraft = useCallback((updates: Partial<RegistrationDraft>) => {
    setDraftState((prev) => ({ ...prev, ...updates }))
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
  }, [])

  const updateMember = useCallback((id: string, updates: Partial<JamaahDraft>) => {
    setDraftState((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }))
  }, [])

  const reset = useCallback(() => {
    setDraftState(defaultDraft)
  }, [])

  return (
    <RegistrationContext.Provider
      value={{
        draft,
        setDraft,
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
