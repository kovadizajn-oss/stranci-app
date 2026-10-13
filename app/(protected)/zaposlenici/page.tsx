'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'

const STATUS_ZAP_CONFIG: Record<string, { color: string; bg: string }> = {
  'Aktivan':    { color: '#16A34A', bg: '#DCFCE7' },
  'U postupku': { color: '#2563EB', bg: '#EFF6FF' },
  'Na čekanju': { color: '#CA8A04', bg: '#FEF9C3' },
  'Otkazan':    { color: '#DC2626', bg: '#FEE2E2' },
  'Novi uvoz':  { color: '#4338CA', bg: '#EEF2FF' },
}

type EmployeeRow = {
  id: string
  ime: string
  prezime: string
  photo_url: string | null
  drzava_rodjenja: string | null
  poslodavac: string | null
  status_zaposlenika: string | null
  oib: string | null
  doc_tip: string | null
  doc_isteka: string | null
  on_vacation: boolean
  on_sick_leave: boolean
  no_sick_6mo: boolean
}

function statusFromExpiry(dateStr: string | null) {
  if (!dateStr) return { label: 'Bez dokumenta', color: '#94A3B8', bg: '#F1F5F9' }
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (days < 0) return { label: 'Isteklo', color: '#DC2626', bg: '#FEE2E2' }
  if (days <= 7) return { label: 'Kritično', color: '#DC2626', bg: '#FEE2E2' }
  if (days <= 30) return { label: 'Uskoro istječe', color: '#CA8A04', bg: '#FEF9C3' }
  return { label: 'Vrijedi', color: '#16A34A', bg: '#DCFCE7' }
}

