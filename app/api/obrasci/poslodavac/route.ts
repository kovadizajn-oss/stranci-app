import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

// Pamti podatke poslodavca za obrasce: agencija (postavke) ili tvrtka (companies).
// Mijenjaju se samo poslana polja.
const POLJA = ['oib', 'adresa', 'telefon', 'email', 'iban', 'direktor'] as const

export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const body = await request.json()
  const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const podaci: Record<string, string | null> = {}
  for (const k of POLJA) if (k in body) podaci[k] = s(body[k])
  const supabase = createAdminClient()

  if (body.tip === 'tvrtka') {
    if (!body.company_id) return NextResponse.json({ error: 'Nedostaje tvrtka.' }, { status: 400 })
    if (Object.keys(podaci).length === 0) return NextResponse.json({ ok: true })
    const { error } = await supabase.from('companies').update(podaci).eq('id', body.company_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    if ('naziv' in body) podaci.naziv = s(body.naziv)
    const { data: postojece } = await supabase.from('postavke').select('vrijednost').eq('kljuc', 'agencija').maybeSingle()
    const vrijednost = { ...((postojece?.vrijednost as Record<string, unknown>) || {}), ...podaci }
    const { error } = await supabase.from('postavke')
      .upsert({ kljuc: 'agencija', vrijednost, updated_at: new Date().toISOString() })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
