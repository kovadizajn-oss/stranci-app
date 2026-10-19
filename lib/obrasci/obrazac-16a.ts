import type { Crtanje, Obrazac } from './tipovi'
import { danas, datum, izBaze, nedostaje, rucno, spoji } from './pomocne'

// Obrazac 16a — Prijava/odjava smještaja, boravišta i prebivališta (državljani trećih zemalja).
// Skenirani PDF 595 x 842 pt, 2 stranice (prijava + potvrda).

const VRSTE: { value: string; label: string; glavni: 'p' | 'o'; y: number; x: number }[] = [
  { value: 'p-smjestaj', label: 'Prijava smještaja (kratkotrajni boravak)', glavni: 'p', x: 130.5, y: 183 },
  { value: 'p-boraviste', label: 'Prijava boravišta', glavni: 'p', x: 130.5, y: 194.5 },
  { value: 'p-prebivaliste', label: 'Prijava prebivališta', glavni: 'p', x: 130.5, y: 205.8 },
  { value: 'p-adresa', label: 'Prijava promjene adrese stanovanja', glavni: 'p', x: 130.5, y: 217.2 },
  { value: 'o-smjestaj', label: 'Odjava smještaja', glavni: 'o', x: 128.7, y: 240 },
  { value: 'o-boraviste', label: 'Odjava boravišta', glavni: 'o', x: 128.7, y: 252.1 },
  { value: 'o-prebivaliste', label: 'Odjava prebivališta', glavni: 'o', x: 128.7, y: 263.6 },
]
const GLAVNI = { p: { x: 83.8, y: 171.2 }, o: { x: 83.8, y: 228.4 } }

/** Ćelije desnog stupca: [ključ, top, bottom] */
const STR1: [string, number, number][] = [
  ['prezime', 268.8, 290], ['ime', 290, 311.2], ['mjesto_drzava_datum', 311.2, 332], ['drzavljanstvo', 332, 353],
  ['putna_isprava', 353, 384.2], ['viza', 384.2, 405.8], ['ulazak', 405.8, 427], ['rok_boravka', 427, 448.2],
  ['novi_smjestaj', 448.2, 480.2], ['prethodni_smjestaj', 480.2, 510.8], ['datum_prijave', 510.8, 531.8], ['datum_odjave', 531.8, 553.2],
]
const STR2: [string, number, number][] = [
  ['prezime', 189, 215], ['ime', 215, 242], ['mjesto_drzava_datum', 242, 267.5], ['putna_isprava', 267.5, 306],
  ['novi_smjestaj', 306, 344], ['datum_prijave', 344, 383], ['datum_odjave', 383, 421],
]

export const OBRAZAC_16A: Obrazac = {
  id: 'obrazac-16a',
  format: 'pdf',
  naziv: 'Prijava/odjava boravišta (Obrazac 16a)',
  opis: 'Prijava ili odjava smještaja, boravišta i prebivališta državljanina treće zemlje — s potvrdom.',
  predlozak: '/obrasci/obrazac-16a.pdf',
  nazivDokumenta: 'Prijava/odjava boravišta (16a)',

  polja: [
    { key: 'vrsta', label: 'Vrsta prijave / odjave', sekcija: 'Ostalo', vrsta: 'izbor', opcije: VRSTE.map(v => ({ value: v.value, label: v.label })) },
    { key: 'prezime', label: 'Prezime', sekcija: 'Radnik' },
    { key: 'ime', label: 'Ime', sekcija: 'Radnik' },
    { key: 'mjesto_drzava_datum', label: 'Mjesto, država i datum rođenja', sekcija: 'Radnik', siroko: true },
    { key: 'drzavljanstvo', label: 'Državljanstvo', sekcija: 'Radnik' },
    { key: 'putna_isprava', label: 'Vrsta i broj putne isprave', sekcija: 'Radnik' },
    { key: 'viza', label: 'Vrsta i broj vize, mjesto izdavanja i rok važenja', sekcija: 'Radnik', siroko: true, placeholder: 'ako nema vize, ostavi prazno' },
    { key: 'ulazak', label: 'Datum i mjesto ulaska u RH', sekcija: 'Radnik', placeholder: 'npr. 10.02.2026., Zračna luka Zagreb' },
    { key: 'rok_boravka', label: 'Rok važenja odobrenja boravka', sekcija: 'Radnik' },
    { key: 'novi_smjestaj', label: 'Novi smještaj / boravište / adresa', sekcija: 'Radnik', siroko: true },
    { key: 'prethodni_smjestaj', label: 'Prethodni smještaj / boravište u RH', sekcija: 'Radnik', siroko: true },
    { key: 'datum_prijave', label: 'Datum prijave', sekcija: 'Ostalo' },
    { key: 'datum_odjave', label: 'Datum odjave', sekcija: 'Ostalo' },
    { key: 'podnositelj', label: 'Ime i prezime podnositelja prijave', sekcija: 'Ostalo' },
  ],

  popuni(izvor) {
    const r = izvor.radnik
    const put = izvor.putovnica
    return {
      vrsta: { value: '', nedostaje: 'odaberi' },
      prezime: izBaze(r.prezime, 'prezime'),
      ime: izBaze(r.ime, 'ime'),
      mjesto_drzava_datum: {
        value: spoji(r.mjesto_rodjenja, r.drzava_rodjenja, datum(r.datum_rodjenja)),
        nedostaje: nedostaje(!r.mjesto_rodjenja && 'mjesto rođenja', !r.drzava_rodjenja && 'država', !r.datum_rodjenja && 'datum rođenja'),
      },
      drzavljanstvo: izBaze(r.drzavljanstvo, 'državljanstvo'),
      putna_isprava: { value: put?.broj_dokumenta ? `Putovnica, br. ${put.broj_dokumenta}` : '', nedostaje: put?.broj_dokumenta ? undefined : 'broj putovnice' },
      viza: { value: '' },
      ulazak: rucno(),
      rok_boravka: izBaze(datum(izvor.boravisna?.datum_isteka), 'datum isteka boravišne dozvole'),
      novi_smjestaj: izBaze(izvor.smjestaj?.adresa || r.adresa_smjestaja, 'adresa'),
      prethodni_smjestaj: { value: izvor.prethodni_smjestaj?.adresa || '' },
      datum_prijave: { value: danas() },
      datum_odjave: { value: '' },
      podnositelj: izBaze(izvor.agencija.direktor, 'ime i prezime'),
    }
  },

  crtanje: [
    // Vrsta: kvadratić PRIJAVA/ODJAVA + podvrsta
    {
      tip: 'oznaka', stil: 'x', stranica: 0, kljuc: 'vrsta',
      opcije: Object.fromEntries(VRSTE.map(v => [v.value, [GLAVNI[v.glavni], { x: v.x, y: v.y }]])),
    },
    ...STR1.map(([kljuc, top, bottom]): Crtanje => ({ tip: 'tekst', stranica: 0, x: 318, top, bottom, desno: 534, kljuc })),
    { tip: 'tekst', stranica: 0, x: 232, top: 649, bottom: 679, desno: 534, kljuc: 'podnositelj' },
    // Stranica 2 — potvrda
    ...STR2.map(([kljuc, top, bottom]): Crtanje => ({ tip: 'tekst', stranica: 1, x: 314, top, bottom, desno: 530, kljuc })),
  ],
}
