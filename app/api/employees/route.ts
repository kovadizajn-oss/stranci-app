import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { zamijenjeniIds } from '@/lib/dokumenti'

export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]

  const [
    { data: emps },
    { data: docs },
    { data: vacations },
    { data: sickLeaves },
    { data: recentSick },
    { data: planovi },
  ] = await Promise.all([
    supabase.from('employees').select('*').order('prezime'),
    supabase.from('documents').select('id, employee_id, naziv, datum_isteka, datum_izdavanja').order('datum_isteka', { ascending: true }),
    supabase.from('vacations').select('employee_id').lte('datum_od', today).gte('datum_do', today),
    supabase.from('sick_leaves').select('employee_id').lte('datum_od', today).gte('datum_do', today),
    supabase.from('sick_leaves').select('employee_id').gte('datum_do', sixMonthsAgoStr),
    // planirani prelasci (ako tablica još ne postoji, lista radi i bez njih)
    supabase.from('employee_assignments').select('employee_id, poslodavac, datum_od, status_prijave')
      .eq('faza', 'planirano').order('datum_od', { ascending: true, nullsFirst: false }),
  ])
  const planByEmp: Record<string, { poslodavac: string | null; datum_od: string | null; status_prijave: string | null }> = {}
  for (const p of (planovi || []) as any[]) if (!planByEmp[p.employee_id]) planByEmp[p.employee_id] = p

  const vacationIds = new Set((vacations || []).map((v: any) => v.employee_id))
  const sickIds = new Set((sickLeaves || []).map((s: any) => s.employee_id))
  const recentSickIds = new Set((recentSick || []).map((s: any) => s.employee_id))

  // Group docs by employee, pick earliest expiry
  const docByEmp: Record<string, { naziv: string | null; datum_isteka: string | null }> = {}
  const zamijenjeni = zamijenjeniIds(docs || [])
  for (const d of (docs || [])) {
    if (zamijenjeni.has(d.id)) continue // postoji noviji dokument iste vrste
    if (!docByEmp[d.employee_id] && d.datum_isteka) {
      docByEmp[d.employee_id] = { naziv: d.naziv, datum_isteka: d.datum_isteka }
    }
  }

  const rows = (emps || []).map((emp: any) => {
    const doc = docByEmp[emp.id]
    return {
      id: emp.id,
      ime: emp.ime,
      prezime: emp.prezime,
      photo_url: emp.photo_url,
      drzava_rodjenja: emp.drzava_rodjenja,
      poslodavac: emp.poslodavac,
      company_id: emp.company_id || null,
      status_zaposlenika: emp.status_zaposlenika || null,
      oib: emp.oib || null,
      vrsta_zaposlenja: emp.vrsta_zaposlenja || null,
      ustupanje_do: emp.ustupanje_do || null,
      doc_tip: doc?.naziv || null,
      doc_isteka: doc?.datum_isteka || null,
      on_vacation: vacationIds.has(emp.id),
      on_sick_leave: sickIds.has(emp.id),
      no_sick_6mo: !recentSickIds.has(emp.id),
      prelazak: planByEmp[emp.id] || null,
    }
  })

  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('employees')
    .insert({
      ime: body.ime,
      prezime: body.prezime,
      drzava_rodjenja: body.drzava_rodjenja || null,
      datum_rodjenja: body.datum_rodjenja || null,
      oib: body.oib || null,
      status_zaposlenika: body.status_zaposlenika || 'Aktivan',
      email: body.email || null,
      telefon: body.telefon || null,
      adresa_smjestaja: body.adresa_smjestaja || null,
      ime_oca: body.ime_oca || null,
      iban: body.iban || null,
      company_id: body.company_id || null,
      poslodavac: body.poslodavac || null,
      radno_mjesto: body.radno_mjesto || null,
      ...('vrsta_zaposlenja' in body ? {
        vrsta_zaposlenja: body.vrsta_zaposlenja || null,
        ustupanje_od: body.ustupanje_od || null,
        ustupanje_do: body.ustupanje_do || null,
      } : {}),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Grupna promjena statusa zaposlenika (traka za odabrane radnike na /zaposlenici).
// Ulaz:  { ids: string[], status_zaposlenika: "Aktivan" | "U postupku" | "Na čekanju" | "Otkazan" | "Novi uvoz" }
// Izlaz: { ok: true, updated: broj } — mijenja SAMO status, ostali podaci radnika ostaju kakvi jesu.
const STATUSI_ZAPOSLENIKA = ['Aktivan', 'U postupku', 'Na čekanju', 'Otkazan', 'Novi uvoz']

export async function PATCH(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const body = await request.json().catch(() => null) as { ids?: unknown; status_zaposlenika?: unknown } | null
  const ids = Array.isArray(body?.ids)
    ? [...new Set(body.ids.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 64))]
    : []
  const status = body?.status_zaposlenika

  if (ids.length === 0) return NextResponse.json({ error: 'Nije odabran nijedan radnik.' }, { status: 400 })
  if (typeof status !== 'string' || !STATUSI_ZAPOSLENIKA.includes(status)) {
    return NextResponse.json({ error: 'Neispravan status.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  let updated = 0
  // Po 100 odjednom, da popis ID-eva ne bude predugačak za jedan upit
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase
      .from('employees')
      .update({ status_zaposlenika: status })
      .in('id', ids.slice(i, i + 100))
      .select('id')
    if (error) return NextResponse.json({ error: error.message, updated }, { status: 500 })
    updated += data?.length ?? 0
  }

  return NextResponse.json({ ok: true, updated })
}
