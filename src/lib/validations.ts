import { z } from 'zod'

// ============================================================
// Jamaah form validation
// ============================================================

export const jamaahSchema = z.object({
  full_name: z.string().min(2, 'Nama lengkap minimal 2 karakter').max(200),
  gender: z.enum(['male', 'female'], { required_error: 'Jenis kelamin wajib dipilih' }),
  father_name: z.string().max(200).optional().or(z.literal('')),
  nik: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.length === 16, {
      message: 'NIK harus 16 digit',
    })
    .refine((val) => !val || /^\d{16}$/.test(val), {
      message: 'NIK hanya boleh berisi angka',
    }),
  birth_place: z.string().min(2, 'Tempat lahir wajib diisi'),
  birth_date: z
    .string()
    .min(1, 'Tanggal lahir wajib diisi')
    .refine((val) => new Date(val) < new Date(), {
      message: 'Tanggal lahir tidak boleh di masa depan',
    }),
  nationality: z.string().default('Indonesia'),
  marital_status: z
    .enum(['single', 'married', 'widowed', 'divorced'])
    .optional()
    .or(z.literal('')),
  occupation: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  province: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  district: z.string().optional().or(z.literal('')),
  village: z.string().optional().or(z.literal('')),
  relationship_to_pic: z.string().optional().or(z.literal('')),
  passport_status: z.enum(['has_passport', 'no_passport', 'in_process']).default('no_passport'),
  passport_number: z.string().max(20).optional().or(z.literal('')),
  passport_issue_place: z.string().max(100).optional().or(z.literal('')),
  passport_issue_date: z.string().optional().or(z.literal('')),
  passport_expiry_date: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || new Date(val) > new Date(),
      { message: 'Paspor sudah kedaluwarsa' }
    ),
  has_disability: z.boolean().default(false),
  disability_description: z.string().max(500).optional().or(z.literal('')),
  medical_history: z.string().max(500).optional().or(z.literal('')),
  clothing_size: z.string().optional().or(z.literal('')),
})

export type JamaahFormValues = z.infer<typeof jamaahSchema>

// ============================================================
// Registration type selection
// ============================================================

export const registrationTypeSchema = z.object({
  type: z.enum(['individual', 'family'], { required_error: 'Pilih jenis pendaftaran' }),
})

// ============================================================
// PIC / contact data
// ============================================================

export const picSchema = z.object({
  full_name: z.string().min(2, 'Nama wajib diisi'),
  phone: z
    .string()
    .min(9, 'Nomor WhatsApp minimal 9 digit')
    .regex(/^[\d\s\-+()]+$/, 'Format nomor telepon tidak valid'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  domicile_city: z.string().min(2, 'Kota domisili wajib diisi'),
  departure_point_id: z.string().min(1, 'Pilih titik keberangkatan'),
  package_id: z.string().optional().default('99999999-9999-9999-9999-999999999999'),
})

export type PicFormValues = z.infer<typeof picSchema>

// ============================================================
// Payment
// ============================================================

export const paymentSchema = z.object({
  payment_type: z.enum(['dp', 'full'], { required_error: 'Pilih jenis pembayaran' }),
  payment_date: z.string().min(1, 'Tanggal pembayaran wajib diisi'),
})

export type PaymentFormValues = z.infer<typeof paymentSchema>

// ============================================================
// Document upload
// ============================================================

export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export function validateDocumentFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Format file tidak didukung. Gunakan PDF, JPG, atau PNG.'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Ukuran file maksimal ${MAX_FILE_SIZE_MB}MB.`
  }
  return null
}
