import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

// Novi vozač vozila: radnik iz baze (employee_id) ili samo ime
export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const body = await request.json()
  const ime = typeof body.ime === 'string' && body.ime.trim() ? body.ime.trim() : null
  if (!body.vehicle_id) return NextResponse.json({ error: 'Nedostaje vozilo.' }, { status: 400 })
  if (!body.employee_id && !ime) return NextResponse.json({ error: 'Odaberi radnika ili upiši ime.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('vehicle_drivers')
    .insert({ vehicle_id: body.vehicle_id, employee_id: body.employee_id || null, ime: body.employee_id ? null : ime })
    .select('id, vehicle_id, employee_id, ime, employees(id, ime, prezime)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
