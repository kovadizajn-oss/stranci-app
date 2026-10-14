import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { sobaPayload } from '@/lib/smjestaj'

export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const body = await request.json()
  const payload = sobaPayload(body)
  if (!body.accommodation_id) return NextResponse.json({ error: 'Nedostaje smještaj.' }, { status: 400 })
  if (!payload.naziv) return NextResponse.json({ error: 'Naziv sobe je obavezan.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('accommodation_rooms')
    .insert({ ...payload, accommodation_id: body.accommodation_id }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
