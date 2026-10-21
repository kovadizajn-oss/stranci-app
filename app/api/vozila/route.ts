import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { voziloPayload } from '@/lib/vozila'

// Popis vozila s vozačima i datumima zadnjeg servisa / popravka
export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const [{ data: vozila, error }, { data: vozaci }, { data: dogadjaji }] = await Promise.all([
    supabase.from('vehicles').select('*').order('marka'),
    supabase.from('vehicle_drivers').select('id, vehicle_id, employee_id, ime, employees(id, ime, prezime)'),
    supabase.from('vehicle_events').select('vehicle_id, vrsta, datum').not('datum', 'is', null),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const zadnji = (id: string, vrsta: string) => (dogadjaji || [])
    .filter(d => d.vehicle_id === id && d.vrsta === vrsta)
    .reduce<string | null>((m, d) => (!m || d.datum > m ? d.datum : m), null)

  return NextResponse.json((vozila || []).map(v => ({
    ...v,
    vozaci: (vozaci || []).filter(d => d.vehicle_id === v.id),
    zadnji_servis: zadnji(v.id, 'servis'),
    zadnji_popravak: zadnji(v.id, 'popravak'),
  })))
}

export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const payload = voziloPayload(await request.json())
  if (!payload.marka) return NextResponse.json({ error: 'Marka vozila je obavezna.' }, { status: 400 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('vehicles').insert(payload).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
