import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function requireSession(): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')
  if (session?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
