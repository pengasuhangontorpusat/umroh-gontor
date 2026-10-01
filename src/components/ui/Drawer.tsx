'use client'

import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  side?: 'left' | 'right'
}

export function Drawer({ isOpen, onClose, title, children, side = 'left' }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        className={cn(
          'absolute top-0 bottom-0 w-[240px] bg-[var(--sidebar-bg)] flex flex-col shadow-xl',
          'animate-slide-in',
          side === 'left' ? 'left-0' : 'right-0'
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
            <span className="text-sm font-semibold text-white">{title}</span>
            <button
              onClick={onClose}
              aria-label="Tutup menu"
              className="p-1 rounded text-[var(--sidebar-text)] hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
