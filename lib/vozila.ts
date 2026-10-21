// Vozni park — zajedničke oznake, tipovi i pomoćne funkcije.

export type StatusVozila = 'aktivno' | 'u_kvaru' | 'odjavljeno' | 'prodano'

export const STATUS_VOZILA: Record<StatusVozila, { label: string; color: string; bg: string }> = {
  aktivno: { label: 'U upotrebi', color: '#16A34A', bg: '#DCFCE7' },
  u_kvaru: { label: 'U kvaru', color: '#EA580C', bg: '#FFEDD5' },
  odjavljeno: { label: 'Odjavljeno', color: '#64748B', bg: '#F1F5F9' },
  prodano: { label: 'Prodano', color: '#7C3AED', bg: '#F3E8FF' },
}

export type Vozilo = {
  id: string
  marka: string
  model: string | null
  registracija: string | null
  broj_sasije: string | null
  godina: number | null
  lokacija: string | null
  status: StatusVozila
  istek_registracije: string | null
  istek_tehnickog: string | null
  istek_osiguranja: string | null
  osiguravatelj: string | null
  broj_police: string | null
  kilometraza: number | null
  napomena: string | null
  created_at?: string
}

export type Vozac = {
  id: string
  vehicle_id: string
  employee_id: string | null
  ime: string | null
  employees?: { id: string; ime: string; prezime: string } | null
}

export type Dogadjaj = {
  id: string
  vehicle_id: string
  vrsta: string
  datum: string | null
  opis: string | null
  kilometraza: number | null
  trosak: number | null
  servis: string | null
  racun_url: string | null
  created_at?: string
}

/** Vrste zapisa u povijesti vozila. `istek` = polje vozila koje se može odmah obnoviti. */
export const VRSTE_DOGADJAJA: { value: string; label: string; ikona: string; color: string; bg: string; istek?: 'istek_registracije' | 'istek_tehnickog' | 'istek_osiguranja' }[] = [
  { value: 'servis', label: 'Servis', ikona: '🔧', color: '#2563EB', bg: '#EFF6FF' },
  { value: 'popravak', label: 'Popravak', ikona: '🛠️', color: '#EA580C', bg: '#FFEDD5' },
  { value: 'tehnicki', label: 'Tehnički pregled', ikona: '✅', color: '#16A34A', bg: '#DCFCE7', istek: 'istek_tehnickog' },
  { value: 'registracija', label: 'Registracija', ikona: '📋', color: '#4338CA', bg: '#EEF2FF', istek: 'istek_registracije' },
  { value: 'osiguranje', label: 'Osiguranje', ikona: '🛡️', color: '#0F766E', bg: '#CCFBF1', istek: 'istek_osiguranja' },
  { value: 'gume', label: 'Gume', ikona: '🛞', color: '#475569', bg: '#F1F5F9' },
  { value: 'ostalo', label: 'Ostalo', ikona: '📎', color: '#64748B', bg: '#F1F5F9' },
]
export const vrstaDogadjaja = (v: string | null | undefined) => VRSTE_DOGADJAJA.find(x => x.value === v) || VRSTE_DOGADJAJA[VRSTE_DOGADJAJA.length - 1]

export function formatDatum(d: string | null | undefined) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}.`
}

/** Status isteka (registracija, tehnički, osiguranje). rang: 0 isteklo, 1 uskoro, 2 u redu, 3 nije uneseno */
export function istek(datum: string | null | undefined) {
  if (!datum) return { label: 'Nije uneseno', kratko: '—', color: '#94A3B8', bg: '#F1F5F9', rang: 3, dana: Number.POSITIVE_INFINITY }
  const danas = new Date(); danas.setHours(0, 0, 0, 0)
  const d = new Date(datum); d.setHours(0, 0, 0, 0)
  const dana = Math.round((d.getTime() - danas.getTime()) / 86400000)
  if (dana < 0) return { label: `Isteklo ${formatDatum(datum)}`, kratko: 'Isteklo', color: '#DC2626', bg: '#FEE2E2', rang: 0, dana }
  if (dana <= 30) return { label: dana === 0 ? 'Ističe danas' : `Ističe za ${dana} d`, kratko: dana === 0 ? 'Danas' : `${dana} d`, color: dana <= 7 ? '#DC2626' : '#CA8A04', bg: dana <= 7 ? '#FEE2E2' : '#FEF9C3', rang: 1, dana }
  return { label: `Do ${formatDatum(datum)}`, kratko: formatDatum(datum), color: '#16A34A', bg: '#DCFCE7', rang: 2, dana }
}

/** Najhitniji istek vozila (samo za vozila u upotrebi / u kvaru) */
export function najhitnijiIstek(v: Pick<Vozilo, 'status' | 'istek_registracije' | 'istek_tehnickog' | 'istek_osiguranja'>) {
  if (v.status === 'odjavljeno' || v.status === 'prodano') return null
  const svi = [
    { naziv: 'Registracija', ...istek(v.istek_registracije) },
    { naziv: 'Tehnički', ...istek(v.istek_tehnickog) },
    { naziv: 'Osiguranje', ...istek(v.istek_osiguranja) },
  ].filter(x => x.rang < 3)
  return svi.sort((a, b) => a.dana - b.dana)[0] || null
}

export const vozacIme = (v: Vozac) => (v.employees ? `${v.employees.ime} ${v.employees.prezime}` : v.ime || 'Vozač')

const tekst = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const broj = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function voziloPayload(b: Record<string, unknown>) {
  const status = tekst(b.status)
  const god = broj(b.godina)
  const km = broj(b.kilometraza)
  return {
    marka: tekst(b.marka) || '',
    model: tekst(b.model),
    registracija: tekst(b.registracija)?.toUpperCase().replace(/\s+/g, '') || null,
    broj_sasije: tekst(b.broj_sasije)?.toUpperCase().replace(/\s+/g, '') || null,
    godina: god ? Math.round(god) : null,
    lokacija: tekst(b.lokacija),
    status: (status && status in STATUS_VOZILA ? status : 'aktivno') as StatusVozila,
    istek_registracije: tekst(b.istek_registracije),
    istek_tehnickog: tekst(b.istek_tehnickog),
    istek_osiguranja: tekst(b.istek_osiguranja),
    osiguravatelj: tekst(b.osiguravatelj),
    broj_police: tekst(b.broj_police),
    kilometraza: km !== null ? Math.round(km) : null,
    napomena: tekst(b.napomena),
  }
}

export function dogadjajPayload(b: Record<string, unknown>) {
  const vrsta = tekst(b.vrsta)
  const km = broj(b.kilometraza)
  return {
    vrsta: vrsta && VRSTE_DOGADJAJA.some(x => x.value === vrsta) ? vrsta : 'ostalo',
    datum: tekst(b.datum),
    opis: tekst(b.opis),
    kilometraza: km !== null ? Math.round(km) : null,
    trosak: broj(b.trosak),
    servis: tekst(b.servis),
    racun_url: tekst(b.racun_url),
  }
}
