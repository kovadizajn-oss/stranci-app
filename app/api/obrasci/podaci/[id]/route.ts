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

  const [{ data: emp }, { data: docs }, { data: stanovi }, { data: agencija }] = await Promise.all([
    supabase.from('employees').select('*').eq('id', id).single(),
    supabase.from('documents').select('*').eq('employee_id', id),
    supabase.from('accommodation_residents').select('id, datum_do').eq('employee_id', id),
    supabase.from('postavke').select('vrijednost').eq('kljuc', 'agencija').maybeSingle(),
  ])
  if (!emp) return NextResponse.json({ error: 'Radnik nije pronađen.' }, { status: 404 })

  // Najnoviji aktualni dokument određene vrste
  const zamijenjeni = zamijenjeniIds(docs || [])
  const najnoviji = (naziv: string) => (docs || [])
    .filter(d => d.naziv === naziv && !zamijenjeni.has(d.id))
    .sort((a, b) => (b.datum_isteka || b.datum_izdavanja || '').localeCompare(a.datum_isteka || a.datum_izdavanja || ''))[0] || null
  const putovnica = najnoviji('Putovnica')
  const lijecnicki = (docs || []).filter(d => d.naziv === 'Liječnički pregled')
    .sort((a, b) => (b.datum_izdavanja || '').localeCompare(a.datum_izdavanja || ''))[0] || null

  let poslodavac: IzvorObrasca['poslodavac']
  if (emp.vrsta_zaposlenja === 'izravno' && emp.company_id) {
    const { data: co } = await supabase.from('companies').select('*').eq('id', emp.company_id).single()
    poslodavac = {
      tip: 'tvrtka', company_id: emp.company_id,
      naziv: co?.naziv || emp.poslodavac || null, oib: co?.oib || null, adresa: co?.adresa || null, telefon: co?.telefon || null,
    }
  } else {
    const a = (agencija?.vrijednost || {}) as Record<string, string | null>
    poslodavac = { tip: 'agencija', company_id: null, naziv: a.naziv || AGENCIJA, oib: a.oib || null, adresa: a.adresa || null, telefon: a.telefon || null }
  }

  const izvor: IzvorObrasca = {
    radnik: {
      ime: emp.ime, prezime: emp.prezime, datum_rodjenja: emp.datum_rodjenja, mjesto_rodjenja: emp.mjesto_rodjenja || null,
      drzava_rodjenja: emp.drzava_rodjenja, oib: emp.oib, radno_mjesto: emp.radno_mjesto,
      adresa_smjestaja: emp.adresa_smjestaja, telefon: emp.telefon,
    },
    putovnica: putovnica ? { broj_dokumenta: putovnica.broj_dokumenta || null, mjesto_izdavanja: putovnica.mjesto_izdavanja || null } : null,
    lijecnicki: lijecnicki ? { datum_izdavanja: lijecnicki.datum_izdavanja || null, mjesto_izdavanja: lijecnicki.mjesto_izdavanja || null } : null,
    u_smjestaju: (stanovi || []).some(s => !s.datum_do || s.datum_do >= danas),
    poslodavac,
  }
  return NextResponse.json(izvor)
}
