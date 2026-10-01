import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { ReactNode } from 'react'

import { headers } from 'next/headers'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''

  // If this is the login page, render children directly without admin sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isDevPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder')

  let redirectDestination = ''

  // In live production mode with real Supabase credentials, verify authenticated user
  if (!isDevPlaceholder) {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        redirectDestination = '/admin/login'
      } else {
        // Check panitia profile
        const { data: profile } = await supabase
          .from('panitia_profiles')
          .select('*')
          .eq('id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (!profile) {
          // If no profile exists yet, check with service client and auto-provision the first user as admin
          const serviceClient = await createServiceClient()
          const { count } = await serviceClient
            .from('panitia_profiles')
            .select('*', { count: 'exact', head: true })

          if (!count || count === 0) {
            // First user becomes admin automatically
            await serviceClient.from('panitia_profiles').insert({
              id: user.id,
              full_name: user.email?.split('@')[0] || 'Administrator',
              role: 'admin',
              is_active: true,
            })
          } else {
            await supabase.auth.signOut()
            redirectDestination = '/admin/login?error=unauthorized'
          }
        }
      }
    } catch (err) {
      console.error('Admin layout auth error:', err)
      redirectDestination = '/admin/login'
    }
  }

  if (redirectDestination) {
    redirect(redirectDestination)
  }

  return (
    <div className="flex min-h-screen bg-[var(--surface)]">
      <AdminSidebar />
      <main className="flex-1 min-w-0 lg:pl-0 pl-0">
        <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-8">{children}</div>
      </main>
    </div>
  )
}
