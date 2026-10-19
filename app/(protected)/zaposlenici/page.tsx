'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ustupanjeUpozorenje, VRSTA_BADGE, type VrstaZaposlenja } from '@/lib/zaposlenje'
import FilterDropdown, { type FilterOption } from '@/components/FilterDropdown'
import GenerirajPopis from '@/components/GenerirajPopis'

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
  vrsta_zaposlenja: VrstaZaposlenja | null
  ustupanje_do: string | null
  doc_tip: string | null
  doc_isteka: string | null
  on_vacation: boolean
  on_sick_leave: boolean
  no_sick_6mo: boolean
  prelazak: { poslodavac: string | null; datum_od: string | null; status_prijave: string | null } | null
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

function daysLabel(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  const days = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (days === 0) return 'ističe danas'
  if (days < 0) return `isteklo prije ${-days} ${-days === 1 ? 'dan' : 'dana'}`
  return `za ${days} ${days === 1 ? 'dan' : 'dana'}`
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

function uniqueSorted(values: (string | null)[]) {
  return Array.from(new Set(values.filter((v): v is string => !!v && v.trim() !== ''))).sort((a, b) => a.localeCompare(b, 'hr'))
}

const opts = (values: string[]): FilterOption[] => values.map(value => ({ value }))
const PRISUTNOST_OPTS: FilterOption[] = [
  { value: 'Radi' },
  { value: 'Na godišnjem', color: '#16A34A', bg: '#DCFCE7' },
  { value: 'Na bolovanju', color: '#CA8A04', bg: '#FEF9C3' },
]
const ZAPOSLENJE_OPTS: FilterOption[] = [
  { value: 'Ustupanje', color: VRSTA_BADGE.ustupanje.color, bg: VRSTA_BADGE.ustupanje.bg },
  { value: 'Izravno', color: VRSTA_BADGE.izravno.color, bg: VRSTA_BADGE.izravno.bg },
  { value: 'Nije određeno', color: '#64748B', bg: '#F1F5F9' },
  { value: 'Planiran prelazak', label: '→ Planiran prelazak', color: '#2563EB', bg: '#EFF6FF' },
]

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
  const [filterZaposlenje, setFilterZaposlenje] = useState('')
  // Odabir radnika za popise (npr. liječnički pregled)
  const [odabrani, setOdabrani] = useState<Set<string>>(new Set())
  const [popisOtvoren, setPopisOtvoren] = useState(false)
  function prebaciOdabir(id: string) {
    setOdabrani(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }


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
    if (filterZaposlenje === 'Ustupanje') result = result.filter(e => e.vrsta_zaposlenja === 'ustupanje')
    if (filterZaposlenje === 'Izravno') result = result.filter(e => e.vrsta_zaposlenja === 'izravno')
    if (filterZaposlenje === 'Nije određeno') result = result.filter(e => !e.vrsta_zaposlenja)
    if (filterZaposlenje === 'Planiran prelazak') result = result.filter(e => !!e.prelazak)

    // When no filters active, float "Novi uvoz" workers to the top
    if (!search && !filterZap && !filterDoc && !filterTvrtka && !filterDrzava && !filterPrisutnost && !filterZaposlenje) {
      result = [...result].sort((a, b) => {
        const aNew = a.status_zaposlenika === 'Novi uvoz' ? 0 : 1
        const bNew = b.status_zaposlenika === 'Novi uvoz' ? 0 : 1
        return aNew - bNew
      })
    }

    setFiltered(result)
  }, [search, filterZap, filterDoc, filterTvrtka, filterDrzava, filterPrisutnost, filterZaposlenje, employees])

  const anyFilter = !!(search || filterZap || filterDoc || filterTvrtka || filterDrzava || filterPrisutnost || filterZaposlenje)
  const tvrtke = uniqueSorted(employees.map(e => e.poslodavac))
  const drzave = uniqueSorted(employees.map(e => e.drzava_rodjenja))

  function clearFilters() {
    setSearch(''); setFilterZap(''); setFilterDoc(''); setFilterTvrtka(''); setFilterDrzava(''); setFilterPrisutnost(''); setFilterZaposlenje('')
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
          style={{ borderColor: '#D1D5DB', minWidth: 260, height: 38, background: 'white' }}
        />
        <FilterDropdown label="Status" value={filterZap} onChange={setFilterZap}
          options={ZAP_STATUSES.map(v => ({ value: v, ...STATUS_ZAP_CONFIG[v] }))} />
        <FilterDropdown label="Dokumenti" value={filterDoc} onChange={setFilterDoc}
          options={DOC_STATUSES.map(v => ({ value: v, ...DOC_STATUS_CONFIG[v] }))} />
        <FilterDropdown label="Zaposlenje" value={filterZaposlenje} onChange={setFilterZaposlenje} options={ZAPOSLENJE_OPTS} />
        {tvrtke.length > 0 && <FilterDropdown label="Tvrtka" value={filterTvrtka} onChange={setFilterTvrtka} options={opts(tvrtke)} />}
        {drzave.length > 0 && <FilterDropdown label="Država" value={filterDrzava} onChange={setFilterDrzava} options={opts(drzave)} />}
        <FilterDropdown label="Prisutnost" value={filterPrisutnost} onChange={setFilterPrisutnost} options={PRISUTNOST_OPTS} />
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
              <th className="pl-4 pr-1 py-3" style={{ width: 36 }}>
                <input type="checkbox" aria-label="Odaberi sve" className="cursor-pointer"
                  checked={filtered.length > 0 && filtered.every(e => odabrani.has(e.id))}
                  onChange={e => setOdabrani(e.target.checked ? new Set([...odabrani, ...filtered.map(x => x.id)]) : new Set([...odabrani].filter(id => !filtered.some(x => x.id === id))))} />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>Zaposlenik</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>Status zaposlenika</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>Nadolazeći istek</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>Status dokumenata</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: '#94A3B8' }}>
                {employees.length === 0 ? 'Još nema zaposlenika. Dodajte prvog zaposlenika klikom na gumb gore.' : 'Nema rezultata za unesene filtere.'}
              </td></tr>
            ) : (
              filtered.map((emp, i) => {
                const docStatus = statusFromExpiry(emp.doc_isteka)
                const zapCfg = STATUS_ZAP_CONFIG[emp.status_zaposlenika || ''] || { color: '#475569', bg: '#F1F5F9' }
                return (
                  <tr key={emp.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none', background: odabrani.has(emp.id) ? '#F8FBFF' : undefined }}>
                    <td className="pl-4 pr-1 py-3">
                      <input type="checkbox" aria-label={`Odaberi ${emp.ime} ${emp.prezime}`} className="cursor-pointer"
                        checked={odabrani.has(emp.id)} onChange={() => prebaciOdabir(emp.id)} />
                    </td>
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
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {(() => {
                              const w = emp.vrsta_zaposlenja === 'ustupanje' ? ustupanjeUpozorenje(emp.ustupanje_do) : null
                              return w && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: w.bg, color: w.color }}>{w.label}</span>
                            })()}
                            {emp.prelazak && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" title="Planirani prelazak"
                                style={{ background: '#EFF6FF', color: '#2563EB' }}>
                                → {emp.prelazak.poslodavac}{emp.prelazak.datum_od ? ` od ${formatDateHR(emp.prelazak.datum_od)}` : ''}
                              </span>
                            )}
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
                    <td className="px-4 py-3">
                      {emp.doc_isteka ? (
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#1E293B' }}>{emp.doc_tip || 'Dokument'}</p>
                          <p className="text-xs" style={{ color: docStatus.label === 'Vrijedi' ? '#64748B' : docStatus.color }}>
                            {formatDateHR(emp.doc_isteka)} · {daysLabel(emp.doc_isteka)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: '#CBD5E1' }}>—</span>
                      )}
                    </td>
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

      {/* Traka za odabrane radnike */}
      {odabrani.size > 0 && (
        <div className="sticky bottom-[68px] md:bottom-4 z-10 mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl flex-wrap"
          style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid #BFDBFE', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <span className="text-sm font-medium flex-1" style={{ color: '#1E293B' }}>
            {odabrani.size} {odabrani.size === 1 ? 'radnik odabran' : 'radnika odabrano'}
          </span>
          <button type="button" onClick={() => setOdabrani(new Set())} className="btn-secondary px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: '#F1F5F9', color: '#374151' }}>Poništi odabir</button>
          <button type="button" onClick={() => setPopisOtvoren(true)} className="btn-primary px-4 py-2 rounded-lg text-xs font-medium text-white"
            style={{ background: '#2563EB' }}>📘 Popis za liječnički pregled</button>
        </div>
      )}
      {popisOtvoren && <GenerirajPopis employeeIds={[...odabrani]} onClose={() => setPopisOtvoren(false)} />}


    </div>
  )
}
