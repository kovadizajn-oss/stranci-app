import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: emp }, { data: docs }, { data: vacs }, { data: sick }] = await Promise.all([
    supabase.from('employees').select('*').eq('id', id).single(),
    supabase.from('documents').select('*').eq('employee_id', id),
    supabase.from('vacations').select('*').eq('employee_id', id).order('datum_od', { ascending: false }),
    supabase.from('sick_leaves').select('*').eq('employee_id', id).order('datum_od', { ascending: false }),
  ])

  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ employee: emp, documents: docs || [], vacations: vacs || [], sick_leaves: sick || [] })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const { error } = await supabase.from('employees').update({
    ime: body.ime,
    prezime: body.prezime,
    drzava_rodjenja: body.drzava_rodjenja || null,
    datum_rodjenja: body.datum_rodjenja || null,
    oib: body.oib || null,
    status_zaposlenika: body.status_zaposlenika,
    email: body.email || null,
    telefon: body.telefon || null,
    adresa_smjestaja: body.adresa_smjestaja || null,
    ime_oca: body.ime_oca || null,
    iban: body.iban || null,
    company_id: body.company_id || null,
    poslodavac: body.poslodavac || null,
    radno_mjesto: body.radno_mjesto || null,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
