import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { partnerPayload } from '@/lib/partneri'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const [{ data: partner }, { data: contacts }, { data: links }] = await Promise.all([
    supabase.from('partner_agencies').select('*').eq('id', id).single(),
    supabase.from('partner_contacts').select('*').eq('partner_id', id).order('created_at'),
    supabase.from('partner_links').select('*').eq('partner_id', id).order('created_at'),
  ])
  if (!partner) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ partner, contacts: contacts || [], links: links || [] })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const payload = partnerPayload(await request.json())
  if (!payload.naziv) return NextResponse.json({ error: 'Naziv agencije je obavezan.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('partner_agencies').update(payload).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('partner_agencies').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
