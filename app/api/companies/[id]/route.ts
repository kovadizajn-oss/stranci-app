import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: co }, { data: emps }] = await Promise.all([
    supabase.from('companies').select('*').eq('id', id).single(),
    supabase.from('employees')
      .select('id, ime, prezime, status_zaposlenika, documents(datum_isteka)')
      .eq('company_id', id)
      .order('prezime'),
  ])

  if (!co) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ company: co, workers: emps || [] })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const { error } = await supabase.from('companies').update({
    naziv: body.naziv,
    kontakt_ime: body.kontakt_ime || null,
    kontakt_telefon: body.kontakt_telefon || null,
    kontakt_email: body.kontakt_email || null,
  }).eq('id', id)

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
