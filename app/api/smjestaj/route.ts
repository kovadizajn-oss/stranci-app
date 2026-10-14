import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { smjestajPayload, jeTrenutni } from '@/lib/smjestaj'

export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const [{ data, error }, { data: res }] = await Promise.all([
    supabase.from('accommodations').select('*').order('naziv'),
    supabase.from('accommodation_residents').select('accommodation_id, datum_do'),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const count: Record<string, number> = {}
  for (const r of res || []) if (jeTrenutni(r.datum_do)) count[r.accommodation_id] = (count[r.accommodation_id] || 0) + 1
  return NextResponse.json((data || []).map(a => ({ ...a, broj_stanara: count[a.id] || 0 })))
}

export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const payload = smjestajPayload(await request.json())
  if (!payload.naziv) return NextResponse.json({ error: 'Naziv smještaja je obavezan.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('accommodations').insert(payload).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
