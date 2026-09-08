import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const update: Record<string, any> = {}
  if (body.naziv !== undefined) update.naziv = body.naziv
  if (body.employee_id !== undefined) update.employee_id = body.employee_id || null
  if (body.rok !== undefined) update.rok = body.rok || null
  if (body.zavrseno !== undefined) update.zavrseno = body.zavrseno

  const { error } = await supabase.from('obaveze').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase.from('obaveze').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
