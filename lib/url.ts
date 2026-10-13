/** Pretvara upisani link u siguran http(s) URL ili vraća null ako nije valjan. */
export function normalizeUrl(raw: unknown): string | null {
  let s = String(raw ?? '').trim()
  if (!s) return null
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s
  try {
    const u = new URL(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null
    return u.toString()
  } catch {
    return null
  }
}
