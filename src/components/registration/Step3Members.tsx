'use client'

import { useState, useEffect } from 'react'
import { useRegistration, JamaahDraft } from '@/contexts/RegistrationContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ChevronDown, ChevronUp, Plus, Trash2, User, AlertCircle, MapPin, FileText, HeartPulse } from 'lucide-react'
import { cn, isKtpRequired, calculateAge } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { jamaahSchema, JamaahFormValues } from '@/lib/validations'

const GENDER_OPTIONS = [
  { value: 'male', label: 'Laki-laki' },
  { value: 'female', label: 'Perempuan' },
]

const MARITAL_OPTIONS = [
  { value: 'single', label: 'Belum Menikah' },
  { value: 'married', label: 'Menikah' },
  { value: 'widowed', label: 'Janda/Duda' },
  { value: 'divorced', label: 'Cerai' },
]

const PASSPORT_STATUS_OPTIONS = [
  { value: 'has_passport', label: 'Sudah memiliki paspor' },
  { value: 'no_passport', label: 'Belum memiliki paspor' },
  { value: 'in_process', label: 'Sedang diproses' },
]

const RELATIONSHIP_OPTIONS = [
  { value: 'Diri Sendiri (PIC)', label: 'Diri Sendiri (PIC ikut berangkat)' },
  { value: 'Ayah Kandung', label: 'Ayah Kandung' },
  { value: 'Ibu Kandung', label: 'Ibu Kandung' },
  { value: 'Suami', label: 'Suami' },
  { value: 'Istri', label: 'Istri' },
  { value: 'Anak', label: 'Anak' },
  { value: 'Mertua', label: 'Mertua' },
  { value: 'Saudara Kandung', label: 'Saudara Kandung' },
  { value: 'Kerabat / Keluarga', label: 'Kerabat / Keluarga' },
  { value: 'Santri / Alumni', label: 'Santri / Alumni' },
  { value: 'Lainnya', label: 'Lainnya' },
]

interface MemberFormProps {
  member: JamaahDraft
  index: number
  isFirst: boolean
  canRemove: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onRemove: () => void
}

