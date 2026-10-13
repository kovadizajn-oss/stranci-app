import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { normalizeUrl } from '@/lib/url'

// Linkovi tvrtke: POST dodaje novi link.
export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const body = await request.json()
  const url = normalizeUrl(body.url)
  if (!body.company_id) return NextResponse.json({ error: 'Nedostaje tvrtka.' }, { status: 400 })
  if (!url) return NextResponse.json({ error: 'Link nije valjan (npr. https://primjer.hr).' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('company_links')
    .insert({ company_id: body.company_id, naziv: String(body.naziv || '').trim() || new URL(url).hostname, url })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
