export interface CountryOption {
  code: string
  name: string
  flag: string
  group: string
}

export const COUNTRIES: CountryOption[] = [
  // Asia Tenggara (ASEAN)
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', group: 'Asia Tenggara' },
  { code: 'BN', name: 'Brunei Darussalam', flag: '🇧🇳', group: 'Asia Tenggara' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', group: 'Asia Tenggara' },
  { code: 'SG', name: 'Singapura (Singapore)', flag: '🇸🇬', group: 'Asia Tenggara' },
  { code: 'PH', name: 'Filipina (Philippines)', flag: '🇵🇭', group: 'Asia Tenggara' },
  { code: 'KH', name: 'Kamboja (Cambodia)', flag: '🇰🇭', group: 'Asia Tenggara' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', group: 'Asia Tenggara' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', group: 'Asia Tenggara' },

  // Timur Tengah & Afrika Utara
  { code: 'SA', name: 'Arab Saudi (Saudi Arabia)', flag: '🇸🇦', group: 'Timur Tengah & Afrika' },
  { code: 'EG', name: 'Mesir (Egypt)', flag: '🇪🇬', group: 'Timur Tengah & Afrika' },
  { code: 'TR', name: 'Turki (Turkey)', flag: '🇹🇷', group: 'Timur Tengah & Afrika' },
  { code: 'AE', name: 'Uni Emirat Arab (UAE)', flag: '🇦🇪', group: 'Timur Tengah & Afrika' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', group: 'Timur Tengah & Afrika' },
  { code: 'JO', name: 'Yordania (Jordan)', flag: '🇯🇴', group: 'Timur Tengah & Afrika' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', group: 'Timur Tengah & Afrika' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', group: 'Timur Tengah & Afrika' },
  { code: 'MA', name: 'Maroko (Morocco)', flag: '🇲🇦', group: 'Timur Tengah & Afrika' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', group: 'Timur Tengah & Afrika' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩', group: 'Timur Tengah & Afrika' },
  { code: 'YE', name: 'Yaman (Yemen)', flag: '🇾🇪', group: 'Timur Tengah & Afrika' },

  // Asia Selatan & Asia Timur
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', group: 'Asia Lainnya' },
  { code: 'IN', name: 'India', flag: '🇮🇳', group: 'Asia Lainnya' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', group: 'Asia Lainnya' },
  { code: 'JP', name: 'Jepang (Japan)', flag: '🇯🇵', group: 'Asia Lainnya' },
  { code: 'KR', name: 'Korea Selatan (South Korea)', flag: '🇰🇷', group: 'Asia Lainnya' },
  { code: 'CN', name: 'Tiongkok (China)', flag: '🇨🇳', group: 'Asia Lainnya' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', group: 'Asia Lainnya' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', group: 'Asia Lainnya' },

  // Eropa & Oseania & Amerika
  { code: 'AU', name: 'Australia', flag: '🇦🇺', group: 'Eropa & Barat' },
  { code: 'NZ', name: 'Selandia Baru (New Zealand)', flag: '🇳🇿', group: 'Eropa & Barat' },
  { code: 'GB', name: 'Inggris (United Kingdom)', flag: '🇬🇧', group: 'Eropa & Barat' },
  { code: 'US', name: 'Amerika Serikat (USA)', flag: '🇺🇸', group: 'Eropa & Barat' },
  { code: 'DE', name: 'Jerman (Germany)', flag: '🇩🇪', group: 'Eropa & Barat' },
  { code: 'NL', name: 'Belanda (Netherlands)', flag: '🇳🇱', group: 'Eropa & Barat' },
  { code: 'FR', name: 'Prancis (France)', flag: '🇫🇷', group: 'Eropa & Barat' },
  { code: 'CA', name: 'Kanada (Canada)', flag: '🇨🇦', group: 'Eropa & Barat' },
  { code: 'RU', name: 'Rusia (Russia)', flag: '🇷🇺', group: 'Eropa & Barat' },
]

export function isPresetCountry(countryName: string): boolean {
  if (!countryName) return false
  return COUNTRIES.some(
    (c) =>
      c.name.toLowerCase() === countryName.toLowerCase() ||
      c.name.toLowerCase().includes(countryName.toLowerCase()) ||
      countryName.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
  )
}
