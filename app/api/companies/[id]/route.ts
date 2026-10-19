import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { zamijenjeniIds } from '@/lib/dokumenti'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: co }, { data: emps }, { data: contacts }, { data: links }, { data: obaveze }] = await Promise.all([
    supabase.from('companies').select('*').eq('id', id).single(),
    supabase.from('employees')
      .select('*, documents(id, employee_id, naziv, datum_isteka, datum_izdavanja)')
      .eq('company_id', id)
      .order('prezime'),
    supabase.from('company_contacts').select('*').eq('company_id', id).order('created_at'),
    supabase.from('company_links').select('*').eq('company_id', id).order('created_at'),
    supabase.from('obaveze').select('id, naziv, rok, zavrseno').eq('company_id', id).eq('zavrseno', false)
      .order('rok', { ascending: true, nullsFirst: false }),
  ])

  if (!co) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // stari dokumenti (postoji noviji iste vrste) se ne broje u istek
  const zamijenjeni = zamijenjeniIds((emps || []).flatMap((e: any) => e.documents || []))
  const workers = (emps || []).map((e: any) => ({ ...e, documents: (e.documents || []).filter((d: any) => !zamijenjeni.has(d.id)) }))
  return NextResponse.json({ company: co, workers, contacts: contacts || [], links: links || [], obaveze: obaveze || [] })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  // Kontakt osobe su u tablici company_contacts; stara kontakt_* polja mijenjaju se samo ako su poslana
  const update: Record<string, unknown> = { naziv: body.naziv }
  for (const k of ['kontakt_ime', 'kontakt_telefon', 'kontakt_email']) if (k in body) update[k] = body[k] || null
  const { error } = await supabase.from('companies').update(update).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
