import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { zamijenjeniIds } from '@/lib/dokumenti'
import { AGENCIJA } from '@/lib/zaposlenje'
import type { IzvorObrasca } from '@/lib/obrasci/tipovi'

// Podaci radnika za popunjavanje obrazaca.
// Poslodavac: kod ustupanja (i kad vrsta nije određena) je agencija, kod izravnog zaposlenja tvrtka.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const danas = new Date().toISOString().slice(0, 10)

  const [{ data: emp }, { data: docs }, { data: stanovi }, { data: postavka }, { data: povijest }] = await Promise.all([
    supabase.from('employees').select('*').eq('id', id).single(),
    supabase.from('documents').select('*').eq('employee_id', id),
    supabase.from('accommodation_residents').select('datum_od, datum_do, accommodations(naziv, adresa, grad)').eq('employee_id', id),
    supabase.from('postavke').select('vrijednost').eq('kljuc', 'agencija').maybeSingle(),
    supabase.from('employee_assignments').select('datum_do').eq('employee_id', id).eq('faza', 'prijasnje')
      .not('datum_do', 'is', null).order('datum_do', { ascending: false }).limit(1),
  ])
  if (!emp) return NextResponse.json({ error: 'Radnik nije pronađen.' }, { status: 404 })

  const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

  // Najnoviji aktualni dokument određene vrste
  const zamijenjeni = zamijenjeniIds(docs || [])
  const najnoviji = (...nazivi: string[]) => (docs || [])
    .filter(d => nazivi.includes(d.naziv) && !zamijenjeni.has(d.id))
    .sort((a, b) => (b.datum_isteka || b.datum_izdavanja || '').localeCompare(a.datum_isteka || a.datum_izdavanja || ''))[0] || null
  const putovnica = najnoviji('Putovnica')
  const boravisna = najnoviji('Boravišna dozvola', 'Radna dozvola')
  const lijecnicki = (docs || []).filter(d => d.naziv === 'Liječnički pregled')
    .sort((a, b) => (b.datum_izdavanja || '').localeCompare(a.datum_izdavanja || ''))[0] || null

  // Smještaj: sadašnji i prethodni
  type Stan = { datum_od: string | null; datum_do: string | null; accommodations: { naziv: string | null; adresa: string | null; grad: string | null } | null }
  const sviStanovi = ((stanovi || []) as unknown as Stan[])
  const adresaStana = (st: Stan | undefined) => {
    const a = st?.accommodations
    if (!a) return null
    return [a.adresa, a.grad].filter(Boolean).join(', ') || a.naziv || null
  }
  const sadasnji = sviStanovi.find(st => !st.datum_do || st.datum_do >= danas)
  const prethodni = sviStanovi.filter(st => st.datum_do && st.datum_do < danas)
    .sort((a, b) => (b.datum_do || '').localeCompare(a.datum_do || ''))[0]

  const a = (postavka?.vrijednost || {}) as Record<string, unknown>
  const agencija: IzvorObrasca['agencija'] = {
    naziv: s(a.naziv) || AGENCIJA, oib: s(a.oib), adresa: s(a.adresa), telefon: s(a.telefon),
    email: s(a.email), iban: s(a.iban), direktor: s(a.direktor), direktor_oib: s(a.direktor_oib),
  }

  const company = emp.company_id
    ? (await supabase.from('companies').select('*').eq('id', emp.company_id).single()).data
    : null

  const poslodavac: IzvorObrasca['poslodavac'] = emp.vrsta_zaposlenja === 'izravno' && company
    ? {
        tip: 'tvrtka', company_id: company.id, naziv: s(company.naziv) || s(emp.poslodavac), oib: s(company.oib),
        adresa: s(company.adresa), telefon: s(company.telefon), email: s(company.email), iban: s(company.iban), direktor: s(company.direktor),
      }
    : {
        tip: 'agencija', company_id: null, naziv: agencija.naziv, oib: agencija.oib, adresa: agencija.adresa,
        telefon: agencija.telefon, email: agencija.email, iban: agencija.iban, direktor: agencija.direktor,
      }

  const izvor: IzvorObrasca = {
    radnik: {
      ime: s(emp.ime), prezime: s(emp.prezime), ime_oca: s(emp.ime_oca),
      datum_rodjenja: s(emp.datum_rodjenja), mjesto_rodjenja: s(emp.mjesto_rodjenja),
      drzava_rodjenja: s(emp.drzava_rodjenja), drzavljanstvo: s(emp.drzavljanstvo) || s(emp.drzava_rodjenja),
      oib: s(emp.oib), radno_mjesto: s(emp.radno_mjesto), adresa_smjestaja: s(emp.adresa_smjestaja), telefon: s(emp.telefon),
      adresa_domovina: s(emp.adresa_domovina), strucna_sprema: s(emp.strucna_sprema),
      zaposlen_od: s(emp.ustupanje_od) || s(povijest?.[0]?.datum_do),
    },
    putovnica: putovnica ? {
      broj_dokumenta: s(putovnica.broj_dokumenta), mjesto_izdavanja: s(putovnica.mjesto_izdavanja),
      datum_izdavanja: s(putovnica.datum_izdavanja), datum_isteka: s(putovnica.datum_isteka),
    } : null,
    boravisna: boravisna ? { naziv: s(boravisna.naziv), broj_dokumenta: s(boravisna.broj_dokumenta), datum_isteka: s(boravisna.datum_isteka) } : null,
    lijecnicki: lijecnicki ? { datum_izdavanja: s(lijecnicki.datum_izdavanja), mjesto_izdavanja: s(lijecnicki.mjesto_izdavanja) } : null,
    u_smjestaju: !!sadasnji,
    smjestaj: sadasnji ? { adresa: adresaStana(sadasnji) || s(emp.adresa_smjestaja) } : null,
    prethodni_smjestaj: prethodni ? { adresa: adresaStana(prethodni) } : null,
    poslodavac,
    agencija,
    tvrtka: company || emp.poslodavac ? { naziv: s(company?.naziv) || s(emp.poslodavac), adresa: s(company?.adresa) } : null,
  }
  return NextResponse.json(izvor)
}
