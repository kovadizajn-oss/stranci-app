import type { Obrazac } from './tipovi'
import { datum, imePrezime, izBaze, nedostaje } from './pomocne'

// Obrazac 18a — Potvrda o zdravstvenom stanju i cjepnom statusu.
// Radnik ispunjava samo osobne podatke (engleski, tiskanim slovima); ostalo ispunjava liječnik.
// PDF 595 x 842 pt, 2 stranice.

/** Dio datuma: 0 = dan, 1 = mjesec, 2 = godina. Prima "dd.mm.gggg." ili "gggg-mm-dd". */
function dio(d: string, i: number) {
  const s = (d || '').trim()
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (iso) return [iso[3], iso[2], iso[1]][i]
  const dijelovi = s.replace(/\.$/, '').split(/[./\s-]+/).filter(Boolean)
  return dijelovi[i] || ''
}

export const OBRAZAC_18A: Obrazac = {
  id: 'obrazac-18a',
  format: 'pdf',
  naziv: 'Potvrda o zdravstvenom stanju (Obrazac 18a)',
  opis: 'Certificate of Health Status — upisuju se osobni podaci radnika, ostalo ispunjava liječnik.',
  predlozak: '/obrasci/obrazac-18a.pdf',
  nazivDokumenta: 'Potvrda o zdravstvenom stanju (18a)',

  polja: [
    { key: 'ime_prezime', label: 'Full name (ime i prezime) — upisuje se tiskanim slovima', sekcija: 'Radnik', siroko: true },
    { key: 'datum_rodjenja', label: 'Date of birth (dd.mm.gggg.)', sekcija: 'Radnik', placeholder: '05.06.1995.' },
    { key: 'putovnica', label: 'Passport number', sekcija: 'Radnik' },
    { key: 'izdano_u', label: 'Issued in (mjesto izdavanja)', sekcija: 'Radnik' },
  ],

  popuni(izvor) {
    const put = izvor.putovnica
    return {
      ime_prezime: { value: imePrezime(izvor).toUpperCase(), nedostaje: nedostaje(!izvor.radnik.ime && 'ime') },
      datum_rodjenja: izBaze(datum(izvor.radnik.datum_rodjenja), 'datum rođenja'),
      putovnica: izBaze(put?.broj_dokumenta, 'broj putovnice'),
      izdano_u: izBaze(put?.mjesto_izdavanja?.toUpperCase(), 'mjesto izdavanja putovnice'),
    }
  },

  crtanje: [
    { tip: 'tekst', stranica: 0, x: 274, linija: 224.5, desno: 530, tekst: v => (v.ime_prezime || '').toUpperCase() },
    // Datum rođenja: ____/_____/_______
    { tip: 'tekst', stranica: 0, x: 128, linija: 265.5, desno: 143, tekst: v => dio(v.datum_rodjenja, 0) },
    { tip: 'tekst', stranica: 0, x: 149, linija: 265.5, desno: 167, tekst: v => dio(v.datum_rodjenja, 1) },
    { tip: 'tekst', stranica: 0, x: 176, linija: 265.5, desno: 202, tekst: v => dio(v.datum_rodjenja, 2) },
    { tip: 'tekst', stranica: 0, x: 144, linija: 307, desno: 244, tekst: v => (v.putovnica || '').toUpperCase() },
    { tip: 'tekst', stranica: 0, x: 290, linija: 307, desno: 520, tekst: v => (v.izdano_u || '').toUpperCase() },
  ],
}
