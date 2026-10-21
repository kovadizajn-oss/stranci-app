import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { voziloPayload } from '@/lib/vozila'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const [{ data: vozilo }, { data: vozaci }, { data: dogadjaji }, { data: employees }] = await Promise.all([
    supabase.from('vehicles').select('*').eq('id', id).single(),
    supabase.from('vehicle_drivers').select('id, vehicle_id, employee_id, ime, employees(id, ime, prezime)').eq('vehicle_id', id).order('created_at'),
    supabase.from('vehicle_events').select('*').eq('vehicle_id', id)
      .order('datum', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
    supabase.from('employees').select('id, ime, prezime').order('prezime'),
  ])
  if (!vozilo) return NextResponse.json({ error: 'Vozilo nije pronađeno.' }, { status: 404 })
  return NextResponse.json({ vozilo, vozaci: vozaci || [], dogadjaji: dogadjaji || [], employees: employees || [] })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const payload = voziloPayload(await request.json())
  if (!payload.marka) return NextResponse.json({ error: 'Marka vozila je obavezna.' }, { status: 400 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('vehicles').update(payload).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('vehicles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
