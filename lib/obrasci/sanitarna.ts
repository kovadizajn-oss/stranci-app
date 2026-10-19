import type { Obrazac } from './tipovi'
import { danas, imePrezime, poslodavacPolja, poslodavacPrefill } from './pomocne'

// Narudžbenica za pregled djelatnika za sanitarnu iskaznicu (Zavod za javno zdravstvo Zadar).
// PDF 595 x 842 pt, 1 stranica.

const POSLODAVAC = ['naziv', 'direktor', 'adresa', 'oib', 'iban', 'telefon', 'email'] as const

export const SANITARNA: Obrazac = {
  id: 'sanitarna-narudzbenica',
  format: 'pdf',
  naziv: 'Narudžbenica za sanitarnu iskaznicu',
  opis: 'Narudžbenica za pregled djelatnika za sanitarnu iskaznicu (ZZJZ Zadar).',
  predlozak: '/obrasci/sanitarna-narudzbenica.pdf',
  nazivDokumenta: 'Narudžbenica za sanitarnu iskaznicu',

  polja: [
    ...poslodavacPolja([...POSLODAVAC]),
    { key: 'djelatnik', label: 'Djelatnik (ime i prezime)', sekcija: 'Radnik', siroko: true },
    { key: 'broj', label: 'Broj narudžbenice', sekcija: 'Ostalo', placeholder: 'neobavezno' },
    {
      key: 'placanje', label: 'Način plaćanja', sekcija: 'Ostalo', vrsta: 'izbor',
      opcije: [
        { value: 'gotovina', label: 'Gotovinom na blagajni na dan pregleda' },
        { value: 'virman', label: 'Virmanski temeljem računa R1' },
      ],
    },
    { key: 'mjesto_datum', label: 'Mjesto i datum', sekcija: 'Ostalo' },
  ],

  popuni(izvor) {
    return {
      ...poslodavacPrefill(izvor, [...POSLODAVAC]),
      djelatnik: { value: imePrezime(izvor) },
      broj: { value: '' },
      placanje: { value: 'virman' },
      mjesto_datum: { value: `Zagreb, ${danas()}` },
    }
  },

  crtanje: [
    { tip: 'tekst', stranica: 0, x: 430, linija: 160.4, velicina: 11, desno: 499, kljuc: 'broj' },
    { tip: 'tekst', stranica: 0, x: 241, linija: 208, velicina: 11, desno: 501, kljuc: 'poslodavac_naziv' },
    { tip: 'tekst', stranica: 0, x: 240, linija: 231.8, velicina: 11, desno: 499, kljuc: 'poslodavac_direktor' },
    { tip: 'tekst', stranica: 0, x: 240, linija: 255.5, velicina: 11, desno: 500, kljuc: 'poslodavac_adresa' },
    { tip: 'tekst', stranica: 0, x: 243, linija: 279.4, velicina: 11, desno: 502, kljuc: 'poslodavac_oib' },
    { tip: 'tekst', stranica: 0, x: 245, linija: 303.2, velicina: 11, desno: 504, kljuc: 'poslodavac_iban' },
    { tip: 'tekst', stranica: 0, x: 245, linija: 327.1, velicina: 11, desno: 504, kljuc: 'poslodavac_telefon' },
    { tip: 'tekst', stranica: 0, x: 245, linija: 350.8, velicina: 11, desno: 504, kljuc: 'poslodavac_email' },
    { tip: 'tekst', stranica: 0, x: 121, linija: 398.5, velicina: 11, desno: 505, kljuc: 'djelatnik' },
    { tip: 'oznaka', stil: 'x', stranica: 0, kljuc: 'placanje', opcije: { gotovina: [{ x: 182.8, y: 488.3 }], virman: [{ x: 182.8, y: 508.1 }] } },
    { tip: 'tekst', stranica: 0, x: 73, linija: 602.4, velicina: 11, desno: 212, kljuc: 'mjesto_datum' },
  ],
}
