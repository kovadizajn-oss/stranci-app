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
  return NextResponse.json(data || [])
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
