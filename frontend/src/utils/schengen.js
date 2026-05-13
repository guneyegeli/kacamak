// Schengen Bölgesi havalimanı IATA kodları (2026 itibarıyla 29 ülke).
// Bulgaristan ve Romanya 2024'te hava/deniz, 2025'te tam üye oldu — listede dahil.
// İrlanda EU üyesi ama Schengen değil — listede yok.
const SCHENGEN_IATA = new Set([
  // Avusturya
  'VIE', 'SZG', 'INN', 'GRZ', 'LNZ', 'KLU',
  // Belçika
  'BRU', 'CRL', 'ANR', 'LGG', 'OST',
  // Bulgaristan
  'SOF', 'VAR', 'BOJ', 'PDV',
  // Hırvatistan
  'ZAG', 'SPU', 'DBV', 'PUY', 'RJK', 'ZAD',
  // Çekya
  'PRG', 'BRQ', 'OSR',
  // Danimarka
  'CPH', 'BLL', 'AAL', 'AAR',
  // Estonya
  'TLL', 'TAY',
  // Finlandiya
  'HEL', 'RVN', 'OUL', 'TMP', 'TKU', 'KTT',
  // Fransa
  'PAR', 'CDG', 'ORY', 'MRS', 'NCE', 'LYS', 'TLS', 'BOD', 'NTE', 'LIL',
  'MPL', 'BSL', 'EAP', 'BIA', 'AJA', 'SXB', 'BES', 'FSC',
  // Almanya
  'BER', 'TXL', 'MUC', 'FRA', 'DUS', 'HAM', 'STR', 'CGN', 'NUE', 'HAJ',
  'BRE', 'LEJ', 'DTM', 'FMM', 'FKB', 'PAD', 'NRN', 'FMO', 'HHN',
  // Yunanistan
  'ATH', 'JTR', 'HER', 'RHO', 'JMK', 'CFU', 'SKG', 'CHQ', 'ZTH', 'KGS',
  'KVA', 'EFL', 'PVK', 'AOK', 'JKH', 'JSI', 'JNX', 'JSY',
  // Macaristan
  'BUD', 'DEB',
  // İzlanda
  'KEF', 'RKV', 'AEY', 'EGS', 'HFN',
  // İtalya
  'ROM', 'FCO', 'CIA', 'MXP', 'BGY', 'NAP', 'MIL', 'VCE', 'FLR', 'BLQ',
  'PSA', 'CTA', 'PMO', 'BRI', 'VRN', 'TRN', 'GOA', 'OLB', 'CAG', 'TPS',
  'BDS', 'TRS', 'AHO', 'TSF', 'LIN', 'PEG', 'SUF',
  // Letonya
  'RIX', 'LPX',
  // Lihtenştayn — kendi havalimanı yok (İsviçre/Avusturya kullanılır)
  // Litvanya
  'VNO', 'KUN', 'PLQ',
  // Lüksemburg
  'LUX',
  // Malta
  'MLA',
  // Hollanda
  'AMS', 'RTM', 'EIN', 'GRQ', 'MST',
  // Norveç
  'OSL', 'BGO', 'TRD', 'SVG', 'TOS', 'BOO', 'AES', 'KRS', 'TRF', 'ALF',
  // Polonya
  'WAW', 'KRK', 'GDN', 'KTW', 'POZ', 'WRO', 'RZE', 'LCJ', 'WMI', 'SZZ',
  // Portekiz
  'LIS', 'OPO', 'FAO', 'FNC', 'PDL', 'TER',
  // Romanya
  'OTP', 'BUH', 'CLJ', 'TSR', 'IAS', 'CND', 'SBZ', 'BAY',
  // Slovakya
  'BTS', 'KSC', 'TAT', 'POV',
  // Slovenya
  'LJU', 'MBX', 'POW',
  // İspanya
  'BCN', 'MAD', 'TCI', 'AGP', 'PMI', 'IBZ', 'VLC', 'SVQ', 'BIO', 'ALC',
  'LPA', 'TFS', 'TFN', 'MAH', 'SCQ', 'OVD', 'GRX', 'ACE', 'FUE', 'SDR',
  'XRY', 'REU', 'ZAZ', 'VLL', 'VGO', 'LCG',
  // İsveç
  'ARN', 'GOT', 'MMX', 'BMA', 'NYO', 'LLA', 'UME', 'VST',
  // İsviçre
  'ZRH', 'GVA', 'BRN', 'LUG', 'ACH',
])

export function isSchengen(iata) {
  return iata ? SCHENGEN_IATA.has(iata) : false
}

export default isSchengen
