import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { dokumentPayload } from '@/lib/smjestaj'

// GET /api/smjestaj-dokumenti?accommodation_id=... — dokumenti jednog smještaja
export async function GET(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const id = new URL(request.url).searchParams.get('accommodation_id')
  if (!id) return NextResponse.json({ error: 'Nedostaje smještaj.' }, { status: 400 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('accommodation_documents').select('*')
    .eq('accommodation_id', id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST — datoteka je već učitana preko /api/upload, ovdje se sprema zapis
export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const body = await request.json()
  if (!body.accommodation_id) return NextResponse.json({ error: 'Nedostaje smještaj.' }, { status: 400 })
  if (!body.url) return NextResponse.json({ error: 'Nedostaje datoteka.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('accommodation_documents').insert({
    ...dokumentPayload(body),
    accommodation_id: body.accommodation_id,
    url: String(body.url),
    putanja: typeof body.putanja === 'string' ? body.putanja : null,
    file_name: typeof body.file_name === 'string' ? body.file_name : null,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
