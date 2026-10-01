'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Email atau kata sandi tidak sesuai.')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-8 h-8 rounded bg-[var(--primary)] flex items-center justify-center">
            <span className="text-white text-sm font-bold">G</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Umrah 100 Tahun Gontor</p>
            <p className="text-xs text-[var(--text-muted)]">Panel Panitia</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-[var(--border)] rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-md)]">
          <div className="mb-5">
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Masuk</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Masuk sebagai panitia untuk mengakses panel administrasi.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="admin-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="panitia@gontor.ac.id"
            />
            <Input
              id="admin-password"
              label="Kata Sandi"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-[var(--danger-light)] rounded-[var(--radius-md)]">
                <AlertCircle className="w-4 h-4 text-[var(--danger)] flex-shrink-0" />
                <p className="text-sm text-[var(--danger-foreground)]">{error}</p>
              </div>
            )}

            <Button type="submit" fullWidth isLoading={loading} size="lg">
              Masuk
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