function MemberForm({ member, index, isFirst, canRemove, isExpanded, onToggleExpand, onRemove }: MemberFormProps) {
  const { updateMember } = useRegistration()
  const [saved, setSaved] = useState(Boolean(member.full_name && member.gender && member.birth_place && member.birth_date))

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<JamaahFormValues, any, JamaahFormValues>({
    resolver: zodResolver(jamaahSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      full_name: member.full_name,
      gender: (member.gender as JamaahFormValues['gender']) || undefined,
      father_name: member.father_name,
      nik: member.nik,
      birth_place: member.birth_place,
      birth_date: member.birth_date,
      nationality: member.nationality || 'Indonesia',
      marital_status: (member.marital_status as JamaahFormValues['marital_status']) || undefined,
      occupation: member.occupation,
      phone: member.phone,
      address: member.address,
      province: member.province,
      city: member.city,
      district: member.district,
      village: member.village,
      relationship_to_pic: member.relationship_to_pic,
      passport_status: (member.passport_status as JamaahFormValues['passport_status']) || 'no_passport',
      passport_number: member.passport_number,
      passport_issue_place: member.passport_issue_place,
      passport_issue_date: member.passport_issue_date,
      passport_expiry_date: member.passport_expiry_date,
      has_disability: member.has_disability || false,
      disability_description: member.disability_description || '',
      medical_history: member.medical_history || '',
      clothing_size: member.clothing_size || 'L',
    },
  })

  // Auto-sync form changes directly to RegistrationContext draft
  useEffect(() => {
    const subscription = watch((values) => {
      updateMember(member.id, values as Partial<JamaahDraft>)
      if (values.full_name && values.gender && values.birth_place && values.birth_date) {
        setSaved(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, member.id, updateMember])

  const birthDate = watch('birth_date')
  const passportStatus = watch('passport_status')
  const hasDisability = watch('has_disability')
  const ktpRequired = birthDate ? isKtpRequired(birthDate) : false
  const age = birthDate ? calculateAge(birthDate) : null

  function onSave(values: JamaahFormValues): void {
    updateMember(member.id, values as Partial<JamaahDraft>)
    setSaved(true)
    onToggleExpand()
  }

  const displayName = member.full_name || `Anggota ${index + 1}`

  return (
    <div className={cn(
      'border rounded-[var(--radius-lg)] bg-white overflow-hidden transition-all',
      saved ? 'border-[var(--primary)]' : 'border-[var(--border)]'
    )}>
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggleExpand()
          }
        }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface)] transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
            saved
              ? 'bg-[var(--primary)] text-white'
              : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
          )}>
            {String(index + 1).padStart(2, '0')}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-[var(--text-primary)]">{displayName}</p>
            {member.relationship_to_pic && (
              <p className="text-xs text-[var(--text-muted)]">{member.relationship_to_pic}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-[var(--success)] font-medium">Tersimpan</span>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              aria-label="Hapus anggota"
              className="p-1 rounded hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="p-1">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </span>
        </div>
      </div>

      {/* Form */}
      {isExpanded && (
        <form onSubmit={handleSubmit(onSave)} className="px-5 pb-5 pt-3 border-t border-[var(--border)] space-y-6">
          {/* BLOK 1: Data Identitas & Kependudukan */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <User className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                1. Data Identitas & Kependudukan
              </h4>
            </div>

            {/* Row 1: Nama Lengkap & Hubungan dengan PIC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nama Lengkap"
                id={`name-${member.id}`}
                required
                placeholder="Sesuai KTP/Paspor"
                error={errors.full_name?.message}
                {...register('full_name')}
              />
              <Select
                label="Hubungan dengan PIC (Penanggung Jawab)"
                id={`relationship-${member.id}`}
                placeholder="Pilih Hubungan"
                options={RELATIONSHIP_OPTIONS}
                error={errors.relationship_to_pic?.message}
                {...register('relationship_to_pic')}
              />
            </div>

            {/* Row 2: Jenis Kelamin & Tempat Lahir */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Jenis Kelamin"
                id={`gender-${member.id}`}
                required
                placeholder="Pilih"
                options={GENDER_OPTIONS}
                error={errors.gender?.message}
                {...register('gender')}
              />
              <Input
                label="Tempat Lahir"
                id={`birth-place-${member.id}`}
                required
                placeholder="Kota tempat lahir"
                error={errors.birth_place?.message}
                {...register('birth_place')}
              />
            </div>

            {/* Row 3: Tanggal Lahir & NIK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Tanggal Lahir"
                  id={`birth-date-${member.id}`}
                  type="date"
                  required
                  error={errors.birth_date?.message}
                  {...register('birth_date')}
                />
                {age !== null && (
                  <p className="text-xs text-[var(--text-muted)] font-medium">{age} tahun</p>
                )}
              </div>
              <Input
                label={`NIK${ktpRequired ? '' : ' (opsional — di bawah 17 tahun)'}`}
                id={`nik-${member.id}`}
                required={ktpRequired}
                placeholder="16 digit NIK"
                maxLength={16}
                error={errors.nik?.message}
                hint={!ktpRequired ? 'Jamaah di bawah 17 tahun tidak wajib mengisi NIK.' : undefined}
                {...register('nik')}
              />
            </div>

            {/* Row 4: Nama Ayah Kandung (bin/binti) & Status Pernikahan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nama Ayah Kandung (untuk bin / binti)"
                id={`father-${member.id}`}
                placeholder="Nama lengkap ayah kandung"
                error={errors.father_name?.message}
                hint="Dibutuhkan untuk penulisan nama di visa & manifes Saudi (bin/binti)."
                {...register('father_name')}
              />
              <Select
                label="Status Pernikahan"
                id={`marital-${member.id}`}
                placeholder="Pilih"
                options={MARITAL_OPTIONS}
                error={errors.marital_status?.message}
                {...register('marital_status')}
              />
            </div>

            {/* Row 5: Pekerjaan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Pekerjaan"
                id={`occupation-${member.id}`}
                placeholder="Pelajar, Guru, Wiraswasta, dll."
                error={errors.occupation?.message}
                {...register('occupation')}
              />
            </div>
          </div>

          {/* BLOK 2: Kontak & Alamat Domisili */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <MapPin className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                2. Kontak & Alamat Domisili
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nomor HP / WhatsApp"
                id={`phone-${member.id}`}
                type="tel"
                placeholder="08xxxxxxxxxx"
                error={errors.phone?.message}
                {...register('phone')}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] block mb-1.5">
                Alamat Lengkap Sesuai KTP
              </label>
              <textarea
                className="w-full rounded-[var(--radius-md)] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-medium placeholder:text-slate-400 resize-none focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 shadow-xs"
                rows={2}
                placeholder="Alamat lengkap (Jalan, No. Rumah, RT/RW)"
                {...register('address')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Provinsi"
                id={`province-${member.id}`}
                placeholder="Contoh: Jawa Timur"
                {...register('province')}
              />
              <Input
                label="Kabupaten / Kota"
                id={`city-${member.id}`}
                placeholder="Contoh: Ponorogo"
                {...register('city')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Kecamatan"
                id={`district-${member.id}`}
                placeholder="Contoh: Mlarak"
                {...register('district')}
              />
              <Input
                label="Kelurahan / Desa"
                id={`village-${member.id}`}
                placeholder="Contoh: Gontor"
                {...register('village')}
              />
            </div>
          </div>

          {/* BLOK 3: Data Paspor */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  3. Data Paspor
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">Dapat dilengkapi setelah mendaftar</span>
            </div>

            <Select
              label="Status Paspor"
              id={`passport-status-${member.id}`}
              options={PASSPORT_STATUS_OPTIONS}
              {...register('passport_status')}
            />

            {passportStatus === 'has_passport' && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nomor Paspor"
                  id={`passport-no-${member.id}`}
                  placeholder="Contoh: A1234567"
                  error={errors.passport_number?.message}
                  {...register('passport_number')}
                />
                <Input
                  label="Tempat Penerbitan (Kantor Imigrasi)"
                  id={`passport-place-${member.id}`}
                  placeholder="Contoh: Jakarta Selatan, Surabaya, Madiun"
                  {...register('passport_issue_place')}
                />
                <Input
                  label="Tanggal Terbit"
                  id={`passport-issue-${member.id}`}
                  type="date"
                  {...register('passport_issue_date')}
                />
                <Input
                  label="Tanggal Kedaluwarsa"
                  id={`passport-expiry-${member.id}`}
                  type="date"
                  error={errors.passport_expiry_date?.message}
                  {...register('passport_expiry_date')}
                />
              </div>
            )}
          </div>

          {/* BLOK 4: Kesehatan & Perlengkapan */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <HeartPulse className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                4. Perlengkapan & Catatan Kesehatan
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Ukuran Seragam / Batik"
                id={`cloth-${member.id}`}
                options={[
                  { value: 'S', label: 'S (Small)' },
                  { value: 'M', label: 'M (Medium)' },
                  { value: 'L', label: 'L (Large)' },
                  { value: 'XL', label: 'XL (Extra Large)' },
                  { value: 'XXL', label: 'XXL (Double XL)' },
                  { value: '3XL', label: '3XL (Triple XL)' },
                ]}
                {...register('clothing_size')}
              />
              <Input
                label="Riwayat Penyakit (Opsional)"
                id={`medical-${member.id}`}
                placeholder="Contoh: Asma, Alergi antibiotik"
                {...register('medical_history')}
              />
            </div>

            {/* Disabilitas Checkbox */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Apakah jamaah memiliki kebutuhan khusus / disabilitas?
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Contoh: Pengguna kursi roda saat tawaf/sa&apos;i, tunanetra, dsb.
                  </p>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name={`has_disability_${member.id}`}
                      checked={!hasDisability}
                      onChange={() => setValue('has_disability', false)}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>Tidak</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer font-medium text-amber-800">
                    <input
                      type="radio"
                      name={`has_disability_${member.id}`}
                      checked={hasDisability}
                      onChange={() => setValue('has_disability', true)}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>Ya, Ada</span>
                  </label>
                </div>
              </div>

              {hasDisability && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <label className="block text-xs font-semibold text-slate-800">
                    Rincian Bantuan yang Diperlukan:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Memerlukan kursi roda selama di bandara & thawaf..."
                    className="w-full px-3 py-2 text-xs text-slate-900 font-medium placeholder:text-slate-400 border border-amber-300 rounded-lg focus:outline-none focus:border-emerald-700 bg-amber-50/40"
                    {...register('disability_description')}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="secondary">
              Simpan Data Anggota
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export function Step3Members() {
  const { draft, nextStep, prevStep, addMember, removeMember } = useRegistration()
  const isFamily = draft.type === 'family'
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleToggle(idx: number) {
    setExpandedIndex((prev) => (prev === idx ? null : idx))
  }

  function handleNext() {
    setValidationError(null)

    if (!draft.members || draft.members.length === 0) {
      setValidationError('Minimal harus ada 1 data jamaah.')
      return
    }

    for (let i = 0; i < draft.members.length; i++) {
      const m = draft.members[i]
      const memberTitle = m.full_name || `Anggota ${i + 1}`

      if (!m.full_name || m.full_name.trim().length < 2) {
        setValidationError(`${memberTitle}: Nama lengkap wajib diisi (minimal 2 karakter).`)
        setExpandedIndex(i)
        return
      }

      if (!m.gender) {
        setValidationError(`${memberTitle}: Jenis kelamin wajib dipilih.`)
        setExpandedIndex(i)
        return
      }

      if (!m.birth_place || m.birth_place.trim().length < 2) {
        setValidationError(`${memberTitle}: Tempat lahir wajib diisi.`)
        setExpandedIndex(i)
        return
      }

      if (!m.birth_date) {
        setValidationError(`${memberTitle}: Tanggal lahir wajib diisi.`)
        setExpandedIndex(i)
        return
      }

      if (m.nik && !/^\d{16}$/.test(m.nik)) {
        setValidationError(`${memberTitle}: NIK harus berupa 16 digit angka.`)
        setExpandedIndex(i)
        return
      }
    }

    nextStep()
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Data Jamaah</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {isFamily
            ? 'Isi data setiap anggota keluarga. Klik pada nama untuk membuka form.'
            : 'Isi data diri Anda sebagai jamaah.'}
        </p>
      </div>

      {validationError && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-[var(--radius-lg)] text-red-800 text-sm animate-shake">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Perhatian:</p>
            <p className="mt-0.5">{validationError}</p>
          </div>
        </div>
      )}

      {/* Member list */}
      <div className="space-y-3">
        {draft.members.map((member, index) => (
          <MemberForm
            key={member.id}
            member={member}
            index={index}
            isFirst={index === 0}
            canRemove={isFamily && index > 0}
            isExpanded={expandedIndex === index}
            onToggleExpand={() => handleToggle(index)}
            onRemove={() => removeMember(member.id)}
          />
        ))}
      </div>

      {/* Add member (family only) */}
      {isFamily && (
        <button
          type="button"
          onClick={() => {
            addMember()
            setExpandedIndex(draft.members.length)
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] text-sm text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Anggota
        </button>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={prevStep}>
          Kembali
        </Button>
        <Button onClick={handleNext} size="lg">
          Lanjutkan
        </Button>
      </div>
    </div>
  )
}
