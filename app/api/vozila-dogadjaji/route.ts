import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { dogadjajPayload, VRSTE_DOGADJAJA } from '@/lib/vozila'

// Novi zapis (servis, popravak, tehnički...). Ako je poslan novi_istek (npr. nova registracija vrijedi do),
// ujedno se ažurira odgovarajući datum na vozilu, a kilometraža vozila ako je nova veća.
export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const body = await request.json()
  if (!body.vehicle_id) return NextResponse.json({ error: 'Nedostaje vozilo.' }, { status: 400 })
  const payload = dogadjajPayload(body)
  const supabase = createAdminClient()

  const { data, error } = await supabase.from('vehicle_events').insert({ ...payload, vehicle_id: body.vehicle_id }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const promjene: Record<string, unknown> = {}
  const polje = VRSTE_DOGADJAJA.find(v => v.value === payload.vrsta)?.istek
  if (polje && typeof body.novi_istek === 'string' && body.novi_istek) promjene[polje] = body.novi_istek
  if (payload.kilometraza) {
    const { data: v } = await supabase.from('vehicles').select('kilometraza').eq('id', body.vehicle_id).single()
    if (!v?.kilometraza || payload.kilometraza > v.kilometraza) promjene.kilometraza = payload.kilometraza
  }
  let vozilo = null
  if (Object.keys(promjene).length) {
    const res = await supabase.from('vehicles').update(promjene).eq('id', body.vehicle_id).select('*').single()
    vozilo = res.data
  }
  return NextResponse.json({ dogadjaj: data, vozilo })
}
