import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

// Useljenje radnika u smještaj. Ako je radnik trenutno u drugom smještaju, tamo se automatski iseljava.
export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const body = await request.json()
  if (!body.accommodation_id || !body.employee_id) {
    return NextResponse.json({ error: 'Odaberi radnika.' }, { status: 400 })
  }
  const datumOd = body.datum_od || new Date().toISOString().slice(0, 10)
  const supabase = createAdminClient()

  // Zatvori postojeće otvorene smještaje tog radnika
  await supabase.from('accommodation_residents')
    .update({ datum_do: datumOd })
    .eq('employee_id', body.employee_id)
    .is('datum_do', null)

  const { data, error } = await supabase
    .from('accommodation_residents')
    .insert({
      accommodation_id: body.accommodation_id,
      employee_id: body.employee_id,
      datum_od: datumOd,
      ugovor_url: body.ugovor_url || null,
      napomena: body.napomena?.trim() || null,
    })
    .select('*, employees(id, ime, prezime, status_zaposlenika)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Adresa smještaja na profilu popunjava se samo ako je prazna — postojeća adresa se nikad ne prepisuje
  const { data: acc } = await supabase.from('accommodations').select('adresa, grad').eq('id', body.accommodation_id).single()
  const adresa = [acc?.adresa, acc?.grad].filter(Boolean).join(', ')
  if (adresa) {
    await supabase.from('employees').update({ adresa_smjestaja: adresa })
      .eq('id', body.employee_id).or('adresa_smjestaja.is.null,adresa_smjestaja.eq.')
  }

  return NextResponse.json(data)
}
