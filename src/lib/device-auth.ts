import crypto from 'crypto'

const AUTH_SECRET =
  process.env.DEVICE_AUTH_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'umroh-100-thn-gontor-device-salt-key-2026'

// In-memory rate limiting for security gate attempts: IP/code -> { attempts: number, lockUntil: number }
const failedAttemptsMap = new Map<string, { attempts: number; lockUntil: number }>()

export function cleanPhoneDigits(phone: string): string {
  return (phone || '').replace(/\D/g, '')
}

export function getPhoneLast4(phone: string): string {
  const digits = cleanPhoneDigits(phone)
  return digits.length >= 4 ? digits.slice(-4) : digits
}

export function generateDeviceToken(code: string, phone: string): string {
  const last4 = getPhoneLast4(phone)
  return crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${code.toUpperCase().trim()}:${last4}`)
    .digest('hex')
}

export function verifyDeviceToken(code: string, phone: string, token: string): boolean {
  if (!token || !code || !phone) return false
  const expected = generateDeviceToken(code, phone)
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}

export function maskName(name: string): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  return parts
    .map((p) => {
      if (p.length <= 2) return p
      return p.slice(0, 2) + '*'.repeat(Math.min(p.length - 2, 4))
    })
    .join(' ')
}

export function maskPhone(phone: string): string {
  const digits = cleanPhoneDigits(phone)
  if (digits.length < 4) return '••••'
  const last2 = digits.slice(-2)
  return `••••••••${last2}`
}

/**
 * Rate limit check: max 5 failed attempts per 15 minutes.
 */
export function checkRateLimit(key: string): { isLocked: boolean; remainingMinutes: number } {
  const now = Date.now()
  const record = failedAttemptsMap.get(key)
  if (!record) return { isLocked: false, remainingMinutes: 0 }

  if (record.lockUntil > now) {
    const remainingMinutes = Math.ceil((record.lockUntil - now) / 60000)
    return { isLocked: true, remainingMinutes }
  }

  // Lock expired
  if (record.lockUntil <= now && record.attempts >= 5) {
    failedAttemptsMap.delete(key)
  }

  return { isLocked: false, remainingMinutes: 0 }
}

export function recordFailedAttempt(key: string): { isLocked: boolean; remainingAttempts: number } {
  const now = Date.now()
  const record = failedAttemptsMap.get(key) || { attempts: 0, lockUntil: 0 }
  record.attempts += 1

  if (record.attempts >= 5) {
    record.lockUntil = now + 15 * 60 * 1000 // lock for 15 minutes
    failedAttemptsMap.set(key, record)
    return { isLocked: true, remainingAttempts: 0 }
  }

  failedAttemptsMap.set(key, record)
  return { isLocked: false, remainingAttempts: 5 - record.attempts }
}

export function resetFailedAttempts(key: string) {
  failedAttemptsMap.delete(key)
}
