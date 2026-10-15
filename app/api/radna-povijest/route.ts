import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { angazmanPayload } from '@/lib/radna-povijest'

// Novi zapis: prijašnje zaposlenje ili planirani prelazak
export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const body = await request.json()
  if (!body.employee_id) return NextResponse.json({ error: 'Nedostaje radnik.' }, { status: 400 })
  const payload = angazmanPayload(body)
  if (!payload.poslodavac) return NextResponse.json({ error: 'Upiši ili odaberi tvrtku.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('employee_assignments')
    .insert({ ...payload, employee_id: body.employee_id }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
