import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function getDefaultBenefits(name: string): string[] {
  const upper = (name || '').toUpperCase()
  const roomTag = upper.includes('DOUBLE') || upper.includes('BERDUA')
    ? 'Kamar Double (2 Orang)'
    : upper.includes('TRIPLE') || upper.includes('BERTIGA')
    ? 'Kamar Triple (3 Orang)'
    : 'Kamar Quad (4 Orang)'

  return [
    `Akomodasi Hotel Makkah & Madinah (${roomTag})`,
    'Tiket Pesawat PP Internasional',
    'Visa Umrah & Asuransi Perjalanan',
    'Muthawwif & Bus AC Eksekutif',
    'Perlengkapan Umrah Resmi Panitia',
  ]
}

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const [pkgRes, benefitsRes] = await Promise.all([
      supabase.from('packages').select('*').order('price', { ascending: true }),
      supabase.from('app_settings').select('value').eq('key', 'package_benefits').maybeSingle(),
    ])

    if (pkgRes.error) throw pkgRes.error

    const benefitsMap: Record<string, string[]> = (benefitsRes.data?.value as Record<string, string[]>) || {}

    const packagesWithBenefits = (pkgRes.data || []).map((pkg) => {
      const customBenefits = benefitsMap[pkg.id]
      return {
        ...pkg,
        benefits: Array.isArray(customBenefits) && customBenefits.length > 0
          ? customBenefits
          : getDefaultBenefits(pkg.name),
      }
    })

    return NextResponse.json({ packages: packagesWithBenefits })
  } catch (err) {
    console.error('[packages/GET]', err)
    return NextResponse.json(
      { error: 'Gagal mengambil data paket umrah.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, price, dp_amount, departure_date, return_date, is_active, benefits } = body

    if (!name || price == null || dp_amount == null) {
      return NextResponse.json(
        { error: 'Nama paket, harga paket, dan nominal DP wajib diisi.' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('packages')
      .insert({
        name: name.trim(),
        price: Number(price),
        dp_amount: Number(dp_amount),
        departure_date: departure_date || null,
        return_date: return_date || null,
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) throw error

    // Sync benefits to app_settings
    const packageBenefits = Array.isArray(benefits) && benefits.length > 0 ? benefits : getDefaultBenefits(name)
    try {
      const { data: curSetting } = await supabase.from('app_settings').select('value').eq('key', 'package_benefits').maybeSingle()
      const benefitsMap = (curSetting?.value as Record<string, string[]>) || {}
      benefitsMap[data.id] = packageBenefits
      await supabase.from('app_settings').upsert({
        key: 'package_benefits',
        value: benefitsMap,
        description: 'Daftar fasilitas dan benefit masing-masing paket umrah',
      })
    } catch (saveErr) {
      console.warn('[packages/POST] Could not save benefits map:', saveErr)
    }

    await supabase.from('audit_logs').insert({
      actor_type: 'panitia',
      action: 'package.created',
      entity_type: 'package',
      entity_id: data.id,
      new_data: { ...data, benefits: packageBenefits },
    })

    return NextResponse.json({ package: { ...data, benefits: packageBenefits } }, { status: 201 })
  } catch (err) {
    console.error('[packages/POST]', err)
    return NextResponse.json(
      { error: 'Gagal menambahkan paket umrah.' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, benefits, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID paket wajib diisi.' }, { status: 400 })
    }

    if (updates.price != null) updates.price = Number(updates.price)
    if (updates.dp_amount != null) updates.dp_amount = Number(updates.dp_amount)

    const supabase = await createServiceClient()
    let updatedPackage = null
    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from('packages')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      updatedPackage = data
    } else {
      const { data } = await supabase.from('packages').select('*').eq('id', id).single()
      updatedPackage = data
    }

    let savedBenefits = benefits
    if (Array.isArray(benefits)) {
      try {
        const { data: curSetting } = await supabase.from('app_settings').select('value').eq('key', 'package_benefits').maybeSingle()
        const benefitsMap = (curSetting?.value as Record<string, string[]>) || {}
        benefitsMap[id] = benefits
        await supabase.from('app_settings').upsert({
          key: 'package_benefits',
          value: benefitsMap,
          description: 'Daftar fasilitas dan benefit masing-masing paket umrah',
        })
      } catch (saveErr) {
        console.warn('[packages/PATCH] Could not update benefits map:', saveErr)
      }
    } else {
      try {
        const { data: curSetting } = await supabase.from('app_settings').select('value').eq('key', 'package_benefits').maybeSingle()
        const benefitsMap = (curSetting?.value as Record<string, string[]>) || {}
        savedBenefits = benefitsMap[id] || getDefaultBenefits(updatedPackage?.name || '')
      } catch {
        savedBenefits = getDefaultBenefits(updatedPackage?.name || '')
      }
    }

    await supabase.from('audit_logs').insert({
      actor_type: 'panitia',
      action: 'package.updated',
      entity_type: 'package',
      entity_id: id,
      new_data: { ...updates, benefits: savedBenefits },
    })

    return NextResponse.json({ package: { ...updatedPackage, benefits: savedBenefits } })
  } catch (err) {
    console.error('[packages/PATCH]', err)
    return NextResponse.json(
      { error: 'Gagal memperbarui data paket umrah.' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID paket wajib diisi.' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id)

    if (error) {
      // If FK constraint prevents hard delete, soft delete
      if (error.code === '23503') {
        await supabase
          .from('packages')
          .update({ is_active: false })
          .eq('id', id)

        return NextResponse.json({
          message: 'Paket dinonaktifkan karena telah dipilih oleh pendaftar.',
          softDeleted: true,
        })
      }
      throw error
    }

    // Clean up benefits in app_settings
    try {
      const { data: curSetting } = await supabase.from('app_settings').select('value').eq('key', 'package_benefits').maybeSingle()
      if (curSetting?.value && curSetting.value[id]) {
        const benefitsMap = { ...curSetting.value }
        delete benefitsMap[id]
        await supabase.from('app_settings').upsert({
          key: 'package_benefits',
          value: benefitsMap,
          description: 'Daftar fasilitas dan benefit masing-masing paket umrah',
        })
      }
    } catch {}

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[packages/DELETE]', err)
    return NextResponse.json(
      { error: 'Gagal menghapus paket umrah.' },
      { status: 500 }
    )
  }
}
