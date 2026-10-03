export interface CountryOption {
  code: string
  name: string
  group: string
}

export const COUNTRIES: CountryOption[] = [
  // Asia Tenggara (ASEAN)
  { code: 'MY', name: 'Malaysia', group: 'Asia Tenggara (ASEAN)' },
  { code: 'BN', name: 'Brunei Darussalam', group: 'Asia Tenggara (ASEAN)' },
  { code: 'TH', name: 'Thailand', group: 'Asia Tenggara (ASEAN)' },
  { code: 'SG', name: 'Singapura (Singapore)', group: 'Asia Tenggara (ASEAN)' },
  { code: 'PH', name: 'Filipina (Philippines)', group: 'Asia Tenggara (ASEAN)' },
  { code: 'KH', name: 'Kamboja (Cambodia)', group: 'Asia Tenggara (ASEAN)' },
  { code: 'VN', name: 'Vietnam', group: 'Asia Tenggara (ASEAN)' },
  { code: 'MM', name: 'Myanmar', group: 'Asia Tenggara (ASEAN)' },

  // Timur Tengah & Afrika Utara
  { code: 'SA', name: 'Arab Saudi (Saudi Arabia)', group: 'Timur Tengah & Afrika Utara' },
  { code: 'EG', name: 'Mesir (Egypt)', group: 'Timur Tengah & Afrika Utara' },
  { code: 'TR', name: 'Turki (Turkey)', group: 'Timur Tengah & Afrika Utara' },
  { code: 'AE', name: 'Uni Emirat Arab (UAE)', group: 'Timur Tengah & Afrika Utara' },
  { code: 'QA', name: 'Qatar', group: 'Timur Tengah & Afrika Utara' },
  { code: 'JO', name: 'Yordania (Jordan)', group: 'Timur Tengah & Afrika Utara' },
  { code: 'KW', name: 'Kuwait', group: 'Timur Tengah & Afrika Utara' },
  { code: 'OM', name: 'Oman', group: 'Timur Tengah & Afrika Utara' },
  { code: 'MA', name: 'Maroko (Morocco)', group: 'Timur Tengah & Afrika Utara' },
  { code: 'TN', name: 'Tunisia', group: 'Timur Tengah & Afrika Utara' },
  { code: 'SD', name: 'Sudan', group: 'Timur Tengah & Afrika Utara' },
  { code: 'YE', name: 'Yaman (Yemen)', group: 'Timur Tengah & Afrika Utara' },

  // Asia Selatan & Asia Timur
  { code: 'PK', name: 'Pakistan', group: 'Asia Selatan & Timur' },
  { code: 'IN', name: 'India', group: 'Asia Selatan & Timur' },
  { code: 'BD', name: 'Bangladesh', group: 'Asia Selatan & Timur' },
  { code: 'JP', name: 'Jepang (Japan)', group: 'Asia Selatan & Timur' },
  { code: 'KR', name: 'Korea Selatan (South Korea)', group: 'Asia Selatan & Timur' },
  { code: 'CN', name: 'Tiongkok (China)', group: 'Asia Selatan & Timur' },
  { code: 'TW', name: 'Taiwan', group: 'Asia Selatan & Timur' },
  { code: 'HK', name: 'Hong Kong', group: 'Asia Selatan & Timur' },

  // Eropa & Barat
  { code: 'AU', name: 'Australia', group: 'Eropa & Barat' },
  { code: 'NZ', name: 'Selandia Baru (New Zealand)', group: 'Eropa & Barat' },
  { code: 'GB', name: 'Inggris (United Kingdom)', group: 'Eropa & Barat' },
  { code: 'US', name: 'Amerika Serikat (USA)', group: 'Eropa & Barat' },
  { code: 'DE', name: 'Jerman (Germany)', group: 'Eropa & Barat' },
  { code: 'NL', name: 'Belanda (Netherlands)', group: 'Eropa & Barat' },
  { code: 'FR', name: 'Prancis (France)', group: 'Eropa & Barat' },
  { code: 'CA', name: 'Kanada (Canada)', group: 'Eropa & Barat' },
  { code: 'RU', name: 'Rusia (Russia)', group: 'Eropa & Barat' },
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
