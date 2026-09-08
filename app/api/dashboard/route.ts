import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in60 = new Date(today)
  in60.setDate(in60.getDate() + 60)
  const in60Str = in60.toISOString().split('T')[0]

  const [
    { data: docs },
    { data: expiredDocs },
    { data: workers },
    { data: upcomingOb },
  ] = await Promise.all([
    supabase
      .from('documents')
      .select('id, employee_id, naziv, datum_isteka, employees(ime, prezime)')
      .gte('datum_isteka', todayStr)
      .lte('datum_isteka', in60Str)
      .order('datum_isteka'),
    supabase
      .from('documents')
      .select('id, employee_id, naziv, datum_isteka, employees(ime, prezime)')
      .lt('datum_isteka', todayStr)
      .order('datum_isteka'),
    supabase.from('employees').select('id, status_zaposlenika'),
    supabase
      .from('obaveze')
      .select('id, naziv, rok, employee_id, employees(ime, prezime)')
      .gte('rok', todayStr)
      .order('rok')
      .limit(5),
  ])

  return NextResponse.json({
    docs: docs || [],
    expiredDocs: expiredDocs || [],
    workers: workers || [],
    upcomingOb: upcomingOb || [],
  })
}
