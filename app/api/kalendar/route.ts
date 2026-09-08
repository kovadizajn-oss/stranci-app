import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()

  const [
    { data: vacs },
    { data: sick },
    { data: docs },
    { data: obs },
  ] = await Promise.all([
    supabase.from('vacations').select('id, employee_id, datum_od, datum_do, employees(ime, prezime)'),
    supabase.from('sick_leaves').select('id, employee_id, datum_od, datum_do, employees(ime, prezime)'),
    supabase.from('documents').select('id, employee_id, naziv, datum_isteka, employees(ime, prezime)').not('datum_isteka', 'is', null),
    supabase.from('obaveze').select('id, naziv, employee_id, rok, employees(ime, prezime)').not('rok', 'is', null).eq('zavrseno', false),
  ])

  return NextResponse.json({
    vacations: vacs || [],
    sick_leaves: sick || [],
    documents: docs || [],
    obaveze: obs || [],
  })
}
