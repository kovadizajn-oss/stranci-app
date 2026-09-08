import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('sick_leaves')
    .insert({
      employee_id: body.employee_id,
      datum_od: body.datum_od,
      datum_do: body.datum_do,
      napomena: body.napomena || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
