import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { partnerPayload } from '@/lib/partneri'

export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const [{ data, error }, { data: contacts }] = await Promise.all([
    supabase.from('partner_agencies').select('*').order('naziv'),
    supabase.from('partner_contacts').select('partner_id, ime, uloga, telefon, email').order('created_at'),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byPartner: Record<string, unknown[]> = {}
  for (const c of contacts || []) (byPartner[c.partner_id] ||= []).push(c)
  return NextResponse.json((data || []).map(p => ({ ...p, contacts: byPartner[p.id] || [] })))
}

export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const payload = partnerPayload(await request.json())
  if (!payload.naziv) return NextResponse.json({ error: 'Naziv agencije je obavezan.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('partner_agencies').insert(payload).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
