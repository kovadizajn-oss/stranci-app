// Vrsta zaposlenja radnika — zajedničke oznake i pomoćne funkcije.

export const AGENCIJA = 'Kvantus Solutions d.o.o.'

export type VrstaZaposlenja = 'ustupanje' | 'izravno'

export const VRSTA_LABEL: Record<VrstaZaposlenja, string> = {
  ustupanje: 'Ustupanje (agencija)',
  izravno: 'Izravno zaposlenje',
}

export const VRSTA_BADGE: Record<VrstaZaposlenja, { label: string; color: string; bg: string }> = {
  ustupanje: { label: 'Ustupanje', color: '#7C3AED', bg: '#F3E8FF' },
  izravno: { label: 'Izravno', color: '#0F766E', bg: '#CCFBF1' },
}

/** Upozorenje kad ustupanje uskoro završava ili je završilo (null = sve u redu / nema datuma). */
export function ustupanjeUpozorenje(ustupanjeDo: string | null | undefined): { label: string; color: string; bg: string } | null {
  if (!ustupanjeDo) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = new Date(ustupanjeDo); end.setHours(0, 0, 0, 0)
  const days = Math.round((end.getTime() - today.getTime()) / 86400000)
  if (days < 0) return { label: 'Ustupanje završilo', color: '#DC2626', bg: '#FEE2E2' }
  if (days <= 30) return { label: `Ustupanje završava za ${days} d`, color: '#CA8A04', bg: '#FEF9C3' }
  return null
}
