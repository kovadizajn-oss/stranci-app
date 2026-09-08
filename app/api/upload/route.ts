import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSession } from '@/lib/session'

export async function POST(request: Request) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const path = formData.get('path') as string | null

  if (!file || !path) {
    return NextResponse.json({ error: 'Missing file or path' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const { data, error } = await supabase.storage
    .from('dokumenti')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from('dokumenti').getPublicUrl(data.path)
  return NextResponse.json({ url: urlData.publicUrl })
}
