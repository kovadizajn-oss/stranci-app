import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

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
  ] = await Promise.all([
    supabase.from('employees').select('id, ime, prezime, photo_url, drzava_rodjenja, poslodavac, status_zaposlenika').order('prezime'),
    supabase.from('documents').select('employee_id, naziv, datum_isteka').order('datum_isteka', { ascending: true }),
    supabase.from('vacations').select('employee_id').lte('datum_od', today).gte('datum_do', today),
    supabase.from('sick_leaves').select('employee_id').lte('datum_od', today).gte('datum_do', today),
    supabase.from('sick_leaves').select('employee_id').gte('datum_do', sixMonthsAgoStr),
  ])

  const vacationIds = new Set((vacations || []).map((v: any) => v.employee_id))
  const sickIds = new Set((sickLeaves || []).map((s: any) => s.employee_id))
  const recentSickIds = new Set((recentSick || []).map((s: any) => s.employee_id))

  // Group docs by employee, pick earliest expiry
  const docByEmp: Record<string, { naziv: string | null; datum_isteka: string | null }> = {}
  for (const d of (docs || [])) {
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
      status_zaposlenika: emp.status_zaposlenika || null,
      doc_tip: doc?.naziv || null,
      doc_isteka: doc?.datum_isteka || null,
      on_vacation: vacationIds.has(emp.id),
      on_sick_leave: sickIds.has(emp.id),
      no_sick_6mo: !recentSickIds.has(emp.id),
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
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
