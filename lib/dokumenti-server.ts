import type { createAdminClient } from '@/lib/supabase-server'
import { zamijenjeniIds } from '@/lib/dokumenti'

/** Svi "stari" dokumenti (postoji noviji iste vrste) — za filtriranje isteka na serveru. */
export async function dohvatiZamijenjene(supabase: ReturnType<typeof createAdminClient>): Promise<Set<string>> {
  const { data } = await supabase.from('documents').select('id, employee_id, naziv, datum_isteka, datum_izdavanja')
  return zamijenjeniIds(data || [])
}
