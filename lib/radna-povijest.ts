// Kretanje radnika — prijašnja i planirana zaposlenja (trenutno je u tablici employees).

export type Faza = 'prijasnje' | 'planirano'
export type StatusPrijave = 'priprema' | 'predano' | 'odobreno' | 'odbijeno'

export type Angazman = {
  id: string
  employee_id: string
  faza: Faza
  company_id: string | null
  poslodavac: string | null
  vrsta_zaposlenja: 'ustupanje' | 'izravno' | null
  radno_mjesto: string | null
  datum_od: string | null
  datum_do: string | null
  status_prijave: StatusPrijave | null
  datum_prijave: string | null
  napomena: string | null
  created_at: string
}

export const STATUS_PRIJAVE: { value: StatusPrijave; label: string; color: string; bg: string }[] = [
  { value: 'priprema', label: 'U pripremi', color: '#64748B', bg: '#F1F5F9' },
  { value: 'predano', label: 'Zahtjev predan', color: '#2563EB', bg: '#EFF6FF' },
  { value: 'odobreno', label: 'Odobreno', color: '#16A34A', bg: '#DCFCE7' },
  { value: 'odbijeno', label: 'Odbijeno', color: '#DC2626', bg: '#FEE2E2' },
]

export function statusPrijave(v: string | null | undefined) {
  return STATUS_PRIJAVE.find(s => s.value === v) || STATUS_PRIJAVE[0]
}

export function angazmanPayload(body: Record<string, unknown>) {
  const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const vrsta = s(body.vrsta_zaposlenja)
  const status = s(body.status_prijave)
  const faza = body.faza === 'planirano' ? 'planirano' : 'prijasnje'
  return {
    faza,
    company_id: s(body.company_id),
    poslodavac: s(body.poslodavac),
    vrsta_zaposlenja: vrsta === 'ustupanje' || vrsta === 'izravno' ? vrsta : null,
    radno_mjesto: s(body.radno_mjesto),
    datum_od: s(body.datum_od),
    datum_do: faza === 'prijasnje' ? s(body.datum_do) : null,
    status_prijave: faza === 'planirano'
      ? (STATUS_PRIJAVE.some(x => x.value === status) ? status : 'priprema')
      : null,
    datum_prijave: faza === 'planirano' ? s(body.datum_prijave) : null,
    napomena: s(body.napomena),
  }
}
