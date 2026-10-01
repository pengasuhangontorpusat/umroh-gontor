'use client'

import { useEffect, useState } from 'react'
import { useRegistration } from '@/contexts/RegistrationContext'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { DeparturePoint, Package } from '@/types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { picSchema, PicFormValues } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'

const FALLBACK_DEPARTURE_POINTS: DeparturePoint[] = [
  { id: '11111111-1111-1111-1111-111111111111', code: 'JKT', name: 'Jakarta (Soekarno-Hatta / CGK)', description: null, is_active: true, sort_order: 1, created_at: '' },
  { id: '22222222-2222-2222-2222-222222222222', code: 'SUB', name: 'Surabaya (Juanda / SUB)', description: null, is_active: true, sort_order: 2, created_at: '' },
  { id: '33333333-3333-3333-3333-333333333333', code: 'SOC', name: 'Solo / Gontor (Adi Soemarmo / SOC)', description: null, is_active: true, sort_order: 3, created_at: '' },
  { id: '44444444-4444-4444-4444-444444444444', code: 'KNO', name: 'Medan (Kualanamu / KNO)', description: null, is_active: true, sort_order: 4, created_at: '' },
  { id: '55555555-5555-5555-5555-555555555555', code: 'UPG', name: 'Makassar (Sultan Hasanuddin / UPG)', description: null, is_active: true, sort_order: 5, created_at: '' },
]

const FALLBACK_PACKAGES: Package[] = [
  {
    id: '99999999-9999-9999-9999-999999999999',
    name: 'Paket Umrah 100 Tahun Gontor (Rp 37.200.000)',
    price: 37200000,
    dp_amount: 5000000,
    currency: 'IDR',
    departure_date: '2026-10-01',
    return_date: '2026-10-12',
    is_active: true,
    created_at: '',
    updated_at: '',
  },
]

export function Step2Pic() {
  const { draft, setDraft, updateMember, nextStep, prevStep } = useRegistration()
  const [departurePoints, setDeparturePoints] = useState<DeparturePoint[]>(FALLBACK_DEPARTURE_POINTS)
  const [packages, setPackages] = useState<Package[]>(FALLBACK_PACKAGES)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('departure_points').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('packages').select('*').eq('is_active', true),
    ])
      .then(([dp, pkg]) => {
        const finalDp = dp.data && dp.data.length > 0 ? dp.data : FALLBACK_DEPARTURE_POINTS
        const finalPkg = pkg.data && pkg.data.length > 0 ? pkg.data : FALLBACK_PACKAGES
        setDeparturePoints(finalDp)
        setPackages(finalPkg)
        // Auto-select first package if only one or unset
        if (finalPkg.length > 0 && !draft.package_id) {
          setDraft({ package_id: finalPkg[0].id })
        }
        setLoading(false)
      })
      .catch(() => {
        setDeparturePoints(FALLBACK_DEPARTURE_POINTS)
        setPackages(FALLBACK_PACKAGES)
        setLoading(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pic = draft.members[0]

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<PicFormValues, any, PicFormValues>({
    resolver: zodResolver(picSchema) as any,
    defaultValues: {
      full_name: pic?.full_name ?? '',
      phone: draft.pic_phone,
      email: draft.pic_email,
      domicile_city: draft.pic_domicile_city,
      departure_point_id: draft.departure_point_id || '',
      package_id: draft.package_id || FALLBACK_PACKAGES[0].id,
    },
  })

  useEffect(() => {
    if (packages.length > 0) {
      const selectedPkgId = draft.package_id || packages[0].id
      setValue('package_id', selectedPkgId)
      if (!draft.package_id) {
        setDraft({ package_id: selectedPkgId })
      }
    }
  }, [packages, draft.package_id, setValue, setDraft])

  function onSubmit(values: PicFormValues) {
    setDraft({
      pic_phone: values.phone,
      pic_email: values.email ?? '',
      pic_domicile_city: values.domicile_city,
      departure_point_id: values.departure_point_id,
      package_id: values.package_id || packages[0]?.id || FALLBACK_PACKAGES[0].id,
    })

    // Update PIC member data
    if (pic) {
      updateMember(pic.id, {
        full_name: values.full_name,
        phone: values.phone,
        relationship_to_pic: 'PIC',
      })
    }

    nextStep()
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Data Pendaftar (PIC)</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Informasi kontak penanggung jawab pendaftaran.
          {draft.type === 'family' && ' Anda akan otomatis terdaftar sebagai anggota pertama.'}
        </p>
      </div>

      {hasErrors && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 space-y-1">
          <p className="font-semibold">Mohon lengkapi data berikut sebelum melanjutkan:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.full_name && <li>{errors.full_name.message}</li>}
            {errors.phone && <li>{errors.phone.message}</li>}
            {errors.domicile_city && <li>{errors.domicile_city.message}</li>}
            {errors.departure_point_id && <li>{errors.departure_point_id.message}</li>}
            {errors.package_id && <li>{errors.package_id.message}</li>}
          </ul>
        </div>
      )}

      {/* Name + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nama Lengkap PIC"
          id="pic-name"
          required
          placeholder="Sesuai KTP atau paspor"
          error={errors.full_name?.message}
          {...register('full_name')}
        />
        <Input
          label="Nomor WhatsApp"
          id="pic-phone"
          type="tel"
          required
          placeholder="081234567890"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      {/* Email + City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email (opsional)"
          id="pic-email"
          type="email"
          placeholder="email@contoh.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Kota Domisili"
          id="pic-city"
          required
          placeholder="Jakarta Selatan, Ponorogo, Surabaya..."
          error={errors.domicile_city?.message}
          {...register('domicile_city')}
        />
      </div>

      {/* Departure point */}
      <Select
        label="Titik Keberangkatan"
        id="departure-point"
        required
        placeholder="-- Pilih titik keberangkatan --"
        options={departurePoints.map((dp) => ({ value: dp.id, label: dp.name }))}
        error={errors.departure_point_id?.message}
        {...register('departure_point_id')}
      />

      {/* Package Selection */}
      <Select
        label="Pilihan Paket Umrah"
        id="package"
        required
        placeholder="-- Pilih paket umrah --"
        options={packages.map((p) => ({
          value: p.id,
          label: `${p.name} — Rp ${Number(p.price).toLocaleString('id-ID')}`,
        }))}
        error={errors.package_id?.message}
        {...register('package_id')}
      />

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={prevStep}>
          Kembali
        </Button>
        <Button type="submit" size="lg">
          Lanjut ke Data Jamaah
        </Button>
      </div>
    </form>
  )
}