function formatDateHR(dateStr: string | null) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}.`
}

const DOC_TYPES: Record<string, string> = {
  radna_dozvola: 'Radna dozvola',
  lijecnicki: 'Liječnički pregled',
}

const ZAP_STATUSES = ['Aktivan', 'U postupku', 'Na čekanju', 'Otkazan', 'Novi uvoz']
const DOC_STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  'Vrijedi':        { color: '#16A34A', bg: '#DCFCE7' },
  'Uskoro istječe': { color: '#CA8A04', bg: '#FEF9C3' },
  'Kritično':       { color: '#DC2626', bg: '#FEE2E2' },
  'Isteklo':        { color: '#DC2626', bg: '#FEE2E2' },
  'Bez dokumenta':  { color: '#94A3B8', bg: '#F1F5F9' },
}
const DOC_STATUSES = Object.keys(DOC_STATUS_CONFIG)
const PRISUTNOST = ['Radi', 'Na godišnjem', 'Na bolovanju']

const selectStyle: CSSProperties = {
  borderColor: '#D1D5DB', background: 'white', color: '#334155', minWidth: 150,
}

function uniqueSorted(values: (string | null)[]) {
  return Array.from(new Set(values.filter((v): v is string => !!v && v.trim() !== ''))).sort((a, b) => a.localeCompare(b, 'hr'))
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={label}
      className="w-full md:w-auto px-3 py-2 rounded-lg border text-sm"
      style={{ ...selectStyle, borderColor: value ? '#2563EB' : '#D1D5DB', color: value ? '#1D4ED8' : '#334155' }}
    >
      <option value="">{label}: sve</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export default function ZaposleniciPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [filtered, setFiltered] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterZap, setFilterZap] = useState('')
  const [filterDoc, setFilterDoc] = useState('')
  const [filterTvrtka, setFilterTvrtka] = useState('')
  const [filterDrzava, setFilterDrzava] = useState('')
  const [filterPrisutnost, setFilterPrisutnost] = useState('')


  useEffect(() => {
    async function fetchEmployees() {
      const res = await fetch('/api/employees')
      if (!res.ok) { setLoading(false); return }
      const rows: EmployeeRow[] = await res.json()

      rows.sort((a, b) => {
        if (!a.doc_isteka) return 1
        if (!b.doc_isteka) return -1
        return new Date(a.doc_isteka).getTime() - new Date(b.doc_isteka).getTime()
      })

      setEmployees(rows)
      setFiltered(rows)
      setLoading(false)
    }

    fetchEmployees()
  }, [])

  useEffect(() => {
    let result = employees
    if (search) {
      const q = search.toLowerCase().trim()
      result = result.filter(e =>
        `${e.ime} ${e.prezime}`.toLowerCase().includes(q) ||
        `${e.prezime} ${e.ime}`.toLowerCase().includes(q) ||
        (e.poslodavac || '').toLowerCase().includes(q) ||
        (e.oib || '').includes(q)
      )
    }
    if (filterZap) result = result.filter(e => e.status_zaposlenika === filterZap)
    if (filterDoc) result = result.filter(e => statusFromExpiry(e.doc_isteka).label === filterDoc)
    if (filterTvrtka) result = result.filter(e => e.poslodavac === filterTvrtka)
    if (filterDrzava) result = result.filter(e => e.drzava_rodjenja === filterDrzava)
    if (filterPrisutnost === 'Na godišnjem') result = result.filter(e => e.on_vacation)
    if (filterPrisutnost === 'Na bolovanju') result = result.filter(e => e.on_sick_leave)
    if (filterPrisutnost === 'Radi') result = result.filter(e => !e.on_vacation && !e.on_sick_leave)

    // When no filters active, float "Novi uvoz" workers to the top
    if (!search && !filterZap && !filterDoc && !filterTvrtka && !filterDrzava && !filterPrisutnost) {
      result = [...result].sort((a, b) => {
        const aNew = a.status_zaposlenika === 'Novi uvoz' ? 0 : 1
        const bNew = b.status_zaposlenika === 'Novi uvoz' ? 0 : 1
        return aNew - bNew
      })
    }

    setFiltered(result)
  }, [search, filterZap, filterDoc, filterTvrtka, filterDrzava, filterPrisutnost, employees])

  const anyFilter = !!(search || filterZap || filterDoc || filterTvrtka || filterDrzava || filterPrisutnost)
  const tvrtke = uniqueSorted(employees.map(e => e.poslodavac))
  const drzave = uniqueSorted(employees.map(e => e.drzava_rodjenja))

  function clearFilters() {
    setSearch(''); setFilterZap(''); setFilterDoc(''); setFilterTvrtka(''); setFilterDrzava(''); setFilterPrisutnost('')
  }

  async function deleteEmployee(id: string) {
    if (!confirm('Jeste li sigurni da želite obrisati ovog zaposlenika?')) return
    await fetch(`/api/employees/${id}`, { method: 'DELETE' })
    setEmployees(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.3px' }}>Zaposlenici</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Pratite dokumente i rokove svih stranih radnika na jednom mjestu.
          </p>
        </div>
        <Link
          href="/zaposlenici/dodaj"
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
        >
          + Dodaj zaposlenika
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3 mb-5">
        <input
          type="text"
          placeholder="Pretraži po imenu, OIB-u ili tvrtki..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-auto px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: '#D1D5DB', minWidth: 260, background: 'white' }}
        />
        <FilterSelect label="Status" value={filterZap} onChange={setFilterZap} options={ZAP_STATUSES} />
        <FilterSelect label="Dokumenti" value={filterDoc} onChange={setFilterDoc} options={DOC_STATUSES} />
        {tvrtke.length > 0 && <FilterSelect label="Tvrtka" value={filterTvrtka} onChange={setFilterTvrtka} options={tvrtke} />}
        {drzave.length > 0 && <FilterSelect label="Država" value={filterDrzava} onChange={setFilterDrzava} options={drzave} />}
        <FilterSelect label="Prisutnost" value={filterPrisutnost} onChange={setFilterPrisutnost} options={PRISUTNOST} />
        {anyFilter && (
          <button onClick={clearFilters}
            className="text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap"
            style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
            Očisti filtere ✕
          </button>
        )}
        <span className="text-sm md:ml-auto whitespace-nowrap" style={{ color: '#94A3B8' }}>
          {filtered.length} {filtered.length === 1 ? 'zaposlenik' : 'zaposlenika'}
        </span>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }}>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: 750 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>Zaposlenik</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>Status zaposlenika</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>Nadolazeći istek</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>Status dokumenata</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-sm" style={{ color: '#94A3B8' }}>
                {employees.length === 0 ? 'Još nema zaposlenika. Dodajte prvog zaposlenika klikom na gumb gore.' : 'Nema rezultata za unesene filtere.'}
              </td></tr>
            ) : (
              filtered.map((emp, i) => {
                const docStatus = statusFromExpiry(emp.doc_isteka)
                const zapCfg = STATUS_ZAP_CONFIG[emp.status_zaposlenika || ''] || { color: '#475569', bg: '#F1F5F9' }
                return (
                  <tr key={emp.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                          style={{ background: '#EFF6FF', color: '#2563EB' }}>
                          {emp.ime[0]}{emp.prezime[0]}
                        </div>
                        <div>
                          <Link href={`/zaposlenici/${emp.id}/pregled`} className="text-sm font-medium hover:underline" style={{ color: '#1E293B' }}>
                            {emp.ime} {emp.prezime}
                          </Link>
                          <div className="flex gap-1 mt-0.5">
                            {emp.on_vacation && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: '#DCFCE7', color: '#16A34A' }}>Na godišnjem</span>
                            )}
                            {emp.on_sick_leave && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: '#FEF9C3', color: '#CA8A04' }}>Na bolovanju</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {emp.status_zaposlenika && (
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ background: zapCfg.bg, color: zapCfg.color }}>
                          {emp.status_zaposlenika}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#475569' }}>{formatDateHR(emp.doc_isteka)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: docStatus.bg, color: docStatus.color }}>
                        {docStatus.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/zaposlenici/${emp.id}`}
                          className="btn-primary text-xs px-2.5 py-1 rounded-lg font-medium"
                          style={{ background: '#EFF6FF', color: '#2563EB' }}>
                          Uredi
                        </Link>
                        <button onClick={() => deleteEmployee(emp.id)}
                          className="btn-danger text-xs px-2.5 py-1 rounded-lg font-medium"
                          style={{ background: '#FEF2F2', color: '#DC2626' }}>
                          Obriši
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      </div>


    </div>
  )
}
