import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { smjestajPayload } from '@/lib/smjestaj'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const [{ data: acc }, { data: residents }, { data: employees }, { data: rooms }] = await Promise.all([
    supabase.from('accommodations').select('*').eq('id', id).single(),
    supabase.from('accommodation_residents')
      .select('*, employees(id, ime, prezime, status_zaposlenika)')
      .eq('accommodation_id', id)
      .order('datum_od', { ascending: false }),
    supabase.from('employees').select('id, ime, prezime').order('prezime'),
    supabase.from('accommodation_rooms').select('*').eq('accommodation_id', id).order('created_at'),
  ])
  if (!acc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ accommodation: acc, residents: residents || [], employees: employees || [], rooms: rooms || [] })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const payload = smjestajPayload(await request.json())
  if (!payload.naziv) return NextResponse.json({ error: 'Naziv smještaja je obavezan.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('accommodations').update(payload).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('accommodations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
