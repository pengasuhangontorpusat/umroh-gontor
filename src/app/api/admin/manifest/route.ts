import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const departure = searchParams.get('departure')
  const format = searchParams.get('format') ?? 'xlsx'

  const supabase = await createServiceClient()

  let query = supabase
    .from('jamaahs')
    .select(`
      *,
      registration_groups!jamaahs_group_id_fkey!inner(
        registration_code,
        type,
        group_status,
        departure_point_id,
        departure_point:departure_points(name, code)
      )
    `)
    .order('full_name')

  if (departure) {
    const { data: dp } = await supabase
      .from('departure_points')
      .select('id')
      .eq('code', departure)
      .maybeSingle()

    if (dp?.id) {
      query = query.eq('registration_groups.departure_point_id', dp.id)
    }
  }

  const { data: jamaahs, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data manifest.' }, { status: 500 })
  }

  // Format data for export
  const rows = (jamaahs ?? []).map((j: Record<string, unknown>) => {
    const group = j.registration_groups as Record<string, unknown>
    const depPoint = (group?.departure_point as Record<string, unknown>)?.name ?? ''

    return {
      'Kode Pendaftaran': group?.registration_code ?? '',
      'Keberangkatan': depPoint,
      'Nama Lengkap': j.full_name ?? '',
      'Jenis Kelamin': j.gender === 'male' ? 'Laki-laki' : 'Perempuan',
      'Nama Ayah': j.father_name ?? '',
      'Nomor Paspor': j.passport_number ?? '',
      'NIK': j.nik ?? '',
      'Tempat Lahir': j.birth_place ?? '',
      'Tanggal Lahir': j.birth_date ?? '',
      'Masa Berlaku Paspor': j.passport_expiry_date ?? '',
      'Hubungan': j.relationship_to_pic ?? '',
      'Alamat': j.address ?? '',
      'Provinsi': j.province ?? '',
      'Kabupaten/Kota': j.city ?? '',
      'Kecamatan': j.district ?? '',
      'Kelurahan': j.village ?? '',
      'Nomor HP': j.phone ?? '',
      'Kewarganegaraan': j.nationality ?? '',
      'Status Pernikahan': j.marital_status ?? '',
      'Pekerjaan': j.occupation ?? '',
      'Disabilitas / Kebutuhan Khusus': j.has_disability ? `Ya (${j.disability_description || 'Kursi Roda'})` : 'Tidak',
      'Riwayat Penyakit': j.medical_history ?? '',
      'Ukuran Baju': j.clothing_size ?? '',
    }
  })

  if (format === 'csv') {
    const ws = XLSX.utils.json_to_sheet(rows)
    const csv = XLSX.utils.sheet_to_csv(ws)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="manifest-umrah-${Date.now()}.csv"`,
      },
    })
  }

  // XLSX
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto column widths
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }))
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, 'Manifest')
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="manifest-umrah-${Date.now()}.xlsx"`,
    },
  })
}
