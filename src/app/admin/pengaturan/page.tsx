'use client'

import { useState, useEffect } from 'react'
import {
  MapPin,
  Layers,
  CreditCard,
  Sliders,
  Plus,
  Trash2,
  CheckCircle,
  Save,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

// Default mock data for master items
const INITIAL_DEPARTURE_POINTS = [
  { id: '1', code: 'JKT', name: 'Jakarta (Soekarno-Hatta / CGK)', quota: 350, isActive: true },
  { id: '2', code: 'SUB', name: 'Surabaya (Juanda / SUB)', quota: 250, isActive: true },
  { id: '3', code: 'SOC', name: 'Solo / Gontor (Adi Soemarmo / SOC)', quota: 200, isActive: true },
  { id: '4', code: 'KNO', name: 'Medan (Kualanamu / KNO)', quota: 100, isActive: true },
  { id: '5', code: 'UPG', name: 'Makassar (Sultan Hasanuddin / UPG)', quota: 100, isActive: true },
]

const INITIAL_PACKAGES = [
  {
    id: '1',
    name: 'Paket Quad (Sekamar 4 Orang)',
    roomType: 'Quad',
    price: 37200000,
    dpAmount: 5000000,
    description: 'Akomodasi standar hotel bintang 5 sekamar berempat.',
    isActive: true,
  },
  {
    id: '2',
    name: 'Paket Triple (Sekamar 3 Orang)',
    roomType: 'Triple',
    price: 39500000,
    dpAmount: 5000000,
    description: 'Akomodasi hotel bintang 5 sekamar bertiga.',
    isActive: true,
  },
  {
    id: '3',
    name: 'Paket Double (Sekamar 2 Orang)',
    roomType: 'Double',
    price: 42000000,
    dpAmount: 5000000,
    description: 'Akomodasi hotel bintang 5 sekamar berdua (khusus pasangan suami-istri/keluarga).',
    isActive: true,
  },
]

const INITIAL_BANK_ACCOUNTS = [
  {
    id: '1',
    bankName: 'Bank Syariah Indonesia (BSI)',
    accountNumber: '7100100100',
    accountHolder: 'PANITIA UMRAH 100 TAHUN GONTOR',
    isActive: true,
  },
  {
    id: '2',
    bankName: 'Bank Mandiri',
    accountNumber: '1370010010012',
    accountHolder: 'YAYASAN PEMELIHARAAN DAN PERLUASAN PONDOK MODERN GONTOR',
    isActive: true,
  },
]

export default function MasterSettingsPage() {
  const [activeTab, setActiveTab] = useState<'departure' | 'packages' | 'banks' | 'general'>('departure')
  
  // Data states
  const [departurePoints, setDeparturePoints] = useState(INITIAL_DEPARTURE_POINTS)
  const [packages, setPackages] = useState(INITIAL_PACKAGES)
  const [bankAccounts, setBankAccounts] = useState(INITIAL_BANK_ACCOUNTS)
  const [generalSettings, setGeneralSettings] = useState({
    registrationOpen: true,
    totalQuota: 1000,
    dpMinimum: 5000000,
    helpdeskWhatsapp: '081234567890',
    contactEmail: 'umrah100@gontor.ac.id',
    notes: 'Pendaftaran gelombang 1 dibuka sampai kuota 1.000 jamaah terpenuhi.',
  })

  // Notifications
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fetch real data on mount
  useEffect(() => {
    fetch('/api/admin/settings/departure-points')
      .then((res) => res.json())
      .then((data) => {
        if (data.departure_points && data.departure_points.length > 0) {
          setDeparturePoints(
            data.departure_points.map((dp: { id: string; code: string; name: string; sort_order: number; is_active: boolean }) => ({
              id: dp.id,
              code: dp.code,
              name: dp.name,
              quota: dp.sort_order * 100 || 100,
              isActive: dp.is_active,
            }))
          )
        }
      })
      .catch((err) => console.error('Fetch departure points failed:', err))

    fetch('/api/admin/settings/packages')
      .then((res) => res.json())
      .then((data) => {
        if (data.packages && data.packages.length > 0) {
          setPackages(
            data.packages.map((p: { id: string; name: string; price: number; dp_amount: number; departure_date?: string; is_active: boolean }) => ({
              id: p.id,
              name: p.name,
              roomType: p.name.includes('Double') ? 'Double' : p.name.includes('Triple') ? 'Triple' : 'Quad',
              price: Number(p.price),
              dpAmount: Number(p.dp_amount),
              description: p.departure_date ? `Keberangkatan: ${p.departure_date}` : 'Akomodasi hotel bintang 5.',
              isActive: p.is_active,
            }))
          )
        }
      })
      .catch((err) => console.error('Fetch packages failed:', err))
  }, [])

  // Modals
  const [isAddDepartureOpen, setIsAddDepartureOpen] = useState(false)
  const [newDeparture, setNewDeparture] = useState({ code: '', name: '', quota: 50 })

  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false)
  const [newPackage, setNewPackage] = useState({
    name: '',
    roomType: 'Quad',
    price: 37200000,
    dpAmount: 5000000,
    description: '',
  })

  const [isAddBankOpen, setIsAddBankOpen] = useState(false)
  const [newBank, setNewBank] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
  })

  const triggerSaveNotification = () => {
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  // Departure Handlers
  const handleAddDeparture = async () => {
    if (!newDeparture.name || !newDeparture.code) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings/departure-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newDeparture.code.toUpperCase(),
          name: newDeparture.name,
          quota: Number(newDeparture.quota) || 50,
          sort_order: departurePoints.length + 1,
          is_active: true,
        }),
      })
      const data = await res.json()
      if (res.ok && data.departure_point) {
        setDeparturePoints((prev) => [
          ...prev,
          {
            id: data.departure_point.id,
            code: data.departure_point.code,
            name: data.departure_point.name,
            quota: Number(newDeparture.quota) || 50,
            isActive: data.departure_point.is_active,
          },
        ])
        setNewDeparture({ code: '', name: '', quota: 50 })
        setIsAddDepartureOpen(false)
        triggerSaveNotification()
      } else {
        alert(data.error || 'Gagal menambahkan lokasi keberangkatan.')
      }
    } catch {
      alert('Terjadi kesalahan koneksi.')
    } finally {
      setLoading(false)
    }
  }

  const toggleDeparture = async (id: string) => {
    const item = departurePoints.find((dp) => dp.id === id)
    if (!item) return
    const newActive = !item.isActive
    setDeparturePoints((prev) =>
      prev.map((dp) => (dp.id === id ? { ...dp, isActive: newActive } : dp))
    )
    try {
      await fetch('/api/admin/settings/departure-points', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: newActive }),
      })
      triggerSaveNotification()
    } catch {
      // rollback if failed
      setDeparturePoints((prev) =>
        prev.map((dp) => (dp.id === id ? { ...dp, isActive: !newActive } : dp))
      )
    }
  }

  const deleteDeparture = async (id: string) => {
    if (!confirm('Hapus titik keberangkatan ini?')) return
    try {
      const res = await fetch(`/api/admin/settings/departure-points?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        if (data.softDeleted) {
          alert(data.message)
          setDeparturePoints((prev) =>
            prev.map((dp) => (dp.id === id ? { ...dp, isActive: false } : dp))
          )
        } else {
          setDeparturePoints((prev) => prev.filter((dp) => dp.id !== id))
        }
        triggerSaveNotification()
      } else {
        alert(data.error || 'Gagal menghapus lokasi.')
      }
    } catch {
      alert('Terjadi kesalahan koneksi.')
    }
  }

  // Package Handlers
  const handleAddPackage = async () => {
    if (!newPackage.name) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPackage.name,
          price: Number(newPackage.price) || 0,
          dp_amount: Number(newPackage.dpAmount) || 5000000,
          is_active: true,
        }),
      })
      const data = await res.json()
      if (res.ok && data.package) {
        setPackages((prev) => [
          ...prev,
          {
            id: data.package.id,
            name: data.package.name,
            roomType: newPackage.roomType,
            price: Number(data.package.price),
            dpAmount: Number(data.package.dp_amount),
            description: newPackage.description || 'Akomodasi hotel bintang 5.',
            isActive: data.package.is_active,
          },
        ])
        setNewPackage({ name: '', roomType: 'Quad', price: 37200000, dpAmount: 5000000, description: '' })
        setIsAddPackageOpen(false)
        triggerSaveNotification()
      } else {
        alert(data.error || 'Gagal menambahkan paket.')
      }
    } catch {
      alert('Terjadi kesalahan koneksi.')
    } finally {
      setLoading(false)
    }
  }

  const togglePackage = async (id: string) => {
    const item = packages.find((p) => p.id === id)
    if (!item) return
    const newActive = !item.isActive
    setPackages((prev) =>
      prev.map((pkg) => (pkg.id === id ? { ...pkg, isActive: newActive } : pkg))
    )
    try {
      await fetch('/api/admin/settings/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: newActive }),
      })
      triggerSaveNotification()
    } catch {
      setPackages((prev) =>
        prev.map((pkg) => (pkg.id === id ? { ...pkg, isActive: !newActive } : pkg))
      )
    }
  }

  const deletePackage = async (id: string) => {
    if (!confirm('Hapus paket kamar ini?')) return
    try {
      const res = await fetch(`/api/admin/settings/packages?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        if (data.softDeleted) {
          alert(data.message)
          setPackages((prev) =>
            prev.map((pkg) => (pkg.id === id ? { ...pkg, isActive: false } : pkg))
          )
        } else {
          setPackages((prev) => prev.filter((pkg) => pkg.id !== id))
        }
        triggerSaveNotification()
      } else {
        alert(data.error || 'Gagal menghapus paket.')
      }
    } catch {
      alert('Terjadi kesalahan koneksi.')
    }
  }

  // Bank Handlers
  const handleAddBank = () => {
    if (!newBank.bankName || !newBank.accountNumber) return
    setBankAccounts([
      ...bankAccounts,
      {
        id: String(Date.now()),
        bankName: newBank.bankName,
        accountNumber: newBank.accountNumber,
        accountHolder: newBank.accountHolder.toUpperCase(),
        isActive: true,
      },
    ])
    setNewBank({ bankName: '', accountNumber: '', accountHolder: '' })
    setIsAddBankOpen(false)
    triggerSaveNotification()
  }

  const toggleBank = (id: string) => {
    setBankAccounts(bankAccounts.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b)))
    triggerSaveNotification()
  }

  const deleteBank = (id: string) => {
    if (confirm('Hapus rekening bank ini?')) {
      setBankAccounts(bankAccounts.filter((b) => b.id !== id))
      triggerSaveNotification()
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pengaturan Master Data & Dropdown</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Kelola opsi dropdown formulir pendaftaran, titik keberangkatan, paket harga kamar, dan rekening bank.
          </p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm border border-emerald-200">
            <CheckCircle className="w-4 h-4" />
            <span>Perubahan berhasil disimpan!</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[var(--border)] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('departure')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'departure'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Titik Keberangkatan ({departurePoints.length})
        </button>

        <button
          onClick={() => setActiveTab('packages')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'packages'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers className="w-4 h-4" />
          Paket & Tipe Kamar ({packages.length})
        </button>

        <button
          onClick={() => setActiveTab('banks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'banks'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Rekening Pembayaran ({bankAccounts.length})
        </button>

        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'general'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Parameter Pendaftaran
        </button>
      </div>

      {/* TAB 1: TITIK KEBERANGKATAN */}
      {activeTab === 'departure' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Opsi Titik Keberangkatan</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Dropdown titik kumpul/embarkasi bandara yang dapat dipilih oleh jamaah pada Step 3 Pendaftaran.
              </p>
            </div>
            <Button onClick={() => setIsAddDepartureOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Tambah Titik Kumpul
            </Button>
          </div>

          <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-[var(--border)] text-xs text-[var(--text-secondary)] uppercase">
                <tr>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Nama Embarkasi / Bandara</th>
                  <th className="px-4 py-3">Alokasi Kuota</th>
                  <th className="px-4 py-3">Status Dropdown</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {departurePoints.map((dp) => (
                  <tr key={dp.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5 font-mono font-semibold text-[var(--primary)]">{dp.code}</td>
                    <td className="px-4 py-3.5 font-medium text-[var(--text-primary)]">{dp.name}</td>
                    <td className="px-4 py-3.5 text-[var(--text-secondary)]">{dp.quota} Jamaah</td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => toggleDeparture(dp.id)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          dp.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {dp.isActive ? '● Aktif di Dropdown' : '○ Dinonaktifkan'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => deleteDeparture(dp.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Hapus opsi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PAKET & TIPE KAMAR */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Daftar Paket & Opsi Kamar</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Konfigurasi harga, minimal DP, dan jenis kamar (Quad, Triple, Double) yang tampil pada formulir.
              </p>
            </div>
            <Button onClick={() => setIsAddPackageOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Tambah Paket
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white border border-[var(--border)] rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[var(--primary)] border border-emerald-200">
                      {pkg.roomType}
                    </span>
                    <button
                      onClick={() => togglePackage(pkg.id)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        pkg.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {pkg.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)] text-base mt-2">{pkg.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{pkg.description}</p>
                  
                  <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">Harga / Jamaah:</span>
                      <span className="font-bold text-[var(--primary)]">
                        Rp {pkg.price.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">DP Minimum:</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        Rp {pkg.dpAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex justify-end">
                  <button
                    onClick={() => deletePackage(pkg.id)}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REKENING BANK */}
      {activeTab === 'banks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Rekening Pembayaran Resmi Panitia</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Nomor rekening yang ditampilkan pada Step 5 Pembayaran untuk transfer DP dan pelunasan.
              </p>
            </div>
            <Button onClick={() => setIsAddBankOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Tambah Rekening
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bankAccounts.map((bank) => (
              <div
                key={bank.id}
                className="bg-white border border-[var(--border)] rounded-xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[var(--text-primary)]">{bank.bankName}</span>
                  <button
                    onClick={() => toggleBank(bank.id)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      bank.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {bank.isActive ? 'Ditampilkan' : 'Disembunyikan'}
                  </button>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-[var(--border)] space-y-1">
                  <p className="text-xs text-[var(--text-secondary)]">Nomor Rekening</p>
                  <p className="font-mono font-bold text-base text-[var(--primary)]">{bank.accountNumber}</p>
                  <p className="text-xs text-[var(--text-secondary)] pt-1">Atas Nama</p>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{bank.accountHolder}</p>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => deleteBank(bank.id)}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: GENERAL PARAMETERS */}
      {activeTab === 'general' && (
        <div className="bg-white border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Parameter Sistem & Kuota Pendaftaran</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Pengaturan operasional portal pendaftaran umrah.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-[var(--border)]">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Status Pembukaan Pendaftaran</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Jika dinonaktifkan, formulir pendaftaran baru akan ditutup untuk publik.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGeneralSettings({ ...generalSettings, registrationOpen: !generalSettings.registrationOpen })
                  triggerSaveNotification()
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  generalSettings.registrationOpen ? 'bg-[var(--primary)]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    generalSettings.registrationOpen ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Target Kuota Total Jamaah"
                type="number"
                value={generalSettings.totalQuota}
                onChange={(e) => setGeneralSettings({ ...generalSettings, totalQuota: Number(e.target.value) })}
              />
              <Input
                label="Nominal Minimum DP (Rp)"
                type="number"
                value={generalSettings.dpMinimum}
                onChange={(e) => setGeneralSettings({ ...generalSettings, dpMinimum: Number(e.target.value) })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="WhatsApp Customer Care / Panitia"
                type="tel"
                value={generalSettings.helpdeskWhatsapp}
                onChange={(e) => setGeneralSettings({ ...generalSettings, helpdeskWhatsapp: e.target.value })}
              />
              <Input
                label="Email Bantuan"
                type="email"
                value={generalSettings.contactEmail}
                onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Pengumuman / Catatan Header Pendaftaran
              </label>
              <textarea
                rows={3}
                value={generalSettings.notes}
                onChange={(e) => setGeneralSettings({ ...generalSettings, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={triggerSaveNotification}>
                <Save className="w-4 h-4 mr-1.5" />
                Simpan Parameter
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Titik Keberangkatan */}
      <Modal
        isOpen={isAddDepartureOpen}
        onClose={() => setIsAddDepartureOpen(false)}
        title="Tambah Titik Keberangkatan / Embarkasi"
      >
        <div className="space-y-4">
          <Input
            label="Kode Bandara (3 Huruf)"
            placeholder="Misal: BPN, BDJ, PLM"
            maxLength={5}
            value={newDeparture.code}
            onChange={(e) => setNewDeparture({ ...newDeparture, code: e.target.value })}
          />
          <Input
            label="Nama Kota / Embarkasi"
            placeholder="Misal: Balikpapan (Sepinggan / BPN)"
            value={newDeparture.name}
            onChange={(e) => setNewDeparture({ ...newDeparture, name: e.target.value })}
          />
          <Input
            label="Alokasi Kuota Seat"
            type="number"
            placeholder="50"
            value={newDeparture.quota}
            onChange={(e) => setNewDeparture({ ...newDeparture, quota: Number(e.target.value) })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsAddDepartureOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddDeparture}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Tambah Paket Kamar */}
      <Modal
        isOpen={isAddPackageOpen}
        onClose={() => setIsAddPackageOpen(false)}
        title="Tambah Paket & Tipe Kamar"
      >
        <div className="space-y-4">
          <Input
            label="Nama Paket"
            placeholder="Misal: Paket Khusus Alumni Gontor"
            value={newPackage.name}
            onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
          />
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Tipe Kamar</label>
            <select
              value={newPackage.roomType}
              onChange={(e) => setNewPackage({ ...newPackage, roomType: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="Quad">Quad (4 Orang)</option>
              <option value="Triple">Triple (3 Orang)</option>
              <option value="Double">Double (2 Orang)</option>
              <option value="Single">Single (1 Orang)</option>
            </select>
          </div>
          <Input
            label="Harga Total per Jamaah (Rp)"
            type="number"
            value={newPackage.price}
            onChange={(e) => setNewPackage({ ...newPackage, price: Number(e.target.value) })}
          />
          <Input
            label="Minimal DP per Jamaah (Rp)"
            type="number"
            value={newPackage.dpAmount}
            onChange={(e) => setNewPackage({ ...newPackage, dpAmount: Number(e.target.value) })}
          />
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Deskripsi Fasilitas</label>
            <textarea
              rows={2}
              value={newPackage.description}
              onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Fasilitas kamar, hotel, dll."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsAddPackageOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddPackage}>Simpan Paket</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Tambah Rekening Bank */}
      <Modal
        isOpen={isAddBankOpen}
        onClose={() => setIsAddBankOpen(false)}
        title="Tambah Rekening Bank Resmi"
      >
        <div className="space-y-4">
          <Input
            label="Nama Bank"
            placeholder="Misal: Bank Syariah Indonesia (BSI)"
            value={newBank.bankName}
            onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
          />
          <Input
            label="Nomor Rekening"
            placeholder="1234567890"
            value={newBank.accountNumber}
            onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
          />
          <Input
            label="Atas Nama Rekening"
            placeholder="PANITIA 100 TAHUN GONTOR"
            value={newBank.accountHolder}
            onChange={(e) => setNewBank({ ...newBank, accountHolder: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsAddBankOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddBank}>Simpan Rekening</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
