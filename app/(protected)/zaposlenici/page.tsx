'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const STATUS_ZAP_CONFIG: Record<string, { color: string; bg: string }> = {
  'Aktivan':    { color: '#16A34A', bg: '#DCFCE7' },
  'U postupku': { color: '#2563EB', bg: '#EFF6FF' },
  'Na čekanju': { color: '#CA8A04', bg: '#FEF9C3' },
  'Završen':    { color: '#475569', bg: '#F1F5F9' },
  'Otkazan':    { color: '#DC2626', bg: '#FEE2E2' },
}

type EmployeeRow = {
  id: string
  ime: string
  prezime: string
  photo_url: string | null
  drzava_rodjenja: string | null
  poslodavac: string | null
  status_zaposlenika: string | null
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

const ZAP_STATUSES = Object.keys(STATUS_ZAP_CONFIG)
const DOC_STATUSES = ['Vrijedi', 'Uskoro istječe', 'Kritično', 'Isteklo', 'Bez dokumenta']

export default function ZaposleniciPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [filtered, setFiltered] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterZap, setFilterZap] = useState('')
  const [filterDoc, setFilterDoc] = useState('')
  const [openFilter, setOpenFilter] = useState<'zap' | 'doc' | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenFilter(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    async function fetchEmployees() {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const sixMonthsAgo = new Date(today)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]

      const { data: emps } = await supabase
        .from('employees')
        .select('id, ime, prezime, photo_url, drzava_rodjenja, poslodavac, status_zaposlenika')
        .order('prezime')

      if (!emps) { setLoading(false); return }

      // Fetch active vacations and sick leaves in bulk
      const { data: vacations } = await supabase
        .from('vacations')
        .select('employee_id')
        .lte('datum_od', todayStr)
        .gte('datum_do', todayStr)

      const { data: sickLeaves } = await supabase
        .from('sick_leaves')
        .select('employee_id')
        .lte('datum_od', todayStr)
        .gte('datum_do', todayStr)

      // Sick leaves in last 6 months
      const { data: recentSick } = await supabase
        .from('sick_leaves')
        .select('employee_id')
        .gte('datum_do', sixMonthsAgoStr)

      const vacationIds = new Set((vacations || []).map((v: any) => v.employee_id))
      const sickIds = new Set((sickLeaves || []).map((s: any) => s.employee_id))
      const recentSickIds = new Set((recentSick || []).map((s: any) => s.employee_id))

      const rows: EmployeeRow[] = await Promise.all(
        emps.map(async (emp: any) => {
          const { data: docs } = await supabase
            .from('documents')
            .select('tip_dokumenta, datum_isteka')
            .eq('employee_id', emp.id)
            .order('datum_isteka', { ascending: true })
            .limit(1)

          const doc = docs?.[0]
          return {
            id: emp.id,
            ime: emp.ime,
            prezime: emp.prezime,
            photo_url: emp.photo_url,
            drzava_rodjenja: emp.drzava_rodjenja,
            poslodavac: emp.poslodavac,
            status_zaposlenika: emp.status_zaposlenika || null,
            doc_tip: doc?.tip_dokumenta || null,
            doc_isteka: doc?.datum_isteka || null,
            on_vacation: vacationIds.has(emp.id),
            on_sick_leave: sickIds.has(emp.id),
            no_sick_6mo: !recentSickIds.has(emp.id),
          }
        })
      )

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
      const q = search.toLowerCase()
      result = result.filter(e =>
        `${e.ime} ${e.prezime}`.toLowerCase().includes(q) ||
        (e.poslodavac || '').toLowerCase().includes(q)
      )
    }
    if (filterZap) result = result.filter(e => e.status_zaposlenika === filterZap)
    if (filterDoc) result = result.filter(e => statusFromExpiry(e.doc_isteka).label === filterDoc)
    setFiltered(result)
  }, [search, filterZap, filterDoc, employees])

  async function deleteEmployee(id: string) {
    if (!confirm('Jeste li sigurni da želite obrisati ovog zaposlenika?')) return
    await supabase.from('employees').delete().eq('id', id)
    setEmployees(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#1E293B' }}>Zaposlenici</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Pratite dokumente i rokove svih stranih radnika na jednom mjestu.
          </p>
        </div>
        <Link
          href="/zaposlenici/novi"
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: '#2563EB' }}
        >
          + Dodaj zaposlenika
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-5">
        <input
          type="text"
          placeholder="Pretraži zaposlenike..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-auto px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: '#D1D5DB', minWidth: 220, background: 'white' }}
        />
        {(filterZap || filterDoc) && (
          <div className="flex items-center gap-2">
            {filterZap && (
              <button onClick={() => setFilterZap('')}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                {filterZap} ✕
              </button>
            )}
            {filterDoc && (
              <button onClick={() => setFilterDoc('')}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                {filterDoc} ✕
              </button>
            )}
          </div>
        )}
        <span className="text-sm md:ml-auto" style={{ color: '#94A3B8' }}>
          {filtered.length} {filtered.length === 1 ? 'zaposlenik' : 'zaposlenika'}
        </span>
      </div>

      <div className="bg-white rounded-xl overflow-hidden overflow-x-auto" style={{ border: '1px solid #E2E8F0' }}>
        <table className="w-full" style={{ minWidth: 750 }}>
          <thead>
            <tr ref={filterRef} style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>Zaposlenik</th>

              {/* Status zaposlenika filter header */}
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>
                <div className="relative inline-block">
                  <button onClick={() => setOpenFilter(openFilter === 'zap' ? null : 'zap')}
                    className="flex items-center gap-1 whitespace-nowrap"
                    style={{ color: filterZap ? '#2563EB' : '#64748B' }}>
                    Status zaposlenika
                    {filterZap && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#2563EB' }} />}
                    <span style={{ fontSize: 9 }}>▾</span>
                  </button>
                  {openFilter === 'zap' && (
                    <div className="absolute left-0 top-full mt-1 bg-white rounded-xl py-1 z-20"
                      style={{ border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160 }}>
                      {ZAP_STATUSES.map(s => {
                        const cfg = STATUS_ZAP_CONFIG[s]
                        return (
                          <button key={s} onClick={() => { setFilterZap(s); setOpenFilter(null) }}
                            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2"
                            style={{ fontWeight: filterZap === s ? 600 : 400 }}>
                            <span className="px-2 py-0.5 rounded-full font-medium"
                              style={{ background: cfg.bg, color: cfg.color }}>{s}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </th>

              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>Nadolazeći istek</th>

              {/* Status dokumenata filter header */}
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>
                <div className="relative inline-block">
                  <button onClick={() => setOpenFilter(openFilter === 'doc' ? null : 'doc')}
                    className="flex items-center gap-1 whitespace-nowrap"
                    style={{ color: filterDoc ? '#2563EB' : '#64748B' }}>
                    Status dokumenata
                    {filterDoc && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#2563EB' }} />}
                    <span style={{ fontSize: 9 }}>▾</span>
                  </button>
                  {openFilter === 'doc' && (
                    <div className="absolute left-0 top-full mt-1 bg-white rounded-xl py-1 z-20"
                      style={{ border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160 }}>
                      {DOC_STATUSES.map(s => (
                        <button key={s} onClick={() => { setFilterDoc(s); setOpenFilter(null) }}
                          className="w-full text-left px-3 py-2 text-xs"
                          style={{ color: filterDoc === s ? '#2563EB' : '#475569', fontWeight: filterDoc === s ? 600 : 400 }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </th>

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
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
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
  )
}
