import type { Obrazac } from './tipovi'
import { danas, datumBezTocke, imePrezime, izBaze, nedostaje, rucno } from './pomocne'

// Ugovor o radu (Kvantus, dvojezično HR/EN) — Word predložak s oznakama {{...}}.
// Oznake su na mjestima koja su u Kvantusovoj "šprancu" bila označena žuto.

const TRAJANJE: Record<string, { hr: string; en: string }> = {
  '1': { hr: '1 (jedne)', en: '1 (one)' },
  '2': { hr: '2 (dvije)', en: '2 (two)' },
  '3': { hr: '3 (tri)', en: '3 (three)' },
}

/** Najčešća radna mjesta na engleskom (ostalo se upisuje ručno) */
const PRIJEVOD: Record<string, string> = {
  'skladištar': 'Warehouse worker', 'skladištarka': 'Warehouse worker', 'viličarist': 'Forklift operator',
  'vozač': 'Driver', 'pomoćni radnik': 'Auxiliary worker', 'kuhar': 'Cook', 'konobar': 'Waiter',
  'zidar': 'Bricklayer', 'tesar': 'Carpenter', 'električar': 'Electrician', 'zavarivač': 'Welder',
  'čistač': 'Cleaner', 'čistačica': 'Cleaner', 'monter': 'Fitter', 'bravar': 'Locksmith', 'soboslikar': 'Painter',
}
function prevedi(radno: string | null) {
  if (!radno) return ''
  return PRIJEVOD[radno.split('/')[0].trim().toLowerCase()] || ''
}
/** Datum iz baze (YYYY-MM-DD) → "dd.mm.yyyy"; ručno upisan datum ostaje, bez točke na kraju */
const bezTocke = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? datumBezTocke(d) : d.trim().replace(/\.$/, ''))

export const UGOVOR_O_RADU: Obrazac = {
  id: 'ugovor-o-radu',
  format: 'docx',
  naziv: 'Ugovor o radu (HR/EN)',
  opis: 'Dvojezični ugovor o radu na određeno — Kvantus Solutions kao poslodavac.',
  predlozak: '/obrasci/ugovor-o-radu.docx',
  nazivDokumenta: 'Ugovor o radu',

  polja: [
    { key: 'ime_prezime', label: 'Ime i prezime radnika', sekcija: 'Radnik' },
    { key: 'oib', label: 'OIB', sekcija: 'Radnik' },
    { key: 'adresa', label: 'Adresa u matičnoj zemlji', sekcija: 'Radnik', siroko: true, placeholder: 'npr. House 12, Road 5, Mirpur, Dhaka 1216, Bangladesh' },
    { key: 'datum_rodjenja', label: 'Datum rođenja (dd.mm.gggg)', sekcija: 'Radnik' },
    { key: 'putovnica', label: 'Broj putovnice', sekcija: 'Radnik' },
    { key: 'radno_mjesto', label: 'Poslovi (hrvatski)', sekcija: 'Ostalo' },
    { key: 'radno_mjesto_en', label: 'Poslovi (engleski)', sekcija: 'Ostalo' },
    { key: 'mjesto_rada', label: 'Mjesto rada', sekcija: 'Ostalo', placeholder: 'npr. Vukovina, Velika Gorica' },
    { key: 'datum_sklapanja', label: 'Datum sklapanja (dd.mm.gggg)', sekcija: 'Ostalo' },
    { key: 'pocetak', label: 'Očekivani početak rada (dd.mm.gggg)', sekcija: 'Ostalo' },
    {
      key: 'trajanje', label: 'Trajanje ugovora', sekcija: 'Ostalo', vrsta: 'izbor',
      opcije: [{ value: '1', label: '1 godina' }, { value: '2', label: '2 godine' }, { value: '3', label: '3 godine' }],
    },
  ],

  popuni(izvor) {
    const r = izvor.radnik
    const en = prevedi(r.radno_mjesto)
    return {
      ime_prezime: { value: imePrezime(izvor), nedostaje: nedostaje(!r.prezime && 'prezime') },
      oib: izBaze(r.oib, 'OIB'),
      adresa: izBaze(r.adresa_domovina, 'adresa u matičnoj zemlji (Uredi radnika → Dodatne informacije)'),
      datum_rodjenja: izBaze(datumBezTocke(r.datum_rodjenja), 'datum rođenja'),
      putovnica: izBaze(izvor.putovnica?.broj_dokumenta, 'broj putovnice'),
      radno_mjesto: izBaze(r.radno_mjesto, 'radno mjesto'),
      radno_mjesto_en: izBaze(en, 'prijevod na engleski'),
      mjesto_rada: izBaze(izvor.tvrtka?.adresa, 'mjesto rada'),
      datum_sklapanja: { value: danas().replace(/\.$/, '') },
      pocetak: rucno(),
      trajanje: { value: '2' },
    }
  },

  zamjene: v => ({
    IME_PREZIME: v.ime_prezime || '',
    ADRESA: v.adresa || '',
    DATUM_RODJENJA: bezTocke(v.datum_rodjenja || ''),
    PUTOVNICA: v.putovnica || '',
    OIB: v.oib || '',
    DATUM_SKLAPANJA: bezTocke(v.datum_sklapanja || ''),
    POCETAK: bezTocke(v.pocetak || ''),
    TRAJANJE_HR: TRAJANJE[v.trajanje]?.hr || TRAJANJE['2'].hr,
    TRAJANJE_EN: TRAJANJE[v.trajanje]?.en || TRAJANJE['2'].en,
    RADNO_MJESTO: v.radno_mjesto || '',
    RADNO_MJESTO_EN: v.radno_mjesto_en || '',
    MJESTO_RADA: v.mjesto_rada || '',
  }),
}
