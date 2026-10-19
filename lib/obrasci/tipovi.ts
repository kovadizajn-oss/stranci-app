// Obrasci koji se generiraju iz podataka radnika.
//  - format 'pdf':  službeni PDF + upisani podaci (koordinate u točkama, mjereno od vrha stranice)
//  - format 'docx': Word predložak s oznakama {{KLJUC}} koje se zamijene podacima
// Napomena: datoteke u lib/obrasci koriste relativne importove (testiraju se i izvan Next.js-a).

/** Podaci iz baze za popunjavanje (vraća /api/obrasci/podaci/[id]). */
export type IzvorObrasca = {
  radnik: {
    ime: string | null
    prezime: string | null
    ime_oca: string | null
    datum_rodjenja: string | null
    mjesto_rodjenja: string | null
    drzava_rodjenja: string | null
    drzavljanstvo: string | null
    oib: string | null
    radno_mjesto: string | null
    adresa_smjestaja: string | null
    telefon: string | null
    adresa_domovina: string | null
    strucna_sprema: string | null
    /** Početak rada kod sadašnjeg poslodavca (ako je poznat) */
    zaposlen_od: string | null
  }
  putovnica: { broj_dokumenta: string | null; mjesto_izdavanja: string | null; datum_izdavanja: string | null; datum_isteka: string | null } | null
  /** Najnovija boravišna / dozvola za boravak i rad */
  boravisna: { naziv: string | null; broj_dokumenta: string | null; datum_isteka: string | null } | null
  lijecnicki: { datum_izdavanja: string | null; mjesto_izdavanja: string | null } | null
  u_smjestaju: boolean
  /** Adresa sadašnjeg smještaja (iz Smještaja) */
  smjestaj: { adresa: string | null } | null
  /** Adresa prethodnog smještaja (iz Smještaja) */
  prethodni_smjestaj: { adresa: string | null } | null
  /** Poslodavac radnika: agencija (ustupanje) ili tvrtka (izravno zaposlenje) */
  poslodavac: {
    tip: 'agencija' | 'tvrtka'
    company_id: string | null
    naziv: string | null
    oib: string | null
    adresa: string | null
    telefon: string | null
    email: string | null
    iban: string | null
    direktor: string | null
  }
  /** Podaci agencije (Kvantus) — uvijek */
  agencija: {
    naziv: string | null
    oib: string | null
    adresa: string | null
    telefon: string | null
    email: string | null
    iban: string | null
    direktor: string | null
    direktor_oib: string | null
  }
  /** Tvrtka u kojoj radnik radi (korisnik kod ustupanja ili poslodavac) */
  tvrtka: { naziv: string | null; adresa: string | null } | null
}

export type SekcijaPolja = 'Poslodavac' | 'Radnik' | 'Ostalo'

export type PoljeObrasca = {
  key: string
  label: string
  sekcija: SekcijaPolja
  vrsta?: 'tekst' | 'dugi' | 'izbor'
  opcije?: { value: string; label: string }[]
  placeholder?: string
  /** Zauzima cijeli red u obrascu za unos */
  siroko?: boolean
}

/** Početna vrijednost polja + što nedostaje (za žuto označavanje). */
export type Prefill = Record<string, { value: string; nedostaje?: string }>

/** Točka na stranici (središte kvadratića / slova koje se zaokružuje) */
export type Tocka = { x: number; y: number; stranica?: number }

export type Crtanje =
  | {
      tip: 'tekst'
      stranica: number
      x: number
      desno: number
      /** Ćelija (gornji i donji rub) — tekst se centrira okomito i prelama u više redova */
      top?: number
      bottom?: number
      /** ILI: osnovna linija teksta (za crte "_____") — jedan red */
      linija?: number
      /** ILI: više crta jedna ispod druge (osnovne linije) — tekst se prelama po crtama */
      linije?: number[]
      kljuc?: string
      tekst?: (v: Record<string, string>) => string
      velicina?: number
    }
  | {
      /** Oznaka odabranog odgovora: zaokruživanje ili X u kvadratiću */
      tip: 'oznaka'
      stil: 'krug' | 'x'
      stranica: number
      kljuc: string
      opcije: Record<string, Tocka[]>
    }

type ObrazacOsnova = {
  id: string
  naziv: string
  opis: string
  /** Predložak u /public */
  predlozak: string
  /** Naziv pod kojim se sprema u dokumente radnika */
  nazivDokumenta: string
  polja: PoljeObrasca[]
  popuni: (izvor: IzvorObrasca) => Prefill
}

export type Obrazac =
  | (ObrazacOsnova & { format: 'pdf'; crtanje: Crtanje[] })
  | (ObrazacOsnova & { format: 'docx'; zamjene: (v: Record<string, string>) => Record<string, string> })

/** Popis više radnika u jednoj tablici (npr. za liječnički pregled) — Word predložak.
 *  Redak tablice s oznakama {{R_...}} ponovi se za svakog radnika. */
export type ObrazacPopis = {
  id: string
  naziv: string
  opis: string
  predlozak: string
  /** Naziv datoteke bez nastavka */
  nazivDatoteke: string
  /** Stupci koji se mogu urediti za svakog radnika */
  stupci: { key: string; label: string; sirina?: number; placeholder?: string }[]
  redak: (izvor: IzvorObrasca) => Prefill
  /** Polja zajednička za cijeli popis (npr. naziv tvrtke, voditelj) */
  zajednicka: PoljeObrasca[]
  zajednickoPopuni: (izvori: IzvorObrasca[]) => Prefill
  zamjene: (zajednicko: Record<string, string>) => Record<string, string>
  redakZamjene: (red: Record<string, string>, zajednicko: Record<string, string>) => Record<string, string>
}

export const POSLODAVAC_KLJUCEVI = [
  'poslodavac_naziv', 'poslodavac_adresa', 'poslodavac_oib', 'poslodavac_telefon',
  'poslodavac_email', 'poslodavac_iban', 'poslodavac_direktor',
] as const
