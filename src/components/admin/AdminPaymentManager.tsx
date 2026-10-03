'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentStatus } from '@/types'
import { PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { PaymentVerificationActions } from './PaymentVerificationActions'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  CreditCard,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Check,
  X,
  Loader2,
  Wallet,
} from 'lucide-react'

interface Props {
  groupId: string
  registrationCode: string
  packageData: {
    name?: string
    price?: number
    dp_amount?: number
  } | null
  jamaahCount: number
  initialPayments: Record<string, unknown>[]
}

export function AdminPaymentManager({
  groupId,
  registrationCode,
  packageData,
  jamaahCount,
  initialPayments,
}: Props) {
  const router = useRouter()
  const [payments, setPayments] = useState(initialPayments)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const count = Math.max(1, jamaahCount)
  const pkgPrice = packageData?.price ? Number(packageData.price) : 37200000
  const dpPrice = packageData?.dp_amount ? Number(packageData.dp_amount) : 5000000
  const totalBill = pkgPrice * count
  const minDp = dpPrice * count

  const verifiedPaid = payments
    .filter((p) => p.verification_status === 'verified')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const pendingPayments = payments.filter(
    (p) =>
      p.verification_status === 'proof_uploaded' ||
      (p.verification_status === 'pending' && Boolean(p.drive_file_id || p.drive_web_view_url))
  )
  const remainingBill = Math.max(0, totalBill - verifiedPaid)

  const isFullyPaid = verifiedPaid >= totalBill && totalBill > 0
  const isDpVerified = verifiedPaid >= minDp && !isFullyPaid
  const hasPendingProof = pendingPayments.length > 0
  const isOnlyRegistered = verifiedPaid === 0 && !hasPendingProof && payments.length === 0

  // Manual payment form state
  const [paymentForm, setPaymentForm] = useState({
    payment_type: (verifiedPaid >= minDp ? 'pelunasan' : 'dp') as 'dp' | 'pelunasan' | 'full',
    amount: verifiedPaid >= minDp ? remainingBill : minDp,
    payment_date: new Date().toISOString().split('T')[0],
    verification_status: 'verified' as 'verified' | 'pending',
    verification_note: 'Setor tunai / transfer langsung ke panitia',
  })

  const handleOpenModal = (presetType?: 'dp' | 'pelunasan' | 'full') => {
    const pType = presetType || (verifiedPaid >= minDp ? 'pelunasan' : 'dp')
    let defaultAmount = minDp
    if (pType === 'pelunasan') defaultAmount = remainingBill
    if (pType === 'full') defaultAmount = totalBill

    setPaymentForm({
      payment_type: pType,
      amount: defaultAmount,
      payment_date: new Date().toISOString().split('T')[0],
      verification_status: 'verified',
      verification_note: 'Dicatat manual oleh panitia',
    })
    setIsModalOpen(true)
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      alert('Nominal pembayaran wajib diisi dan harus lebih dari 0.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/record-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          payment_type: paymentForm.payment_type,
          amount: paymentForm.amount,
          payment_date: paymentForm.payment_date,
          verification_status: paymentForm.verification_status,
          verification_note: paymentForm.verification_note,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setPayments((prev) => [...prev, data.payment])
        setIsModalOpen(false)
        router.refresh()
        alert('Transaksi pembayaran berhasil dicatat!')
      } else {
        alert(data.error || 'Gagal mencatat transaksi pembayaran.')
      }
    } catch {
      alert('Terjadi kesalahan koneksi saat mencatat pembayaran.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl shadow-xs overflow-hidden space-y-0">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Status Keuangan & Riwayat Pembayaran
            </h3>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Paket: <span className="font-semibold text-slate-800">{packageData?.name || 'Paket Umrah'}</span> ({count} Jamaah)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isFullyPaid ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              LUNAS SEPENUHNYA
            </span>
          ) : isDpVerified ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              DP MASUK (SISA {formatCurrency(remainingBill)})
            </span>
          ) : hasPendingProof ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              PERLU VERIFIKASI BUKTI
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              BELUM BAYAR (HANYA DAFTAR SAJA)
            </span>
          )}

          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Catat Pembayaran Manual
          </button>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-[var(--border)] bg-white">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Tagihan Paket ({count} Jamaah)
          </p>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono">
            {formatCurrency(totalBill)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {count} x {formatCurrency(pkgPrice)} (Min DP: {formatCurrency(minDp)})
          </p>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
          <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
            <span>Dana Masuk (Terverifikasi)</span>
            {isFullyPaid && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </p>
          <p className="text-xl font-extrabold text-emerald-900 mt-1 font-mono">
            {formatCurrency(verifiedPaid)}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">
            {verifiedPaid > 0 ? '✓ Telah diverifikasi panitia' : 'Belum ada dana masuk'}
          </p>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            remainingBill === 0 ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/60 border-rose-200'
          }`}
        >
          <p className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
            Sisa Tagihan Pelunasan
          </p>
          <p className="text-xl font-extrabold text-rose-900 mt-1 font-mono">
            {formatCurrency(remainingBill)}
          </p>
          <p className="text-[11px] text-rose-700 mt-0.5">
            {remainingBill === 0 ? '✓ Pembayaran telah lunas' : 'Belum terlunasi'}
          </p>
        </div>
      </div>

      {/* Transaction List or Empty State */}
      <div className="p-5">
        {payments.length === 0 ? (
          <div className="py-8 px-4 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Pendaftar Ini Belum Memiliki Catatan Pembayaran (Hanya Mendaftar Saja)
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Rombongan dengan kode <strong>{registrationCode}</strong> baru melakukan submit pendaftaran formulir dan belum mengunggah bukti transfer. Jika jamaah telah menyetor tunai di kantor atau transfer offline, catat transaksinya di bawah.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenModal('dp')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                + Catat Pembayaran DP ({formatCurrency(minDp)})
              </button>
              <button
                type="button"
                onClick={() => handleOpenModal('full')}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                + Catat Langsung Lunas ({formatCurrency(totalBill)})
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Riwayat Transaksi Pembayaran ({payments.length})
              </p>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {payments.map((payment) => (
                <div
                  key={payment.id as string}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {payment.payment_type === 'full'
                          ? 'Pelunasan Penuh'
                          : payment.payment_type === 'pelunasan'
                          ? 'Pelunasan (Tahap 2)'
                          : 'Down Payment (DP)'}
                      </span>
                      <PaymentStatusBadge status={payment.verification_status as PaymentStatus} />
                    </div>
                    <p className="text-xl font-extrabold text-[var(--text-primary)] mt-1 font-mono">
                      {formatCurrency(payment.amount as number)}
                    </p>
                    {payment.payment_date != null && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Tanggal Bayar: {formatDate(String(payment.payment_date))}
                      </p>
                    )}
                    {Boolean(payment.verification_note) && (
                      <p className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded mt-1.5 inline-block">
                        Catatan: {String(payment.verification_note)}
                      </p>
                    )}
                    {payment.drive_web_view_url != null && String(payment.drive_web_view_url) && (
                      <div className="mt-2">
                        <a
                          href={String(payment.drive_web_view_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 hover:bg-emerald-100 inline-flex items-center gap-1 font-semibold transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Lihat Bukti Transfer
                        </a>
                      </div>
                    )}
                  </div>

                  <PaymentVerificationActions
                    paymentId={payment.id as string}
                    currentStatus={payment.verification_status as PaymentStatus}
                    verificationNote={payment.verification_note ? String(payment.verification_note) : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL CATAT PEMBAYARAN MANUAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-700" />
                <h4 className="text-sm font-bold text-slate-800">Catat Pembayaran Manual</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Pembayaran
                </label>
                <select
                  value={paymentForm.payment_type}
                  onChange={(e) => {
                    const nextType = e.target.value as 'dp' | 'pelunasan' | 'full'
                    let nextAmount = minDp
                    if (nextType === 'pelunasan') nextAmount = remainingBill
                    if (nextType === 'full') nextAmount = totalBill
                    setPaymentForm({ ...paymentForm, payment_type: nextType, amount: nextAmount })
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="dp">Down Payment (DP)</option>
                  <option value="pelunasan">Pelunasan (Tahap 2)</option>
                  <option value="full">Pembayaran Lunas Penuh</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Pembayaran (Rp)
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-mono font-bold"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Format: {formatCurrency(paymentForm.amount || 0)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Bayar
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Verifikasi
                  </label>
                  <select
                    value={paymentForm.verification_status}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        verification_status: e.target.value as 'verified' | 'pending',
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="verified">Diterima (Verified)</option>
                    <option value="pending">Menunggu Verifikasi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan Pembayaran
                </label>
                <input
                  type="text"
                  placeholder="Misal: Setor tunai kantor / Mandiri a.n. Ahmad"
                  value={paymentForm.verification_note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, verification_note: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Pembayaran'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
