import type { ObrazacPopis } from './tipovi'
import { datum, izBaze, nedostaje } from './pomocne'

// Popis radnika za liječnički pregled (Kvantusova "špranca", Word, položeno A4).
// Jedan redak tablice po radniku.

export const POPIS_LIJECNICKI: ObrazacPopis = {
  id: 'popis-lijecnicki',
  naziv: 'Popis za liječnički pregled',
  opis: 'Tablica radnika za naručivanje liječničkog pregleda (ime oca, rođenje, poslovi, OIB, voditelj…).',
  predlozak: '/obrasci/popis-lijecnicki.docx',
  nazivDatoteke: 'Lijecnicki_pregled_popis',

  stupci: [
    { key: 'ime', label: 'Ime' },
    { key: 'prezime', label: 'Prezime' },
    { key: 'ime_oca', label: 'Ime oca' },
    { key: 'datum_rodjenja', label: 'Datum rođenja' },
    { key: 'mjesto_rodjenja', label: 'Mjesto rođenja' },
    { key: 'sprema', label: 'Šk. sprema', sirina: 70 },
    { key: 'radi_od', label: 'U radnom odnosu od', placeholder: 'dd.mm.gggg.' },
    { key: 'poslovi', label: 'Poslovi' },
    { key: 'oib', label: 'OIB radnika' },
    { key: 'datum_pregleda', label: 'Datum pregleda', placeholder: 'neobavezno' },
  ],

  redak(izvor) {
    const r = izvor.radnik
    return {
      ime: izBaze(r.ime, 'ime'),
      prezime: izBaze(r.prezime, 'prezime'),
      ime_oca: izBaze(r.ime_oca, 'ime oca'),
      datum_rodjenja: izBaze(datum(r.datum_rodjenja), 'datum rođenja'),
      mjesto_rodjenja: izBaze(r.mjesto_rodjenja, 'mjesto rođenja'),
      sprema: { value: r.strucna_sprema || 'SSS' },
      radi_od: { value: datum(r.zaposlen_od) },
      poslovi: izBaze(r.radno_mjesto?.split('/')[0] || null, 'poslovi'),
      oib: izBaze(r.oib, 'OIB'),
      datum_pregleda: { value: '' },
    }
  },

  zajednicka: [
    { key: 'tvrtka', label: 'Naziv tvrtke/obrta', sekcija: 'Poslodavac' },
    { key: 'voditelj', label: 'Ime i prezime neposrednog voditelja', sekcija: 'Poslodavac' },
    { key: 'voditelj_oib', label: 'OIB neposrednog voditelja', sekcija: 'Poslodavac' },
  ],

  zajednickoPopuni(izvori) {
    const a = izvori[0]?.agencija
    return {
      tvrtka: { value: (a?.naziv || '').toUpperCase().replace(/ D\.O\.O\.$/, ' d.o.o.') },
      voditelj: { value: a?.direktor || '', nedostaje: nedostaje(!a?.direktor && 'voditelj') },
      voditelj_oib: { value: a?.direktor_oib || '', nedostaje: nedostaje(!a?.direktor_oib && 'OIB voditelja') },
    }
  },

  zamjene: z => ({ TVRTKA: z.tvrtka || '' }),

  redakZamjene: (red, z) => ({
    R_IME: red.ime || '',
    R_PREZIME: red.prezime || '',
    R_IME_OCA: red.ime_oca || '',
    R_DATUM_RODJENJA: red.datum_rodjenja || '',
    R_MJESTO_RODJENJA: red.mjesto_rodjenja || '',
    R_SPREMA: red.sprema || '',
    R_RADI_OD: red.radi_od || '',
    R_POSLOVI: red.poslovi || '',
    R_OIB: red.oib || '',
    R_VODITELJ: [z.voditelj, z.voditelj_oib].filter(Boolean).join('\n'),
    R_DATUM_PREGLEDA: red.datum_pregleda || '',
  }),
}
