import { formatDatum } from '@/lib/dokumenti'
import type { Obrazac } from './tipovi'

// Obrazac EP-I — Uputnica za zdravstveni pregled (produljenje privremenog boravka).
// Koordinate ćelija izmjerene na službenom PDF-u (612 x 792 pt).

const danas = () => formatDatum(new Date().toISOString().slice(0, 10))
const spoji = (...d: (string | null | undefined | false)[]) => d.filter(Boolean).join(', ')
const nedostaje = (...d: (string | false)[]) => d.filter(Boolean).join(', ') || undefined

export const UPUTNICA_EP1: Obrazac = {
  id: 'uputnica-ep1',
  naziv: 'Uputnica za zdravstveni pregled (EP-I)',
  opis: 'Uputnica za obavljanje zdravstvenog pregleda u svrhu produljenja privremenog boravka.',
  predlozak: '/obrasci/uputnica-ep1.pdf',
  nazivDokumenta: 'Uputnica za zdravstveni pregled',

  polja: [
    { key: 'poslodavac_naziv', label: 'Poslodavac', sekcija: 'Poslodavac' },
    { key: 'poslodavac_adresa', label: 'Adresa poslodavca', sekcija: 'Poslodavac' },
    { key: 'poslodavac_oib', label: 'OIB poslodavca', sekcija: 'Poslodavac' },
    { key: 'poslodavac_telefon', label: 'Kontakt tel./mob. poslodavca', sekcija: 'Poslodavac' },

    { key: 'ime_prezime', label: 'Ime i prezime', sekcija: 'Radnik' },
    { key: 'datum_mjesto_rodjenja', label: 'Datum i mjesto rođenja', sekcija: 'Radnik' },
    { key: 'oib_putovnica', label: 'OIB / MBO / broj i mjesto izdavanja putovnice', sekcija: 'Radnik' },
    { key: 'zemlja', label: 'Zemlja porijekla', sekcija: 'Radnik' },
    { key: 'zadnji_boravak', label: 'Datum zadnjeg boravka u zemlji porijekla', sekcija: 'Radnik', placeholder: 'npr. 15.01.2024.' },
    { key: 'rad_izvan', label: 'Je li prije dolaska u RH radio izvan matične zemlje? (zemlja i vrijeme)', sekcija: 'Radnik', vrsta: 'dugi', placeholder: 'npr. Ne  /  Da — UAE, 2019. – 2023.' },
    { key: 'posao', label: 'Posao koji obavlja kod poslodavca', sekcija: 'Radnik' },
    { key: 'adresa_kontakt', label: 'Adresa boravišta u Hrvatskoj i kontakt', sekcija: 'Radnik' },

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
    { key: 'zadnji_pregled', label: 'Posljednji zdravstveni pregled (datum i ustanova)', sekcija: 'Ostalo', placeholder: 'npr. 12.03.2025., Dom zdravlja Zagreb' },
  ],

  popuni(izvor) {
    const r = izvor.radnik
    const p = izvor.poslodavac
    const put = izvor.putovnica
    const lij = izvor.lijecnicki
    return {
      poslodavac_naziv: { value: p.naziv || '', nedostaje: nedostaje(!p.naziv && 'naziv') },
      poslodavac_adresa: { value: p.adresa || '', nedostaje: nedostaje(!p.adresa && 'adresa') },
      poslodavac_oib: { value: p.oib || '', nedostaje: nedostaje(!p.oib && 'OIB') },
      poslodavac_telefon: { value: p.telefon || '', nedostaje: nedostaje(!p.telefon && 'telefon') },

      ime_prezime: { value: spoji([r.ime, r.prezime].filter(Boolean).join(' ')) },
      datum_mjesto_rodjenja: {
        value: spoji(formatDatum(r.datum_rodjenja), r.mjesto_rodjenja),
        nedostaje: nedostaje(!r.datum_rodjenja && 'datum rođenja', !r.mjesto_rodjenja && 'mjesto rođenja'),
      },
      oib_putovnica: {
        value: [
          r.oib && `OIB ${r.oib}`,
          put?.broj_dokumenta && spoji(`putovnica br. ${put.broj_dokumenta}`, put.mjesto_izdavanja),
        ].filter(Boolean).join(' / '),
        nedostaje: nedostaje(!r.oib && 'OIB', !put?.broj_dokumenta && 'broj putovnice', !put?.mjesto_izdavanja && 'mjesto izdavanja putovnice'),
      },
      zemlja: { value: r.drzava_rodjenja || '', nedostaje: nedostaje(!r.drzava_rodjenja && 'država') },
      zadnji_boravak: { value: '', nedostaje: 'upiši ručno' },
      rad_izvan: { value: '', nedostaje: 'upiši ručno' },
      posao: { value: r.radno_mjesto || '', nedostaje: nedostaje(!r.radno_mjesto && 'radno mjesto') },
      adresa_kontakt: {
        value: spoji(r.adresa_smjestaja, r.telefon && `tel. ${r.telefon}`),
        nedostaje: nedostaje(!r.adresa_smjestaja && 'adresa', !r.telefon && 'telefon'),
      },

      datum: { value: danas() },
      smjestaj: { value: izvor.u_smjestaju ? 'c' : '', nedostaje: izvor.u_smjestaju ? undefined : 'odaberi' },
      smjestaj_drugo: { value: '' },
      razlog: { value: '', nedostaje: 'odaberi' },
      zadnji_pregled: {
        value: spoji(formatDatum(lij?.datum_izdavanja), lij?.mjesto_izdavanja),
        nedostaje: nedostaje(!lij?.datum_izdavanja && 'datum', !lij?.mjesto_izdavanja && 'ustanova'),
      },
    }
  },

  crtanje: [
    // Stranica 1 — zaglavlje
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
      tip: 'krug', stranica: 0, kljuc: 'smjestaj',
      opcije: { a: { x: 80.1, top: 651.9 }, b: { x: 80.1, top: 666.8 }, c: { x: 80.1, top: 681.8 }, d: { x: 80.1, top: 696.7 } },
    },
    { tip: 'tekst', stranica: 0, x: 165, top: 697, bottom: 708, desno: 520, tekst: v => (v.smjestaj === 'd' ? v.smjestaj_drugo : '') },
    // Stranica 2
    { tip: 'krug', stranica: 1, kljuc: 'razlog', opcije: { a: { x: 80.1, top: 90.4 }, b: { x: 80.1, top: 105.2 } } },
    { tip: 'tekst', stranica: 1, x: 78, top: 158.2, bottom: 202.7, desno: 518, kljuc: 'zadnji_pregled' },
  ],
}
