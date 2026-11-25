import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

// Izdaje jednokratno dopuštenje za upload izravno iz preglednika u Supabase spremište "dokumenti".
// Tako datoteka ne prolazi kroz Vercel funkciju (koja prima najviše 4,5 MB).
// Ulaz:  { path: "<id zaposlenika>/doc_..." } ili { path: "bulk-uvoz/privremeno/..." }
// Izlaz: { path, token } — preglednik zatim zove supabase.storage.uploadToSignedUrl(path, token, file)

const DOZVOLJENE_PUTANJE = [
  /^bulk-uvoz\/privremeno\/[A-Za-z0-9._-]{1,200}$/, // privremeno, za AI analizu velikih datoteka
  /^[A-Za-z0-9-]{1,64}\/[A-Za-z0-9._-]{1,200}$/,    // <id zaposlenika>/<datoteka>
]

export async function POST(request: Request) {
  const neprijavljen = await requireSession()
  if (neprijavljen) return neprijavljen

  const tijelo = await request.json().catch(() => null) as { path?: unknown } | null
  const path = tijelo?.path
  if (typeof path !== 'string' || path.includes('..') || !DOZVOLJENE_PUTANJE.some(r => r.test(path))) {
    return Response.json({ error: 'Neispravna putanja datoteke.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from('dokumenti').createSignedUploadUrl(path)
  if (error || !data) {
    console.error('[upload-url]', error)
    return Response.json({ error: 'Spremište trenutno ne prima datoteke. Pokušaj ponovno.' }, { status: 500 })
  }
  return Response.json({ path: data.path, token: data.token })
}
