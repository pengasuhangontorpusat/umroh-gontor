'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

export interface Step {
  id: number
  label: string
}

interface ProgressStepsProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <nav
      aria-label="Progress pendaftaran"
      className={cn('w-full', className)}
    >
      {/* Desktop: horizontal */}
      <ol className="hidden md:flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep
          const isActive = step.id === currentStep
          const isLast = index === steps.length - 1

          return (
            <li
              key={step.id}
              className={cn('flex items-center', !isLast && 'flex-1')}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-colors',
                    isCompleted &&
                      'bg-[var(--primary)] text-white',
                    isActive &&
                      'border-2 border-[var(--primary)] text-[var(--primary)] bg-white',
                    !isCompleted &&
                      !isActive &&
                      'border-2 border-[var(--border)] text-[var(--text-muted)] bg-white'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span>{String(step.id).padStart(2, '0')}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm whitespace-nowrap',
                    isActive
                      ? 'font-semibold text-[var(--text-primary)]'
                      : isCompleted
                      ? 'text-[var(--text-secondary)]'
                      : 'text-[var(--text-muted)]'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-px mx-3',
                    isCompleted ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>

      {/* Mobile: compact */}
      <div className="md:hidden flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--primary)]">
            Langkah {currentStep} dari {steps.length}
          </span>
          <span className="text-sm text-[var(--text-muted)]">
            — {steps.find((s) => s.id === currentStep)?.label}
          </span>
        </div>
        <div className="flex gap-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                'h-1.5 rounded-full transition-all',
                step.id < currentStep
                  ? 'bg-[var(--primary)] w-4'
                  : step.id === currentStep
                  ? 'bg-[var(--primary)] w-6'
                  : 'bg-[var(--border)] w-4'
              )}
            />
          ))}
        </div>
      </div>
    </nav>
  )
}
