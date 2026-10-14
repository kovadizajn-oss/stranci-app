// Smještaj — zajednička polja i pomoćne funkcije.

export const SMJESTAJ_TEKST = ['naziv', 'adresa', 'grad', 'najmodavac', 'najmodavac_kontakt', 'napomena'] as const
export const SMJESTAJ_BROJ = ['povrsina_m2', 'broj_soba', 'kapacitet'] as const

export function smjestajPayload(body: Record<string, unknown>) {
  const out: Record<string, string | number | null> = {}
  for (const k of SMJESTAJ_TEKST) out[k] = String(body[k] ?? '').trim() || null
  for (const k of SMJESTAJ_BROJ) {
    const raw = String(body[k] ?? '').trim().replace(',', '.')
    const n = raw === '' ? null : Number(raw)
    out[k] = n === null || !Number.isFinite(n) || n < 0 ? null : (k === 'povrsina_m2' ? n : Math.round(n))
  }
  return out
}

/** Stanar je trenutni ako nema datuma iseljenja ili je on danas/u budućnosti. */
export function jeTrenutni(datumDo: string | null | undefined) {
  if (!datumDo) return true
  return datumDo >= new Date().toISOString().slice(0, 10)
}

/** Boja popunjenosti: zelena < 90 %, žuta do 100 %, crvena preko kapaciteta. */
export function popunjenost(broj: number, kapacitet: number | null | undefined) {
  if (!kapacitet) return { color: '#64748B', bg: '#F1F5F9', pct: 0, label: `${broj} ${broj === 1 ? 'radnik' : 'radnika'}` }
  const pct = Math.round((broj / kapacitet) * 100)
  const color = broj > kapacitet ? '#DC2626' : pct >= 90 ? '#CA8A04' : '#16A34A'
  const bg = broj > kapacitet ? '#FEE2E2' : pct >= 90 ? '#FEF9C3' : '#DCFCE7'
  return { color, bg, pct, label: `${broj} / ${kapacitet}` }
}

export function formatDatum(d: string | null | undefined) {
  if (!d) return '—'
  const [y, m, dd] = d.split('-')
  return `${dd}.${m}.${y}.`
}

export function sobaPayload(body: Record<string, unknown>) {
  const naziv = String(body.naziv ?? '').trim() || null
  const kreveti = Math.round(Number(String(body.broj_kreveta ?? '').replace(',', '.')))
  const m2raw = String(body.povrsina_m2 ?? '').trim().replace(',', '.')
  const m2 = m2raw === '' ? null : Number(m2raw)
  return {
    naziv,
    broj_kreveta: Number.isFinite(kreveti) && kreveti > 0 ? kreveti : 1,
    povrsina_m2: m2 !== null && Number.isFinite(m2) && m2 > 0 ? m2 : null,
    napomena: String(body.napomena ?? '').trim() || null,
  }
}

/** Kapacitet smještaja: zbroj kreveta ako ima sobe, inače ručno upisani kapacitet. */
export function efektivniKapacitet(kapacitet: number | null | undefined, kreveti: number) {
  return kreveti > 0 ? kreveti : (kapacitet || null)
}
