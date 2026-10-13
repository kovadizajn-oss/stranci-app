import { normalizeUrl } from '@/lib/url'

/** Polja partnerske agencije koja se mogu urediti. */
export const PARTNER_POLJA = ['naziv', 'drzava', 'grad', 'adresa', 'oib', 'web', 'email', 'telefon', 'usluge', 'napomena'] as const

export function partnerPayload(body: Record<string, unknown>) {
  const out: Record<string, string | null> = {}
  for (const k of PARTNER_POLJA) {
    const v = String(body[k] ?? '').trim()
    out[k] = v || null
  }
  if (out.web) out.web = normalizeUrl(out.web) // neispravan web -> null
  return out
}
