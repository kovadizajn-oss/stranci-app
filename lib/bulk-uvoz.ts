/**
 * Grupni uvoz — pomoćne funkcije za preglednik.
 *
 * Zašto: Vercel ne prima zahtjev veći od 4,5 MB. Zato grupni uvoz:
 *  1. smanji velike fotografije u pregledniku (dokument ostaje čitljiv),
 *  2. dijeli datoteke u grupe po broju I po veličini (najviše 10 datoteka i ~3,4 MB po zahtjevu),
 *  3. velike datoteke (npr. skenirani PDF) šalje izravno u Supabase spremište, a analizi samo putanju,
 *  4. na kraju spaja istu osobu iz različitih grupa.
 */
import { supabase } from '@/lib/supabase'

export const MAX_DATOTEKA_PO_GRUPI = 10
export const MAX_BAJTOVA_PO_GRUPI = 3.4 * 1024 * 1024
/** Datoteke veće od ovoga idu izravno u spremište (ne kroz Vercel). */
export const VELIKA_DATOTEKA = 3.2 * 1024 * 1024
/** AI (Claude) prima najviše ~32 MB po zahtjevu; base64 povećava datoteku za trećinu. */
export const MAX_DATOTEKA_BAJTOVA = 20 * 1024 * 1024
export const PRIVREMENA_MAPA = 'bulk-uvoz/privremeno'

// ─── Smanjivanje fotografija ───────────────────────────────────

/**
 * Smanjuje veliku fotografiju (dulja strana najviše 2200 px, JPEG 85 %).
 * PDF-ovi, GIF-ovi i formati koje preglednik ne zna otvoriti ostaju kakvi jesu.
 */
export async function smanjiSliku(file: File, maxStrana = 2200, kvaliteta = 0.85): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  if (file.size < 700 * 1024) return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    const omjer = Math.min(1, maxStrana / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * omjer))
    const h = Math.max(1, Math.round(bitmap.height * omjer))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) { bitmap.close(); return file }
    ctx.fillStyle = '#ffffff' // prozirni PNG ne smije postati crn
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', kvaliteta))
    if (!blob || blob.size >= file.size) return file
    const ime = file.name.replace(/\.(png|webp|jpe?g)$/i, '') + '.jpg'
    return new File([blob], ime, { type: 'image/jpeg', lastModified: file.lastModified })
  } catch {
    return file
  }
}

// ─── Grupe za slanje ──────────────────────────────────────────

export type Stavka = { indeks: number; ime: string; velicina: number }

/**
 * Dijeli datoteke u grupe za AI. Sortira po imenu datoteke (npr. "Ram Thapa - putovnica", "Ram Thapa - DBR"),
 * da dokumenti iste osobe što češće završe u istoj grupi. Velika datoteka ide sama.
 * Vraća grupe kao popise indeksa u izvornom popisu datoteka.
 */
export function napraviGrupe(
  stavke: Stavka[],
  maxDatoteka = MAX_DATOTEKA_PO_GRUPI,
  maxBajtova = MAX_BAJTOVA_PO_GRUPI,
  velika = VELIKA_DATOTEKA,
): number[][] {
  const sortirane = [...stavke].sort((a, b) => a.ime.localeCompare(b.ime, 'hr', { numeric: true, sensitivity: 'base' }))
  const grupe: number[][] = []
  let trenutna: number[] = []
  let zbroj = 0
  for (const s of sortirane) {
    if (s.velicina > velika) { grupe.push([s.indeks]); continue }
    if (trenutna.length >= maxDatoteka || (trenutna.length > 0 && zbroj + s.velicina > maxBajtova)) {
      grupe.push(trenutna)
      trenutna = []
      zbroj = 0
    }
    trenutna.push(s.indeks)
    zbroj += s.velicina
  }
  if (trenutna.length) grupe.push(trenutna)
  return grupe
}

// ─── Spajanje iste osobe iz različitih grupa ──────────────────

export type RadnikIzAnalize = {
  ime: string | null
  prezime: string | null
  datum_rodjenja: string | null
  drzava_rodjenja: string | null
  oib: string | null
  ime_oca: string | null
  radno_mjesto: string | null
  dokumenti: {
    dokument_naziv: string | null
    kategorija: 'osobni' | 'prateci' | null
    dokument_vrijedi_do: string | null
    datum_izdavanja: string | null
    file_index: number | null
  }[]
}

/** Uklanja dijakritike, uključujući slova koja se ne rastavljaju (đ, ł, ø…). */
function bezDijakritika(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đð]/g, 'd').replace(/[ĐÐ]/g, 'D')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L')
    .replace(/ø/g, 'o').replace(/Ø/g, 'O')
    .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
    .replace(/ß/g, 'ss').replace(/ı/g, 'i')
}

function normaliziraj(s: string | null | undefined): string {
  return bezDijakritika(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Ista osoba = isti OIB, ili isto ime i prezime uz isti datum rođenja (ili datum rođenja nedostaje na jednom dokumentu).
 * Podaci koji nedostaju nadopunjuju se iz drugog zapisa.
 */
export function spojiRadnike<T extends RadnikIzAnalize>(radnici: T[]): T[] {
  const rezultat: T[] = []
  for (const w of radnici) {
    const ime = normaliziraj(w.ime)
    const prezime = normaliziraj(w.prezime)
    const isti = rezultat.find(m => {
      if (w.oib && m.oib) return w.oib === m.oib
      if (!ime || !prezime) return false
      if (normaliziraj(m.ime) !== ime || normaliziraj(m.prezime) !== prezime) return false
      return !w.datum_rodjenja || !m.datum_rodjenja || w.datum_rodjenja === m.datum_rodjenja
    })
    if (isti) {
      isti.dokumenti.push(...(w.dokumenti || []))
      for (const k of ['datum_rodjenja', 'drzava_rodjenja', 'oib', 'ime_oca', 'radno_mjesto'] as const) {
        if (!isti[k] && w[k]) isti[k] = w[k]
      }
    } else {
      rezultat.push({ ...w, dokumenti: [...(w.dokumenti || [])] })
    }
  }
  return rezultat
}

// ─── Izravni upload u Supabase (zaobilazi Vercelovo ograničenje) ─

/** Ime datoteke bez dijakritika i neobičnih znakova, za putanju u spremištu. */
export function sigurnoIme(ime: string): string {
  const cisto = bezDijakritika(ime)
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.]+/, '')
  return (cisto || 'datoteka').slice(-120)
}

/**
 * Šalje datoteku izravno iz preglednika u Supabase spremište "dokumenti".
 * Server samo izda jednokratno dopuštenje (/api/upload-url), pa veličina nije ograničena Vercelom.
 */
export async function uploadIzravno(file: File, putanja: string): Promise<{ putanja: string; url: string }> {
  const res = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: putanja }),
  })
  const json = await res.json().catch(() => ({} as { error?: string }))
  if (!res.ok || !json.token) throw new Error(json.error || `Upload nije uspio (${res.status})`)
  const { error } = await supabase.storage
    .from('dokumenti')
    .uploadToSignedUrl(json.path, json.token, file, { contentType: file.type || undefined })
  if (error) throw new Error(`Upload nije uspio: ${error.message}`)
  const { data } = supabase.storage.from('dokumenti').getPublicUrl(json.path)
  return { putanja: json.path, url: data.publicUrl }
}
