import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, value, defaultValue, ...props }, ref) => {
    // If defaultValue is provided, it's an uncontrolled input
    // Otherwise, ensure value is never undefined so React doesn't switch from uncontrolled to controlled
    const resolvedValue = defaultValue !== undefined ? undefined : (value ?? '')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-[var(--text-primary)]"
          >
            {label}
            {props.required && (
              <span className="text-[var(--danger)] ml-0.5">*</span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          value={resolvedValue}
          defaultValue={defaultValue}
          className={cn(
            'h-[44px] w-full rounded-[var(--radius-md)] border border-slate-300 bg-white px-3 text-sm text-slate-900 font-medium placeholder:text-slate-400 shadow-xs',
            'transition-colors focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700',
            'disabled:bg-[var(--surface-muted)] disabled:text-slate-400 disabled:cursor-not-allowed',
            error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-[var(--text-muted)]">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
