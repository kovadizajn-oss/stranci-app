import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

// Izmjena (iseljenje, ugovor, datumi, napomena) ili brisanje zapisa o stanovanju.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const body = await request.json()
  const update: Record<string, unknown> = {}
  for (const k of ['datum_od', 'datum_do', 'ugovor_url', 'napomena']) if (k in body) update[k] = body[k] || null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('accommodation_residents').update(update).eq('id', id)
    .select('*, employees(id, ime, prezime, status_zaposlenika)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('accommodation_residents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
