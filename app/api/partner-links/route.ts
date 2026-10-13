import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { normalizeUrl } from '@/lib/url'

// Linkovi partnerske agencije: POST dodaje novi link.
export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const body = await request.json()
  const url = normalizeUrl(body.url)
  if (!body.partner_id) return NextResponse.json({ error: 'Nedostaje agencija.' }, { status: 400 })
  if (!url) return NextResponse.json({ error: 'Link nije valjan (npr. https://primjer.hr).' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('partner_links')
    .insert({ partner_id: body.partner_id, naziv: String(body.naziv || '').trim() || new URL(url).hostname, url })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
