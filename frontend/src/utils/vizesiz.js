import vizeData from './vizesiz_otomatik.json'

export const VIZESIZ_ULKELER = new Set(vizeData.vizesiz)
export const EVIZE_ULKELER = new Set(vizeData.evize)
export const KAPIDA_ULKELER = new Set(vizeData.kapida)

export const isVizesiz = (kod) => VIZESIZ_ULKELER.has(kod)
export const isEvize = (kod) => EVIZE_ULKELER.has(kod)
export const isKapida = (kod) => KAPIDA_ULKELER.has(kod)
