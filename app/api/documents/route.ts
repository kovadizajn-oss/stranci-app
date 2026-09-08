import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('documents')
    .insert({
      employee_id: body.employee_id,
      naziv: body.naziv || null,
      kategorija: body.kategorija,
      datum_izdavanja: body.datum_izdavanja || null,
      datum_isteka: body.datum_isteka || null,
      file_url: body.file_url || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
