import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { BankAccount } from '@/types'

export const dynamic = 'force-dynamic'

const DEFAULT_BANKS: BankAccount[] = [
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

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'bank_accounts')
      .maybeSingle()

    const rawBanks = data?.value
    if (Array.isArray(rawBanks) && rawBanks.length > 0) {
      // Filter active bank accounts
      const activeBanks = rawBanks.filter((b: BankAccount) => b.isActive !== false)
      if (activeBanks.length > 0) {
        return NextResponse.json({ banks: activeBanks })
      }
    }

    // Default fallback bank accounts if settings not yet set in DB
    return NextResponse.json({ banks: DEFAULT_BANKS })
  } catch (err) {
    console.error('[banks/GET]', err)
    return NextResponse.json({ banks: DEFAULT_BANKS })
  }
}
