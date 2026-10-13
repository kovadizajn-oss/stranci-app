import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { normalizeUrl } from '@/lib/url'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const body = await request.json()
  const url = normalizeUrl(body.url)
  if (!url) return NextResponse.json({ error: 'Link nije valjan (npr. https://primjer.hr).' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('partner_links')
    .update({ naziv: String(body.naziv || '').trim() || new URL(url).hostname, url })
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('partner_links').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
