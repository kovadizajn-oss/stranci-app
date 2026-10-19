import type { Crtanje, Obrazac } from './tipovi'
import { danas, datum, izBaze, poslodavacPolja, poslodavacPrefill } from './pomocne'

// Obrazac 17a — Izjava o primjerenom smještaju (uz zahtjev za dozvolu za boravak i rad).
// PDF 595 x 842 pt, 1 stranica.

/** Desni stupac tablice: [ključ, top, bottom] */
const TABLICA: [string, number, number][] = [
  ['poslodavac_naziv', 264.6, 299.7], ['poslodavac_adresa', 299.7, 334.6], ['poslodavac_oib', 334.6, 369.7],
  ['poslodavac_email', 369.7, 404.6], ['poslodavac_telefon', 404.6, 443.3],
  ['prezime', 443.3, 478.4], ['ime', 478.4, 513.4], ['datum_rodjenja', 513.4, 548.3],
  ['mjesto_rodjenja', 548.3, 583.4], ['drzavljanstvo', 583.4, 618.4],
]

export const OBRAZAC_17A: Obrazac = {
  id: 'obrazac-17a',
  format: 'pdf',
  naziv: 'Izjava o primjerenom smještaju (Obrazac 17a)',
  opis: 'Izjava poslodavca da smještaj radnika odgovara propisanim uvjetima — uz zahtjev za dozvolu.',
  predlozak: '/obrasci/obrazac-17a.pdf',
  nazivDokumenta: 'Izjava o primjerenom smještaju (17a)',

  polja: [
    ...poslodavacPolja(['naziv', 'adresa', 'oib', 'email', 'telefon']),
    { key: 'prezime', label: 'Prezime', sekcija: 'Radnik' },
    { key: 'ime', label: 'Ime', sekcija: 'Radnik' },
    { key: 'datum_rodjenja', label: 'Datum rođenja', sekcija: 'Radnik' },
    { key: 'mjesto_rodjenja', label: 'Mjesto rođenja', sekcija: 'Radnik' },
    { key: 'drzavljanstvo', label: 'Državljanstvo', sekcija: 'Radnik' },
    { key: 'adresa_smjestaja', label: 'Adresa smještaja', sekcija: 'Radnik', siroko: true },
    { key: 'tijelo', label: 'Naziv tijela kojemu se izjava podnosi', sekcija: 'Ostalo', siroko: true },
    { key: 'mjesto', label: 'Mjesto potpisa (U …)', sekcija: 'Ostalo' },
    { key: 'datum', label: 'Datum', sekcija: 'Ostalo' },
  ],

  popuni(izvor) {
    const r = izvor.radnik
    return {
      ...poslodavacPrefill(izvor, ['naziv', 'adresa', 'oib', 'email', 'telefon']),
      prezime: izBaze(r.prezime, 'prezime'),
      ime: izBaze(r.ime, 'ime'),
      datum_rodjenja: izBaze(datum(r.datum_rodjenja), 'datum rođenja'),
      mjesto_rodjenja: izBaze(r.mjesto_rodjenja, 'mjesto rođenja'),
      drzavljanstvo: izBaze(r.drzavljanstvo, 'državljanstvo'),
      adresa_smjestaja: izBaze(izvor.smjestaj?.adresa || r.adresa_smjestaja, 'adresa smještaja'),
      tijelo: { value: 'Policijska uprava zagrebačka' },
      mjesto: { value: 'Zagrebu' },
      datum: { value: danas() },
    }
  },

  crtanje: [
    { tip: 'tekst', stranica: 0, x: 73, linija: 99, desno: 278, kljuc: 'tijelo' },
    { tip: 'tekst', stranica: 0, x: 73, linija: 213, desno: 405, kljuc: 'adresa_smjestaja' },
    ...TABLICA.map(([kljuc, top, bottom]): Crtanje => ({ tip: 'tekst', stranica: 0, x: 320, top, bottom, desno: 546, kljuc })),
    { tip: 'tekst', stranica: 0, x: 86, linija: 714.5, desno: 246, kljuc: 'mjesto' },
    { tip: 'tekst', stranica: 0, x: 280, linija: 714.5, desno: 434, kljuc: 'datum' },
  ],
}
