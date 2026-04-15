export const VIZESIZ_ULKELER = new Set([
  // Balkanlar
  'BEG',              // Sırbistan
  'SKP',              // Kuzey Makedonya
  'TIA',              // Arnavutluk
  'SJJ', 'BNX',       // Bosna Hersek
  'TGD', 'TIV',       // Karadağ
  'PRN',              // Kosova
  // Doğu Avrupa
  'MSQ',              // Belarus (30 gün)
  'KIV',              // Moldova (90 gün)
  'IEV', 'KBP',       // Ukrayna (90 gün)
  // Kafkasya
  'TBS', 'BUS',       // Gürcistan (1 yıl)
  'GYD', 'BAK', 'GNJ',// Azerbaycan (90 gün)
  // Orta Asya
  'TAS', 'SKD', 'FEG',// Özbekistan (30 gün)
  'OSS', 'FRU',       // Kırgızistan (90 gün)
  'NQZ', 'ALA', 'CIT',// Kazakistan (30 gün)
  // Afrika
  'CMN', 'RAK', 'AGA',// Fas (90 gün)
  'TUN', 'NBE',       // Tunus (90 gün)
  'CPT', 'JNB',       // Güney Afrika (30 gün)
  'MRU',              // Mauritius (30 gün)
  'SEZ',              // Seyşeller
  // Orta Doğu
  'AMM', 'AQJ',       // Ürdün (90 gün)
  'DAM',              // Suriye
  // Asya
  'HND', 'NRT', 'KIX', 'NGO', 'CTS', // Japonya (90 gün)
  'ICN', 'GMP', 'PUS',// Güney Kore (90 gün)
  'HKG',              // Hong Kong (90 gün)
  'KUL', 'LGK', 'JHB',// Malezya (90 gün)
  'SIN',              // Singapur (30 gün)
  'BKK', 'HKT', 'CNX',// Tayland (60 gün)
  'MNL', 'CEB',       // Filipinler (30 gün)
  'DPS', 'CGK',       // Endonezya (30 gün)
  'BRU',              // Brunei (30 gün)
  // Latin Amerika
  'EZE', 'BUE',       // Arjantin (90 gün)
  'GRU', 'GIG',       // Brezilya (90 gün)
  'BOG',              // Kolombiya
  'LIM',              // Peru
  'SCL',              // Şili (90 gün)
  'MVD',              // Uruguay
  'ASU',              // Paraguay
  'GYE', 'UIO',       // Ekvator (90 gün)
  // Karayipler
  'ECN', 'LCA', 'PFO',// Kıbrıs (KKTC dahil)
])

export const EVIZE_ULKELER = new Set([
  'MOW', 'SVO', 'VKO', 'DME', 'LED', 'AER', 'KRR',
  'RMO', 'ROV', 'VOZ', 'KZN', 'SVX', 'MRV', 'MCX',
  'GRV', 'OGZ', 'CEK', 'UFA', 'PEE', 'GOJ', 'OMS',
  'KJA', 'TJM', 'KGD', 'RTW', 'OVB', 'KUF',  // Rusya (e-vize)
  'SSH', 'HRG', 'CAI',  // Mısır (kapıda vize)
  'DXB', 'AUH', 'SHJ',  // BAE (e-vize)
  'DOH',                 // Katar (e-vize)
  'RUH', 'JED', 'MED',  // Suudi Arabistan (e-vize)
  'CMB',                 // Sri Lanka (e-vize)
])

export const isVizesiz = (iataKod) => VIZESIZ_ULKELER.has(iataKod)
export const isEvize = (iataKod) => EVIZE_ULKELER.has(iataKod)
