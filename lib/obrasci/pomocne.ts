import { formatDatum } from '../dokumenti'
import type { IzvorObrasca, PoljeObrasca, Prefill } from './tipovi'

// Zajedničke pomoćne funkcije za definicije obrazaca.

export const danas = () => formatDatum(new Date().toISOString().slice(0, 10))
/** dd.mm.yyyy. (s točkom na kraju) */
export const datum = (d: string | null | undefined) => formatDatum(d)
/** dd.mm.yyyy (bez točke na kraju — kad predložak već ima točku) */
export const datumBezTocke = (d: string | null | undefined) => formatDatum(d).replace(/\.$/, '')
export const spoji = (...d: (string | null | undefined | false)[]) => d.filter(Boolean).join(', ')
export const nedostaje = (...d: (string | false | null | undefined)[]) => d.filter(Boolean).join(', ') || undefined
export const imePrezime = (i: IzvorObrasca) => [i.radnik.ime, i.radnik.prezime].filter(Boolean).join(' ')

/** Polje koje se uvijek upisuje ručno */
export const rucno = (value = '') => ({ value, nedostaje: value ? undefined : 'upiši ručno' })
/** Vrijednost iz baze; ako je nema, polje je žuto s opisom */
export const izBaze = (value: string | null | undefined, opis: string) => ({ value: value || '', nedostaje: value ? undefined : opis })

type PoslodavacKey = 'naziv' | 'adresa' | 'oib' | 'telefon' | 'email' | 'iban' | 'direktor'
const POSLODAVAC_LABELE: Record<PoslodavacKey, string> = {
  naziv: 'Poslodavac (naziv)', adresa: 'Sjedište / adresa', oib: 'OIB poslodavca', telefon: 'Telefon',
  email: 'E-mail', iban: 'Žiro račun (IBAN)', direktor: 'Direktor / odgovorna osoba',
}

/** Polja poslodavca za obrazac (sekcija "Poslodavac") */
export function poslodavacPolja(kljucevi: PoslodavacKey[]): PoljeObrasca[] {
  return kljucevi.map(k => ({ key: `poslodavac_${k}`, label: POSLODAVAC_LABELE[k], sekcija: 'Poslodavac' as const }))
}

/** Početne vrijednosti polja poslodavca */
export function poslodavacPrefill(izvor: IzvorObrasca, kljucevi: PoslodavacKey[]): Prefill {
  const p = izvor.poslodavac
  const out: Prefill = {}
  for (const k of kljucevi) out[`poslodavac_${k}`] = izBaze(p[k], POSLODAVAC_LABELE[k].toLowerCase())
  return out
}
