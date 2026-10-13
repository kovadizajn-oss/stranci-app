import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

// Kontakt osobe partnerske agencije: POST kreira novu kontakt osobu.
export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const body = await request.json()
  if (!body.partner_id || !String(body.ime || '').trim()) {
    return NextResponse.json({ error: 'Ime kontakt osobe je obavezno.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('partner_contacts')
    .insert({
      partner_id: body.partner_id,
      ime: String(body.ime).trim(),
      uloga: body.uloga?.trim() || null,
      telefon: body.telefon?.trim() || null,
      email: body.email?.trim() || null,
      napomena: body.napomena?.trim() || null,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
