import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const DEFAULT_DOCUMENT_REQUIREMENTS = [
  {
    id: 'ktp',
    name: 'KTP (Kartu Tanda Penduduk)',
    description: 'Wajib untuk jamaah usia 17 tahun ke atas',
    icon: '📄',
    isRequired: true,
    isActive: true,
  },
  {
    id: 'kk',
    name: 'Kartu Keluarga',
    description: 'Untuk semua anggota rombongan/keluarga',
    icon: '📋',
    isRequired: true,
    isActive: true,
  },
  {
    id: 'vaksin',
    name: 'Kartu Vaksin Meningitis & Polio',
    description: 'Dapat dikoordinasikan dengan panitia',
    icon: '💉',
    isRequired: false,
    isActive: true,
  },
  {
    id: 'paspor',
    name: 'Buku Paspor',
    description: 'Jika belum memiliki, dapat ditandai dan dilengkapi kemudian',
    icon: '📘',
    isRequired: false,
    isActive: true,
  },
]

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'general_parameters')
      .maybeSingle()

    const val = (data?.value as Record<string, unknown> | undefined) || {}

    const parameters = {
      // Branding & Landing Page
      siteTitle: (val.siteTitle as string) || 'Umrah 100 Tahun Gontor',
      siteSubtitle:
        (val.siteSubtitle as string) ||
        'Daftarkan diri Anda atau keluarga untuk program umrah dalam rangka peringatan 100 tahun Pondok Modern Darussalam Gontor. Proses pendaftaran dirancang sesederhana mungkin.',
      heroBadge: (val.heroBadge as string) || 'Pendaftaran Resmi',
      brandLogoText: (val.brandLogoText as string) || 'G',

      // Footer
      footerTitle: (val.footerTitle as string) || 'Panitia Umrah 100 Tahun Gontor',
      footerSubtitle: (val.footerSubtitle as string) || 'Pondok Modern Darussalam Gontor',
      footerCopyright: (val.footerCopyright as string) || `© ${new Date().getFullYear()}`,

      // Contact & Helpdesk
      helpdeskWhatsapp: (val.helpdeskWhatsapp as string) || '081234567890',
      contactEmail: (val.contactEmail as string) || 'umrah@gontor.ac.id',

      // Registration Operations
      registrationOpen: val.registrationOpen !== false,
      totalQuota: Number(val.totalQuota) || 1000,
      dpMinimum: Number(val.dpMinimum) || 5000000,
      notes: (val.notes as string) || '',

      // Document Requirements
      documentRequirements:
        Array.isArray(val.documentRequirements) && val.documentRequirements.length > 0
          ? val.documentRequirements
          : DEFAULT_DOCUMENT_REQUIREMENTS,
    }

    return NextResponse.json({
      parameters,
    })
  } catch (err) {
    console.error('[settings/general/GET]', err)
    return NextResponse.json(
      { error: 'Gagal mengambil parameter pendaftaran.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      registrationOpen,
      totalQuota,
      dpMinimum,
      helpdeskWhatsapp,
      contactEmail,
      notes,
      siteTitle,
      siteSubtitle,
      heroBadge,
      brandLogoText,
      footerTitle,
      footerSubtitle,
      footerCopyright,
      documentRequirements,
    } = body

    const supabase = await createServiceClient()

    const updatedValue = {
      // Branding & Landing Page
      siteTitle: siteTitle || 'Umrah 100 Tahun Gontor',
      siteSubtitle:
        siteSubtitle ||
        'Daftarkan diri Anda atau keluarga untuk program umrah dalam rangka peringatan 100 tahun Pondok Modern Darussalam Gontor. Proses pendaftaran dirancang sesederhana mungkin.',
      heroBadge: heroBadge || 'Pendaftaran Resmi',
      brandLogoText: brandLogoText || 'G',

      // Footer
      footerTitle: footerTitle || 'Panitia Umrah 100 Tahun Gontor',
      footerSubtitle: footerSubtitle || 'Pondok Modern Darussalam Gontor',
      footerCopyright: footerCopyright || `© ${new Date().getFullYear()}`,

      // Contact & Helpdesk
      helpdeskWhatsapp: helpdeskWhatsapp || '',
      contactEmail: contactEmail || '',

      // Operations
      registrationOpen: Boolean(registrationOpen),
      totalQuota: Number(totalQuota) || 1000,
      dpMinimum: Number(dpMinimum) || 5000000,
      notes: notes || '',

      // Document Requirements
      documentRequirements:
        Array.isArray(documentRequirements) && documentRequirements.length > 0
          ? documentRequirements
          : DEFAULT_DOCUMENT_REQUIREMENTS,
    }

    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'general_parameters',
          value: updatedValue,
          description: 'Parameter sistem, identitas web, footer, berkas persyaratan, dan status pendaftaran',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving general parameters:', error)
      return NextResponse.json(
        { error: 'Gagal menyimpan parameter ke database: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      parameters: data.value,
      message: 'Pengaturan web dan parameter pendaftaran berhasil disimpan.',
    })
  } catch (err) {
    console.error('[settings/general/POST]', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat menyimpan parameter.' },
      { status: 500 }
    )
  }
}
