import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function isKtpRequired(birthDate: string): boolean {
  return calculateAge(birthDate) >= 17
}

export function normalizePhone(phone: string): string {
  // Remove spaces, dashes, parentheses
  let normalized = phone.replace(/[\s\-()]/g, '')
  // Convert 08xx to 628xx
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1)
  }
  // Remove leading +
  if (normalized.startsWith('+')) {
    normalized = normalized.slice(1)
  }
  return normalized
}

export function maskNik(nik: string): string {
  if (!nik || nik.length < 6) return '***'
  return nik.slice(0, 6) + '**********'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface GroupPicResult {
  name: string
  phone: string
  email: string
  domicile_city: string
  is_departing: boolean
}

export function getGroupPic(group: any): GroupPicResult {
  if (!group) {
    return { name: '—', phone: '', email: '', domicile_city: '', is_departing: true }
  }

  // 1. Try parsing JSON stored in notes
  let picFromNotes: any = null
  if (typeof group.notes === 'string' && group.notes.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(group.notes)
      if (parsed?.pic && typeof parsed.pic === 'object') {
        picFromNotes = parsed.pic
      }
    } catch {}
  }

  const rawPicJamaah = group.pic_jamaah
  const picJamaah = Array.isArray(rawPicJamaah) ? rawPicJamaah[0] : rawPicJamaah

  const name =
    ((picFromNotes?.name as string) || '').trim() ||
    ((group.pic_name as string) || '').trim() ||
    ((picJamaah?.full_name as string) || '').trim() ||
    '—'

  const phone =
    ((picFromNotes?.phone as string) || '').trim() ||
    ((group.pic_phone as string) || '').trim() ||
    ((picJamaah?.phone as string) || '').trim() ||
    ''

  const email =
    ((picFromNotes?.email as string) || '').trim() ||
    ((group.pic_email as string) || '').trim() ||
    ''

  const domicile_city =
    ((picFromNotes?.domicile_city as string) || '').trim() ||
    ((group.pic_domicile_city as string) || '').trim() ||
    ''

  const is_departing =
    picFromNotes?.is_departing !== undefined
      ? Boolean(picFromNotes.is_departing)
      : group.pic_is_departing !== undefined
      ? Boolean(group.pic_is_departing)
      : Boolean(group.pic_jamaah_id || picJamaah)

  return { name, phone, email, domicile_city, is_departing }
}

