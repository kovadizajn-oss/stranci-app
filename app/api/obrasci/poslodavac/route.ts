import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

// Pamti podatke poslodavca za obrasce: agencija (postavke) ili tvrtka (companies).
export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const body = await request.json()
  const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const podaci = { oib: s(body.oib), adresa: s(body.adresa), telefon: s(body.telefon) }
  const supabase = createAdminClient()

  if (body.tip === 'tvrtka') {
    if (!body.company_id) return NextResponse.json({ error: 'Nedostaje tvrtka.' }, { status: 400 })
    const { error } = await supabase.from('companies').update(podaci).eq('id', body.company_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('postavke')
      .upsert({ kljuc: 'agencija', vrijednost: { naziv: s(body.naziv), ...podaci }, updated_at: new Date().toISOString() })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
