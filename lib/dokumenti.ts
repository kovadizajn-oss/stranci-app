// Dokumenti radnika — vrste, status isteka i "zamijenjeni" (stari) dokumenti.
// Bez importa sa servera: koristi se i na stranicama i u API rutama.

export type Kategorija = 'osobni' | 'prateci'

export const OSOBNI_TYPES = ['Putovnica', 'Osobna iskaznica', 'Boravišna dozvola', 'Vozačka dozvola']
export const PRATECI_TYPES = ['Radna dozvola', 'Liječnički pregled', 'Ugovor o radu', 'Potvrda o boravku']

export const KATEGORIJA_TAG: Record<Kategorija, { label: string; color: string; bg: string }> = {
  osobni: { label: 'Osobni', color: '#4338CA', bg: '#EEF2FF' },
  prateci: { label: 'Prateći', color: '#0369A1', bg: '#E0F2FE' },
}

export type Dokument = {
  id: string
  employee_id: string
  naziv: string | null
  kategorija: Kategorija | null
  datum_izdavanja: string | null
  datum_isteka: string | null
  file_url: string | null
  created_at?: string | null
}

/** Kategorija poznate vrste dokumenta (null = "Ostalo"). */
export function kategorijaZaNaziv(naziv: string | null | undefined): Kategorija | null {
  if (!naziv) return null
  if (OSOBNI_TYPES.includes(naziv)) return 'osobni'
  if (PRATECI_TYPES.includes(naziv)) return 'prateci'
  return null
}

export function formatDatum(d: string | null | undefined) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}.`
}

/** Status prema datumu isteka. rang: 0 isteklo, 1 uskoro (≤30 d), 2 vrijedi, 3 bez datuma. */
export function dokumentStatus(datumIsteka: string | null | undefined) {
  if (!datumIsteka) return { label: 'Bez datuma isteka', color: '#64748B', bg: '#F1F5F9', rang: 3, dana: Number.POSITIVE_INFINITY }
  const danas = new Date(); danas.setHours(0, 0, 0, 0)
  const d = new Date(datumIsteka); d.setHours(0, 0, 0, 0)
  const dana = Math.round((d.getTime() - danas.getTime()) / 86400000)
  if (dana < 0) return { label: 'Isteklo', color: '#DC2626', bg: '#FEE2E2', rang: 0, dana }
  if (dana === 0) return { label: 'Istječe danas', color: '#DC2626', bg: '#FEE2E2', rang: 1, dana }
  if (dana <= 7) return { label: `Istječe za ${dana} d`, color: '#DC2626', bg: '#FEE2E2', rang: 1, dana }
  if (dana <= 30) return { label: `Istječe za ${dana} d`, color: '#CA8A04', bg: '#FEF9C3', rang: 1, dana }
  return { label: 'Vrijedi', color: '#16A34A', bg: '#DCFCE7', rang: 2, dana }
}

type DokMin = {
  id: string
  employee_id: string
  naziv: string | null
  datum_isteka: string | null
  datum_izdavanja?: string | null
}

/** Je li dokument b noviji od a (iste vrste)? Uspoređuje datum isteka, pa datum izdavanja. */
function noviji(b: DokMin, a: DokMin) {
  if (a.datum_isteka && b.datum_isteka && a.datum_isteka !== b.datum_isteka) return b.datum_isteka > a.datum_isteka
  if (a.datum_izdavanja && b.datum_izdavanja && a.datum_izdavanja !== b.datum_izdavanja) return b.datum_izdavanja > a.datum_izdavanja
  return false
}

/**
 * ID-jevi "starih" dokumenata: radnik ima noviji dokument istog naziva (npr. nova boravišna).
 * Takvi se ne broje u istek (popis, nadzorna ploča, kalendar, e-mail podsjetnik).
 */
export function zamijenjeniIds(docs: DokMin[]): Set<string> {
  const grupe = new Map<string, DokMin[]>()
  for (const d of docs) {
    const naziv = (d.naziv || '').trim().toLowerCase()
    if (!naziv || !d.employee_id) continue
    const k = `${d.employee_id}|${naziv}`
    const g = grupe.get(k)
    if (g) g.push(d); else grupe.set(k, [d])
  }
  const out = new Set<string>()
  for (const g of grupe.values()) {
    if (g.length < 2) continue
    for (const a of g) if (g.some(b => b.id !== a.id && noviji(b, a))) out.add(a.id)
  }
  return out
}
