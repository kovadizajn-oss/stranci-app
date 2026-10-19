import type { Obrazac } from './tipovi'
import { danas, datum, imePrezime, izBaze, nedostaje, poslodavacPolja, poslodavacPrefill, rucno, spoji } from './pomocne'

// Obrazac EP-I — Uputnica za zdravstveni pregled (produljenje privremenog boravka).
// Službeni PDF 612 x 792 pt.

export const UPUTNICA_EP1: Obrazac = {
  id: 'uputnica-ep1',
  format: 'pdf',
  naziv: 'Uputnica za zdravstveni pregled (EP-I)',
  opis: 'Uputnica za obavljanje zdravstvenog pregleda u svrhu produljenja privremenog boravka.',
  predlozak: '/obrasci/uputnica-ep1.pdf',
  nazivDokumenta: 'Uputnica za zdravstveni pregled',

  polja: [
    ...poslodavacPolja(['naziv', 'adresa', 'oib', 'telefon']),
    { key: 'ime_prezime', label: 'Ime i prezime', sekcija: 'Radnik' },
    { key: 'datum_mjesto_rodjenja', label: 'Datum i mjesto rođenja', sekcija: 'Radnik' },
    { key: 'oib_putovnica', label: 'OIB / MBO / broj i mjesto izdavanja putovnice', sekcija: 'Radnik', siroko: true },
    { key: 'zemlja', label: 'Zemlja porijekla', sekcija: 'Radnik' },
    { key: 'zadnji_boravak', label: 'Datum zadnjeg boravka u zemlji porijekla', sekcija: 'Radnik', placeholder: 'npr. 15.01.2024.' },
    { key: 'rad_izvan', label: 'Je li prije dolaska u RH radio izvan matične zemlje? (zemlja i vrijeme)', sekcija: 'Radnik', vrsta: 'dugi', placeholder: 'npr. Ne  /  Da — UAE, 2019. – 2023.' },
    { key: 'posao', label: 'Posao koji obavlja kod poslodavca', sekcija: 'Radnik' },
    { key: 'adresa_kontakt', label: 'Adresa boravišta u Hrvatskoj i kontakt', sekcija: 'Radnik', siroko: true },
    { key: 'datum', label: 'Datum uputnice', sekcija: 'Ostalo' },
    {
      key: 'smjestaj', label: 'Smještaj u Hrvatskoj', sekcija: 'Ostalo', vrsta: 'izbor',
      opcije: [
        { value: 'a', label: 'a) Živi samostalno' },
        { value: 'b', label: 'b) Živi s obitelji' },
        { value: 'c', label: 'c) Kolektivni smještaj' },
        { value: 'd', label: 'd) Drugo' },
      ],
    },
    { key: 'smjestaj_drugo', label: 'Smještaj — drugo (navesti)', sekcija: 'Ostalo', placeholder: 'samo ako je odabrano d)' },
    {
      key: 'razlog', label: 'Status se utvrđuje zbog', sekcija: 'Ostalo', vrsta: 'izbor',
      opcije: [
        { value: 'a', label: 'a) Izdavanja dozvole — prvi pregled' },
        { value: 'b', label: 'b) Promjena statusa — kontrolni pregled' },
      ],
    },
    { key: 'zadnji_pregled', label: 'Posljednji zdravstveni pregled (datum i ustanova)', sekcija: 'Ostalo', siroko: true, placeholder: 'npr. 12.03.2025., Dom zdravlja Zagreb' },
  ],

  popuni(izvor) {
    const r = izvor.radnik
    const put = izvor.putovnica
    const lij = izvor.lijecnicki
    return {
      ...poslodavacPrefill(izvor, ['naziv', 'adresa', 'oib', 'telefon']),
      ime_prezime: { value: imePrezime(izvor) },
      datum_mjesto_rodjenja: {
        value: spoji(datum(r.datum_rodjenja), r.mjesto_rodjenja),
        nedostaje: nedostaje(!r.datum_rodjenja && 'datum rođenja', !r.mjesto_rodjenja && 'mjesto rođenja'),
      },
      oib_putovnica: {
        value: [
          r.oib && `OIB ${r.oib}`,
          put?.broj_dokumenta && spoji(`putovnica br. ${put.broj_dokumenta}`, put.mjesto_izdavanja),
        ].filter(Boolean).join(' / '),
        nedostaje: nedostaje(!r.oib && 'OIB', !put?.broj_dokumenta && 'broj putovnice', !put?.mjesto_izdavanja && 'mjesto izdavanja putovnice'),
      },
      zemlja: izBaze(r.drzava_rodjenja, 'država'),
      zadnji_boravak: rucno(),
      rad_izvan: rucno(),
      posao: izBaze(r.radno_mjesto, 'radno mjesto'),
      adresa_kontakt: {
        value: spoji(r.adresa_smjestaja, r.telefon && `tel. ${r.telefon}`),
        nedostaje: nedostaje(!r.adresa_smjestaja && 'adresa', !r.telefon && 'telefon'),
      },
      datum: { value: danas() },
      smjestaj: { value: izvor.u_smjestaju ? 'c' : '', nedostaje: izvor.u_smjestaju ? undefined : 'odaberi' },
      smjestaj_drugo: { value: '' },
      razlog: { value: '', nedostaje: 'odaberi' },
      zadnji_pregled: {
        value: spoji(datum(lij?.datum_izdavanja), lij?.mjesto_izdavanja),
        nedostaje: nedostaje(!lij?.datum_izdavanja && 'datum', !lij?.mjesto_izdavanja && 'ustanova'),
      },
    }
  },

  crtanje: [
    // Zaglavlje
    { tip: 'tekst', stranica: 0, x: 362, top: 98.5, bottom: 124, desno: 520, kljuc: 'datum' },
    { tip: 'tekst', stranica: 0, x: 362, top: 124, bottom: 149.4, desno: 520, kljuc: 'poslodavac_oib' },
    { tip: 'tekst', stranica: 0, x: 362, top: 149.4, bottom: 182.4, desno: 520, kljuc: 'poslodavac_telefon' },
    { tip: 'tekst', stranica: 0, x: 78, top: 205.3, bottom: 230.8, desno: 518, tekst: v => spoji(v.poslodavac_naziv, v.poslodavac_adresa) },
    // Podaci o radniku
    { tip: 'tekst', stranica: 0, x: 245, top: 345.7, bottom: 371.1, desno: 518, kljuc: 'ime_prezime' },
    { tip: 'tekst', stranica: 0, x: 245, top: 371.1, bottom: 396.5, desno: 518, kljuc: 'datum_mjesto_rodjenja' },
    { tip: 'tekst', stranica: 0, x: 245, top: 396.5, bottom: 430.9, desno: 518, kljuc: 'oib_putovnica' },
    { tip: 'tekst', stranica: 0, x: 245, top: 430.9, bottom: 456.4, desno: 518, kljuc: 'zemlja' },
    { tip: 'tekst', stranica: 0, x: 245, top: 456.4, bottom: 490.8, desno: 518, kljuc: 'zadnji_boravak' },
    { tip: 'tekst', stranica: 0, x: 78, top: 511.6, bottom: 556.1, desno: 518, kljuc: 'rad_izvan' },
    { tip: 'tekst', stranica: 0, x: 245, top: 556.1, bottom: 581.6, desno: 518, kljuc: 'posao' },
    { tip: 'tekst', stranica: 0, x: 245, top: 581.6, bottom: 626, desno: 518, kljuc: 'adresa_kontakt' },
    // Smještaj (zaokružiti) + "Drugo"
    {
      tip: 'oznaka', stil: 'krug', stranica: 0, kljuc: 'smjestaj',
      opcije: { a: [{ x: 83.1, y: 656.65 }], b: [{ x: 83.1, y: 671.55 }], c: [{ x: 83.1, y: 686.55 }], d: [{ x: 83.1, y: 701.45 }] },
    },
    { tip: 'tekst', stranica: 0, x: 165, linija: 705, desno: 520, tekst: v => (v.smjestaj === 'd' ? v.smjestaj_drugo : '') },
    // Stranica 2
    { tip: 'oznaka', stil: 'krug', stranica: 1, kljuc: 'razlog', opcije: { a: [{ x: 83.1, y: 95.15 }], b: [{ x: 83.1, y: 109.95 }] } },
    { tip: 'tekst', stranica: 1, x: 78, top: 158.2, bottom: 202.7, desno: 518, kljuc: 'zadnji_pregled' },
  ],
}
