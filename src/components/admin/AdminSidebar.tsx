'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  FileText,
  CreditCard,
  MapPin,
  FileBarChart,
  Download,
  Settings,
  ScrollText,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Drawer } from '@/components/ui/Drawer'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/pendaftaran', label: 'Pendaftaran & Jamaah', icon: ClipboardList },
  { href: '/admin/manifest', label: 'Manifest & Ekspor', icon: FileBarChart },
  { href: '/admin/pengaturan', label: 'Master Data & Dropdown', icon: Settings },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
]

function NavLink({
  item,
  onClick,
}: {
  item: (typeof NAV_ITEMS)[0]
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href)

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors',
        isActive
          ? 'bg-[var(--sidebar-item-active)] text-white'
          : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-white'
      )}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {item.label}
    </Link>
  )
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[var(--primary)] flex items-center justify-center">
            <span className="text-white text-xs font-bold">G</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Umrah Gontor</p>
            <p className="text-[10px] text-[var(--sidebar-text)]">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} onClick={onNavClick} />
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Keluar
        </button>
      </div>
    </div>
  )
}

export function AdminSidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[var(--sidebar-width)] bg-[var(--sidebar-bg)] flex-shrink-0 min-h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Buka menu"
        className="lg:hidden fixed top-3 left-4 z-40 p-2 rounded-[var(--radius-md)] bg-[var(--sidebar-bg)] text-white shadow-md"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile drawer */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <SidebarContent onNavClick={() => setDrawerOpen(false)} />
      </Drawer>
    </>
  )
}
