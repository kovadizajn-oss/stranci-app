// Obrasci koji se generiraju iz podataka radnika (službeni PDF + upisani podaci).

/** Podaci iz baze za popunjavanje (vraća /api/obrasci/podaci/[id]). */
export type IzvorObrasca = {
  radnik: {
    ime: string | null
    prezime: string | null
    datum_rodjenja: string | null
    mjesto_rodjenja: string | null
    drzava_rodjenja: string | null
    oib: string | null
    radno_mjesto: string | null
    adresa_smjestaja: string | null
    telefon: string | null
  }
  putovnica: { broj_dokumenta: string | null; mjesto_izdavanja: string | null } | null
  lijecnicki: { datum_izdavanja: string | null; mjesto_izdavanja: string | null } | null
  u_smjestaju: boolean
  poslodavac: {
    tip: 'agencija' | 'tvrtka'
    company_id: string | null
    naziv: string | null
    oib: string | null
    adresa: string | null
    telefon: string | null
  }
}

export type SekcijaPolja = 'Poslodavac' | 'Radnik' | 'Ostalo'

export type PoljeObrasca = {
  key: string
  label: string
  sekcija: SekcijaPolja
  vrsta?: 'tekst' | 'dugi' | 'izbor'
  opcije?: { value: string; label: string }[]
  placeholder?: string
}

/** Početna vrijednost polja + što nedostaje (za žuto označavanje). */
export type Prefill = Record<string, { value: string; nedostaje?: string }>

export type Crtanje =
  | {
      tip: 'tekst'
      stranica: number
      /** Ćelija na obrascu (točke, mjereno od vrha stranice) */
      x: number; top: number; bottom: number; desno: number
      kljuc?: string
      tekst?: (v: Record<string, string>) => string
      velicina?: number
    }
  | {
      /** Zaokruživanje ponuđenog odgovora (a, b, c...) */
      tip: 'krug'
      stranica: number
      kljuc: string
      opcije: Record<string, { x: number; top: number }>
    }

export type Obrazac = {
  id: string
  naziv: string
  opis: string
  /** PDF predložak u /public */
  predlozak: string
  /** Naziv pod kojim se sprema u dokumente radnika */
  nazivDokumenta: string
  polja: PoljeObrasca[]
  popuni: (izvor: IzvorObrasca) => Prefill
  crtanje: Crtanje[]
}

export const POSLODAVAC_KLJUCEVI = ['poslodavac_naziv', 'poslodavac_adresa', 'poslodavac_oib', 'poslodavac_telefon'] as const
