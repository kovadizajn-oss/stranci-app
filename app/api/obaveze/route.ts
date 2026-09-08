import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()

  const [{ data: obs }, { data: emps }] = await Promise.all([
    supabase
      .from('obaveze')
      .select('id, naziv, employee_id, rok, zavrseno, created_at, employees(ime, prezime)')
      .order('zavrseno', { ascending: true })
      .order('rok', { ascending: true, nullsFirst: false }),
    supabase.from('employees').select('id, ime, prezime').order('prezime'),
  ])

  return NextResponse.json({ obaveze: obs || [], employees: emps || [] })
}

export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('obaveze')
    .insert({
      naziv: body.naziv,
      employee_id: body.employee_id || null,
      rok: body.rok || null,
      zavrseno: false,
    })
    .select('id, naziv, employee_id, rok, zavrseno, created_at, employees(ime, prezime)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
