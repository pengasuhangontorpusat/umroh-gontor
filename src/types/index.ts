// ============================================================
// TypeScript types matching the Supabase schema
// ============================================================

export type RegistrationType = 'individual' | 'family'

export type GroupStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'revision_required'
  | 'documents_incomplete'
  | 'payment_pending'
  | 'verified'
  | 'ready_for_departure'
  | 'completed'
  | 'cancelled'

export type DocumentType = 'ktp' | 'kk' | 'vaksin' | 'paspor' | 'bukti_bayar'

export type DocumentStatus =
  | 'not_uploaded'
  | 'uploaded'
  | 'under_review'
  | 'verified'
  | 'revision_required'
  | 'rejected'

export type PaymentType = 'dp' | 'full' | 'other'

export type PaymentStatus = 'pending' | 'proof_uploaded' | 'verified' | 'rejected'

export type PassportStatus = 'has_passport' | 'no_passport' | 'in_process'

export type Gender = 'male' | 'female'

export type MaritalStatus = 'single' | 'married' | 'widowed' | 'divorced'

// ============================================================
// Database row types
// ============================================================

export interface DeparturePoint {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Package {
  id: string
  name: string
  price: number
  dp_amount: number
  currency: string
  departure_date: string | null
  return_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PicInfo {
  name: string
  phone: string
  email: string
  domicile_city: string
  is_departing: boolean
}

export interface RegistrationGroup {
  id: string
  registration_code: string
  type: RegistrationType
  pic_jamaah_id: string | null
  departure_point_id: string | null
  package_id: string | null
  group_status: GroupStatus
  user_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // PIC info
  pic_info?: PicInfo
  pic_name?: string
  pic_phone?: string
  pic_email?: string
  pic_domicile_city?: string
  pic_is_departing?: boolean
  // Relations
  departure_point?: DeparturePoint
  package?: Package
  pic_jamaah?: Jamaah
  jamaahs?: Jamaah[]
  payments?: Payment[]
}

export interface Jamaah {
  id: string
  group_id: string
  registration_order: number
  full_name: string
  gender: Gender
  father_name: string | null
  nik: string | null
  passport_number: string | null
  passport_issue_place: string | null
  passport_issue_date: string | null
  passport_expiry_date: string | null
  passport_status: PassportStatus
  birth_place: string
  birth_date: string
  nationality: string
  marital_status: MaritalStatus | null
  occupation: string | null
  phone: string | null
  address: string | null
  province: string | null
  city: string | null
  district: string | null
  village: string | null
  relationship_to_pic: string | null
  has_disability?: boolean
  disability_description?: string | null
  medical_history?: string | null
  clothing_size?: string | null
  ktp_required: boolean
  created_at: string
  updated_at: string
  // Relations
  documents?: Document[]
}

export interface Document {
  id: string
  jamaah_id: string
  document_type: DocumentType
  drive_file_id: string | null
  drive_folder_id: string | null
  file_name: string | null
  mime_type: string | null
  file_size: number | null
  drive_web_view_url: string | null
  verification_status: DocumentStatus
  verification_note: string | null
  verified_by: string | null
  verified_at: string | null
  uploaded_at: string | null
  uploaded_by: string | null
  version: number
  previous_document_id: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  group_id: string
  payer_jamaah_id: string | null
  payment_type: PaymentType
  amount: number
  payment_date: string | null
  drive_file_id: string | null
  drive_web_view_url: string | null
  verification_status: PaymentStatus
  verification_note: string | null
  verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

export interface PanitiaProfile {
  id: string
  full_name: string
  role: 'admin' | 'panitia'
  is_active: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  actor_type: 'jamaah' | 'panitia' | 'system'
  action: string
  entity_type: string
  entity_id: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// ============================================================
// Form types (for registration wizard)
// ============================================================

export interface RegistrationFormData {
  type: RegistrationType
  departure_point_id: string
  package_id: string
  pic: JamaahFormData
  members: JamaahFormData[]
  payment: PaymentFormData
}

export interface JamaahFormData {
  full_name: string
  gender: Gender
  father_name: string
  nik: string
  birth_place: string
  birth_date: string
  nationality: string
  marital_status: MaritalStatus | ''
  occupation: string
  phone: string
  address: string
  province: string
  city: string
  district: string
  village: string
  relationship_to_pic: string
  passport_status: PassportStatus
  passport_number: string
  passport_issue_place: string
  passport_issue_date: string
  passport_expiry_date: string
  has_disability?: boolean
  disability_description?: string
  medical_history?: string
  clothing_size?: string
}

export interface PaymentFormData {
  payment_type: PaymentType
  payment_date: string
}

// ============================================================
// API response types
// ============================================================

export type CitizenshipType = 'wni' | 'wna'
export type DocumentAudience = 'all' | 'wni' | 'wna'

export interface DocumentRequirement {
  id: string
  name: string
  description: string
  icon: string
  isRequired: boolean
  isActive: boolean
  targetAudience?: DocumentAudience
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface UploadResult {
  drive_file_id: string
  drive_folder_id: string
  file_name: string
  mime_type: string
  file_size: number
  drive_web_view_url: string
}

// ============================================================
// Label maps
// ============================================================

export const GROUP_STATUS_LABELS: Record<GroupStatus, string> = {
  draft: 'Draft',
  submitted: 'Terkirim',
  under_review: 'Dalam Pemeriksaan',
  revision_required: 'Perlu Revisi',
  documents_incomplete: 'Dokumen Belum Lengkap',
  payment_pending: 'Menunggu Pembayaran',
  verified: 'Terverifikasi',
  ready_for_departure: 'Siap Berangkat',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  not_uploaded: 'Belum Diunggah',
  uploaded: 'Sudah Diunggah',
  under_review: 'Sedang Diperiksa',
  verified: 'Terverifikasi',
  revision_required: 'Perlu Diperbaiki',
  rejected: 'Ditolak',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Menunggu',
  proof_uploaded: 'Bukti Diunggah',
  verified: 'Terverifikasi',
  rejected: 'Ditolak',
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ktp: 'KTP',
  kk: 'Kartu Keluarga',
  vaksin: 'Kartu Vaksin',
  paspor: 'Paspor',
  bukti_bayar: 'Bukti Pembayaran',
}
