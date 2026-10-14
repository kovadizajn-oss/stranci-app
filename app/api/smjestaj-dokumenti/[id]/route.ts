import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'
import { dokumentPayload } from '@/lib/smjestaj'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('accommodation_documents')
    .update(dokumentPayload(await request.json())).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Brisanje: briše zapis i samu datoteku iz spremišta
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const { id } = await params
  const supabase = createAdminClient()
  const { data: doc } = await supabase.from('accommodation_documents').select('putanja').eq('id', id).single()
  const { error } = await supabase.from('accommodation_documents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (doc?.putanja) await supabase.storage.from('dokumenti').remove([doc.putanja])
  return NextResponse.json({ ok: true })
}
