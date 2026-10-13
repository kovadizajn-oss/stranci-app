import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const body = await request.json()
  if (!String(body.ime || '').trim()) {
    return NextResponse.json({ error: 'Ime kontakt osobe je obavezno.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('company_contacts')
    .update({
      ime: String(body.ime).trim(),
      uloga: body.uloga?.trim() || null,
      telefon: body.telefon?.trim() || null,
      email: body.email?.trim() || null,
      napomena: body.napomena?.trim() || null,
    })
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
  const { error } = await supabase.from('company_contacts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
