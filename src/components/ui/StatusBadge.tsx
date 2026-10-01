import { cn } from '@/lib/utils'
import {
  DocumentStatus,
  DOCUMENT_STATUS_LABELS,
  GroupStatus,
  GROUP_STATUS_LABELS,
  PaymentStatus,
  PAYMENT_STATUS_LABELS,
} from '@/types'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface StatusBadgeProps {
  variant?: BadgeVariant
  label: string
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[var(--success-light)] text-[var(--success-foreground)]',
  warning: 'bg-[var(--warning-light)] text-[var(--warning-foreground)]',
  danger: 'bg-[var(--danger-light)] text-[var(--danger-foreground)]',
  info: 'bg-[var(--info-light)] text-[var(--info-foreground)]',
  neutral: 'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
}

export function StatusBadge({ variant = 'neutral', label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {label}
    </span>
  )
}

// ============================================================
// Typed badges
// ============================================================

function getGroupStatusVariant(status: GroupStatus): BadgeVariant {
  const map: Record<GroupStatus, BadgeVariant> = {
    draft: 'neutral',
    submitted: 'info',
    under_review: 'info',
    revision_required: 'warning',
    documents_incomplete: 'warning',
    payment_pending: 'warning',
    verified: 'success',
    ready_for_departure: 'success',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] ?? 'neutral'
}

function getDocumentStatusVariant(status: DocumentStatus): BadgeVariant {
  const map: Record<DocumentStatus, BadgeVariant> = {
    not_uploaded: 'neutral',
    uploaded: 'info',
    under_review: 'info',
    verified: 'success',
    revision_required: 'warning',
    rejected: 'danger',
  }
  return map[status] ?? 'neutral'
}

function getPaymentStatusVariant(status: PaymentStatus): BadgeVariant {
  const map: Record<PaymentStatus, BadgeVariant> = {
    pending: 'neutral',
    proof_uploaded: 'info',
    verified: 'success',
    rejected: 'danger',
  }
  return map[status] ?? 'neutral'
}

export function GroupStatusBadge({ status }: { status: GroupStatus }) {
  return (
    <StatusBadge
      variant={getGroupStatusVariant(status)}
      label={GROUP_STATUS_LABELS[status]}
    />
  )
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <StatusBadge
      variant={getDocumentStatusVariant(status)}
      label={DOCUMENT_STATUS_LABELS[status]}
    />
  )
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <StatusBadge
      variant={getPaymentStatusVariant(status)}
      label={PAYMENT_STATUS_LABELS[status]}
    />
  )
}
