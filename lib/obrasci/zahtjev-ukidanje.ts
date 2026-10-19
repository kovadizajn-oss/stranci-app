import type { Obrazac } from './tipovi'
import { danas, datum, imePrezime, nedostaje, poslodavacPolja, poslodavacPrefill, spoji } from './pomocne'

// Zahtjev za ukidanje dozvole za boravak i rad (Kvantusov predložak; PDF napravljen iz Word dokumenta).
// PDF 595 x 842 pt, 1 stranica.

export const ZAHTJEV_UKIDANJE: Obrazac = {
  id: 'zahtjev-ukidanje',
  format: 'pdf',
  naziv: 'Zahtjev za ukidanje dozvole za boravak i rad',
  opis: 'Zahtjev poslodavca za ukidanje dozvole (npr. nakon prestanka radnog odnosa).',
  predlozak: '/obrasci/zahtjev-ukidanje.pdf',
  nazivDokumenta: 'Zahtjev za ukidanje dozvole za boravak i rad',

  polja: [
    ...poslodavacPolja(['naziv', 'adresa', 'oib']),
    { key: 'stranac', label: 'Ime, prezime i datum rođenja stranca', sekcija: 'Radnik', siroko: true },
    { key: 'razlog', label: 'Razlog ukidanja', sekcija: 'Ostalo', vrsta: 'dugi', placeholder: 'npr. Prestanak ugovora o radu sporazumnim raskidom dana 15.10.2026.' },
    { key: 'napomena', label: 'Napomena', sekcija: 'Ostalo', vrsta: 'dugi', placeholder: 'neobavezno' },
    { key: 'datum', label: 'Datum (U Zagrebu, …)', sekcija: 'Ostalo' },
  ],

  popuni(izvor) {
    const r = izvor.radnik
    return {
      ...poslodavacPrefill(izvor, ['naziv', 'adresa', 'oib']),
      stranac: {
        value: spoji(imePrezime(izvor), datum(r.datum_rodjenja)),
        nedostaje: nedostaje(!r.datum_rodjenja && 'datum rođenja'),
      },
      razlog: { value: '', nedostaje: 'upiši razlog' },
      napomena: { value: '' },
      datum: { value: danas() },
    }
  },

  crtanje: [
    { tip: 'tekst', stranica: 0, x: 73, linija: 222.9, velicina: 11, desno: 518, tekst: v => spoji(v.poslodavac_naziv, v.poslodavac_adresa, v.poslodavac_oib && `OIB: ${v.poslodavac_oib}`) },
    { tip: 'tekst', stranica: 0, x: 73, linija: 304.9, velicina: 11, desno: 518, kljuc: 'stranac' },
    { tip: 'tekst', stranica: 0, x: 73, linije: [372.4, 394.9], velicina: 11, desno: 518, kljuc: 'razlog' },
    { tip: 'tekst', stranica: 0, x: 73, linije: [565.4, 587.9, 610.4], velicina: 11, desno: 518, kljuc: 'napomena' },
    { tip: 'tekst', stranica: 0, x: 128, linija: 655.4, velicina: 11, desno: 225, kljuc: 'datum' },
  ],
}
