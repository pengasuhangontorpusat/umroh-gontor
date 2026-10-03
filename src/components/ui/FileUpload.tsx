'use client'

import { cn } from '@/lib/utils'
import { useState, useCallback, useRef } from 'react'
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { formatFileSize, cn as cnUtil } from '@/lib/utils'
import { validateDocumentFile } from '@/lib/validations'

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

interface FileUploadProps {
  label?: string
  accept?: string
  onFileSelect: (file: File) => Promise<void>
  onFileRemove?: () => void
  currentFileName?: string
  currentFileUrl?: string
  disabled?: boolean
  className?: string
  id: string
}

export function FileUpload({
  label,
  accept = '.pdf,.jpg,.jpeg,.png',
  onFileSelect,
  onFileRemove,
  currentFileName,
  currentFileUrl,
  disabled = false,
  className,
  id,
}: FileUploadProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isCleared, setIsCleared] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setIsCleared(false)
      const validationError = validateDocumentFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      setFileName(file.name)
      setFileSize(file.size)
      setState('uploading')

      try {
        await onFileSelect(file)
        setState('success')
      } catch (err) {
        setState('error')
        setError('Dokumen belum berhasil diunggah. Silakan coba lagi.')
        console.error(err)
      }
    },
    [onFileSelect]
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleReset(e?: React.MouseEvent) {
    e?.preventDefault()
    e?.stopPropagation()
    setState('idle')
    setError(null)
    setFileName(null)
    setFileSize(null)
    setIsCleared(true)
    if (inputRef.current) inputRef.current.value = ''
    onFileRemove?.()
  }

  const effectiveFileName = isCleared ? null : (fileName || currentFileName)
  const isUploaded = (state === 'success' || (Boolean(currentFileName) && state === 'idle')) && Boolean(effectiveFileName) && !isCleared

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </label>
      )}

      {/* Uploaded state */}
      {isUploaded && effectiveFileName ? (
        <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
          <File className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-primary)] truncate">{effectiveFileName}</p>
            {fileSize && (
              <p className="text-xs text-[var(--text-muted)]">{formatFileSize(fileSize)}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentFileUrl && (
              <a
                href={currentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--primary)] hover:underline"
              >
                Lihat
              </a>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={handleReset}
                aria-label="Ganti file"
                className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : state === 'uploading' ? (
        /* Uploading state */
        <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
          <Loader2 className="w-4 h-4 text-[var(--primary)] animate-spin flex-shrink-0" />
          <p className="text-sm text-[var(--text-secondary)]">Sedang mengunggah dokumen...</p>
        </div>
      ) : (
        /* Idle / dropzone */
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
          aria-label={`Upload ${label || 'dokumen'}`}
          className={cn(
            'flex flex-col items-center justify-center gap-2 p-6 rounded-[var(--radius-md)] border-2 border-dashed transition-colors cursor-pointer',
            isDragOver
              ? 'border-[var(--primary)] bg-[var(--primary-light)]'
              : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface)]',
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
          )}
        >
          <Upload className="w-6 h-6 text-[var(--text-muted)]" />
          <div className="text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="hidden md:inline">Seret & lepas file di sini, atau </span>
              <span className="text-[var(--primary)] font-medium">pilih file</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">PDF, JPG, PNG · Maks. 10MB</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="flex items-center gap-2 p-2 rounded-[var(--radius-sm)] bg-[var(--danger-light)]">
          <AlertCircle className="w-4 h-4 text-[var(--danger)] flex-shrink-0" />
          <p className="text-xs text-[var(--danger-foreground)]">{error}</p>
        </div>
      )}

      {error && state !== 'error' && (
        <p className="text-xs text-[var(--danger)]">{error}</p>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        aria-hidden="true"
      />
    </div>
  )
}
