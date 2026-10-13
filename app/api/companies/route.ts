import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('companies')
    .select('id, naziv, kontakt_ime, kontakt_telefon, kontakt_email, employees(count)')
    .order('naziv')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Kontakt osobe (ako tablica još ne postoji, lista radi i bez njih)
  const { data: contacts } = await supabase
    .from('company_contacts').select('company_id, ime, uloga, telefon, email').order('created_at')
  const byCompany: Record<string, unknown[]> = {}
  for (const c of contacts || []) (byCompany[c.company_id] ||= []).push(c)

  return NextResponse.json((data || []).map(co => ({ ...co, contacts: byCompany[co.id] || [] })))
}

export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('companies')
    .insert({
      naziv: body.naziv,
      kontakt_ime: body.kontakt_ime || null,
      kontakt_telefon: body.kontakt_telefon || null,
      kontakt_email: body.kontakt_email || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
