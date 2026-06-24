import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Employee = {
  id: string
  photo_url: string | null
  ime: string
  prezime: string
  datum_rodjenja: string | null
  mjesto_rodjenja: string | null
  drzava_rodjenja: string | null
  drzava_drzavljanstva: string | null
  adresa_prebivalista: string | null
  email: string | null
  telefon: string | null
  adresa_boravista: string | null
  datum_ulaska_egp: string | null
  mjesto_ulaska_egp: string | null
  poslodavac: string | null
  radno_mjesto: string | null
  created_at: string
}

export type Document = {
  id: string
  employee_id: string
  tip_dokumenta: string | null
  broj_dokumenta: string | null
  datum_izdavanja: string | null
  datum_isteka: string | null
  file_url: string | null
  created_at: string
}

export type Attachment = {
  id: string
  employee_id: string
  tip_dokumenta: string | null
  datum_izdavanja: string | null
  datum_isteka: string | null
  file_url: string | null
  created_at: string
}

export type Obligation = {
  id: string
  employee_id: string
  naslov: string
  opis: string | null
  datum_dospieca: string
  status: string
  created_at: string
}
