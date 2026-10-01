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
  HardDrive,
  Upload,
  Key,
  RefreshCw,
  FileCode,
  Check,
  Loader2,
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
  const [activeTab, setActiveTab] = useState<'departure' | 'packages' | 'banks' | 'drive' | 'general'>('departure')
  
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

  // Google Drive state
  const [driveConfig, setDriveConfig] = useState({
    client_email: '',
    private_key: '',
    root_folder_id: '',
    shared_drive_id: '',
    source: 'env',
    updated_at: '',
  })
  const [isTestingDrive, setIsTestingDrive] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    folder_name?: string
  } | null>(null)
  const [isSavingDrive, setIsSavingDrive] = useState(false)
  const [isSavingGeneral, setIsSavingGeneral] = useState(false)

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

    fetch('/api/admin/settings/drive')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setDriveConfig({
            client_email: data.config.client_email || '',
            private_key: data.config.private_key || '',
            root_folder_id: data.config.root_folder_id || '',
            shared_drive_id: data.config.shared_drive_id || '',
            source: data.config.source || 'env',
            updated_at: data.config.updated_at || '',
          })
        }
      })
      .catch((err) => console.error('Fetch drive config failed:', err))

    fetch('/api/admin/settings/general')
      .then((res) => res.json())
      .then((data) => {
        if (data.parameters) {
          setGeneralSettings(data.parameters)
        }
      })
      .catch((err) => console.error('Fetch general settings failed:', err))

    fetch('/api/admin/settings/banks')
      .then((res) => res.json())
      .then((data) => {
        if (data.banks && Array.isArray(data.banks) && data.banks.length > 0) {
          setBankAccounts(data.banks)
        }
      })
      .catch((err) => console.error('Fetch banks failed:', err))
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
  const saveBanksToDb = async (newBanks: typeof bankAccounts) => {
    try {
      await fetch('/api/admin/settings/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banks: newBanks }),
      })
    } catch (err) {
      console.error('Failed to sync bank accounts to DB:', err)
    }
  }

  const handleAddBank = () => {
    if (!newBank.bankName || !newBank.accountNumber) return
    const updated = [
      ...bankAccounts,
      {
        id: String(Date.now()),
        bankName: newBank.bankName,
        accountNumber: newBank.accountNumber,
        accountHolder: newBank.accountHolder.toUpperCase(),
        isActive: true,
      },
    ]
    setBankAccounts(updated)
    saveBanksToDb(updated)
    setNewBank({ bankName: '', accountNumber: '', accountHolder: '' })
    setIsAddBankOpen(false)
    triggerSaveNotification()
  }

  const toggleBank = (id: string) => {
    const updated = bankAccounts.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    setBankAccounts(updated)
    saveBanksToDb(updated)
    triggerSaveNotification()
  }

  const deleteBank = (id: string) => {
    if (confirm('Hapus rekening bank ini?')) {
      const updated = bankAccounts.filter((b) => b.id !== id)
      setBankAccounts(updated)
      saveBanksToDb(updated)
      triggerSaveNotification()
    }
  }

  // General Settings Handler
  const handleSaveGeneralSettings = async () => {
    setIsSavingGeneral(true)
    try {
      const res = await fetch('/api/admin/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generalSettings),
      })
      const data = await res.json()
      if (res.ok) {
        triggerSaveNotification()
        alert('Parameter pendaftaran berhasil disimpan ke database!')
      } else {
        alert(data.error || 'Gagal menyimpan parameter.')
      }
    } catch {
      alert('Terjadi kesalahan jaringan.')
    } finally {
      setIsSavingGeneral(false)
    }
  }

  // Google Drive Handlers
  const handleServiceAccountJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (json.client_email && json.private_key) {
          setDriveConfig((prev) => ({
            ...prev,
            client_email: json.client_email,
            private_key: json.private_key,
          }))
          alert(`File JSON berhasil dibaca untuk Service Account: ${json.client_email}`)
        } else {
          alert('Format JSON tidak valid. Pastikan file berisi "client_email" dan "private_key".')
        }
      } catch {
        alert('Gagal membaca file JSON. Pastikan format file adalah JSON valid.')
      }
    }
    reader.readAsText(file)
  }

  const handleTestDriveConnection = async () => {
    setIsTestingDrive(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/settings/drive/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driveConfig),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message,
          folder_name: data.folder_name,
        })
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Gagal terhubung ke Google Drive.',
        })
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Terjadi kesalahan jaringan saat mencoba koneksi ke Google Drive.',
      })
    } finally {
      setIsTestingDrive(false)
    }
  }

  const handleSaveDriveSettings = async () => {
    setIsSavingDrive(true)
    try {
      const res = await fetch('/api/admin/settings/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driveConfig),
      })
      const data = await res.json()
      if (res.ok) {
        triggerSaveNotification()
        alert('Pengaturan Google Drive berhasil disimpan ke database!')
      } else {
        alert(data.error || 'Gagal menyimpan pengaturan Google Drive.')
      }
    } catch {
      alert('Terjadi kesalahan jaringan.')
    } finally {
      setIsSavingDrive(false)
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
          onClick={() => setActiveTab('drive')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'drive'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          Integrasi Google Drive
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

      {/* TAB: GOOGLE DRIVE INTEGRATION */}
      {activeTab === 'drive' && (
        <div className="bg-white border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-6 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-[var(--primary)]" />
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Integrasi Google Drive API
                </h2>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Kredensial Service Account untuk penyimpanan otomatis dokumen jamaah (KTP, KK, Paspor, Kartu Vaksin, dan Bukti Bayar).
              </p>
            </div>
            {driveConfig.source === 'database' ? (
              <span className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md whitespace-nowrap self-start">
                Tersimpan di Database
              </span>
            ) : (
              <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 rounded-md whitespace-nowrap self-start">
                Default dari .env
              </span>
            )}
          </div>

          {/* Quick upload JSON key */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[var(--primary)]" />
                <p className="text-xs font-semibold text-[var(--primary)]">
                  Upload File Service Account Key (.json)
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Punya file JSON Service Account dari Google Cloud? Upload di sini agar Client Email & Private Key langsung terisi otomatis tanpa perlu copy-paste manual.
            </p>
            <div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-[var(--primary)] border border-emerald-300 hover:bg-emerald-50 rounded-md cursor-pointer transition-colors shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih File .json</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleServiceAccountJsonUpload}
                />
              </label>
            </div>
          </div>

          {/* Form manual inputs */}
          <div className="space-y-4">
            <div>
              <Input
                label="Client Email (Service Account)"
                type="email"
                placeholder="misal: umrah-service@project.iam.gserviceaccount.com"
                value={driveConfig.client_email}
                onChange={(e) => setDriveConfig({ ...driveConfig, client_email: e.target.value })}
              />
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Email ini harus di-share akses <strong>Editor</strong> pada folder Google Drive Anda.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Private Key (RSA Private Key)
              </label>
              <textarea
                rows={4}
                value={driveConfig.private_key}
                onChange={(e) => setDriveConfig({ ...driveConfig, private_key: e.target.value })}
                placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
                className="w-full px-3 py-2 text-xs font-mono border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-slate-50/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Root Folder ID (Google Drive)"
                  placeholder="misal: 1a2B3c4D5e6F7g8H9..."
                  value={driveConfig.root_folder_id}
                  onChange={(e) => setDriveConfig({ ...driveConfig, root_folder_id: e.target.value })}
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Ambil dari akhir URL folder di browser: <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">drive.google.com/drive/folders/<b>[ID]</b></span>
                </p>
              </div>

              <div>
                <Input
                  label="Shared Drive ID (Opsional)"
                  placeholder="Kosongkan jika bukan Shared Drive"
                  value={driveConfig.shared_drive_id || ''}
                  onChange={(e) => setDriveConfig({ ...driveConfig, shared_drive_id: e.target.value })}
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Diisi hanya jika folder berada di dalam Google Workspace Shared Drive.
                </p>
              </div>
            </div>

            {/* Test result banner */}
            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.folder_name && (
                    <p className="mt-0.5 text-emerald-700">
                      Nama Folder Ditemukan: <strong>&ldquo;{testResult.folder_name}&rdquo;</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={isTestingDrive || !driveConfig.client_email || !driveConfig.private_key || !driveConfig.root_folder_id}
                onClick={handleTestDriveConnection}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300 disabled:opacity-50"
              >
                {isTestingDrive ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menguji Koneksi ke Google...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Uji Koneksi (Test Connection)</span>
                  </>
                )}
              </button>

              <Button
                onClick={handleSaveDriveSettings}
                disabled={isSavingDrive}
                size="sm"
              >
                {isSavingDrive ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="w-4 h-4 mr-1.5" />
                )}
                Simpan Pengaturan Drive
              </Button>
            </div>
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
              <Button onClick={handleSaveGeneralSettings} disabled={isSavingGeneral}>
                {isSavingGeneral ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="w-4 h-4 mr-1.5" />
                )}
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
