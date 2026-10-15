import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

// "Prelazak obavljen": trenutni posao ide u prijašnje, planirani postaje trenutni.
// Body: { datum: 'YYYY-MM-DD' } — dan prelaska (zadnji dan starog = taj dan).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const supabase = createAdminClient()

  const { data: plan } = await supabase.from('employee_assignments').select('*').eq('id', id).single()
  if (!plan || plan.faza !== 'planirano') return NextResponse.json({ error: 'Planirani prelazak nije pronađen.' }, { status: 404 })
  const datum: string = (typeof body.datum === 'string' && body.datum) || plan.datum_od || new Date().toISOString().slice(0, 10)

  const { data: emp } = await supabase.from('employees').select('*').eq('id', plan.employee_id).single()
  if (!emp) return NextResponse.json({ error: 'Radnik nije pronađen.' }, { status: 404 })

  // 1) Trenutni posao -> prijašnje (ako ga ima). Početak = ustupanje_od ili kraj zadnjeg prijašnjeg.
  if (emp.poslodavac || emp.company_id) {
    let pocetak: string | null = emp.ustupanje_od || null
    if (!pocetak) {
      const { data: zadnji } = await supabase.from('employee_assignments').select('datum_do')
        .eq('employee_id', emp.id).eq('faza', 'prijasnje').not('datum_do', 'is', null)
        .order('datum_do', { ascending: false }).limit(1)
      pocetak = zadnji?.[0]?.datum_do || null
    }
    const { error: e1 } = await supabase.from('employee_assignments').insert({
      employee_id: emp.id, faza: 'prijasnje',
      company_id: emp.company_id || null, poslodavac: emp.poslodavac || null,
      vrsta_zaposlenja: emp.vrsta_zaposlenja || null, radno_mjesto: emp.radno_mjesto || null,
      datum_od: pocetak, datum_do: datum,
    })
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
  }

  // 2) Planirano -> trenutno (na radniku)
  const vrsta = plan.vrsta_zaposlenja || emp.vrsta_zaposlenja || null
  const { error: e2 } = await supabase.from('employees').update({
    company_id: plan.company_id || null,
    poslodavac: plan.poslodavac || null,
    radno_mjesto: plan.radno_mjesto || emp.radno_mjesto || null,
    vrsta_zaposlenja: vrsta,
    // kod izravnog zaposlenja početak se čita iz kraja zadnjeg prijašnjeg zapisa
    ustupanje_od: vrsta === 'ustupanje' ? datum : null,
    ustupanje_do: null,
  }).eq('id', emp.id)
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  // 3) Plan je ostvaren
  await supabase.from('employee_assignments').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
