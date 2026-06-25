'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type EmployeeRow = {
  id: string
  ime: string
  prezime: string
  photo_url: string | null
  drzava_rodjenja: string | null
  poslodavac: string | null
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

export default function ZaposleniciPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [filtered, setFiltered] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('svi')

  useEffect(() => {
    async function fetchEmployees() {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const sixMonthsAgo = new Date(today)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]

      const { data: emps } = await supabase
        .from('employees')
        .select('id, ime, prezime, photo_url, drzava_rodjenja, poslodavac')
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
    if (statusFilter !== 'svi') {
      result = result.filter(e => {
        const s = statusFromExpiry(e.doc_isteka).label
        if (statusFilter === 'vrijedi') return s === 'Vrijedi'
        if (statusFilter === 'uskoro') return s === 'Uskoro istječe' || s === 'Kritično'
        if (statusFilter === 'isteklo') return s === 'Isteklo'
        if (statusFilter === 'godisnjem') return e.on_vacation
        if (statusFilter === 'bolovanju') return e.on_sick_leave
        if (statusFilter === 'nagradi') return e.no_sick_6mo
        return true
      })
    }
    setFiltered(result)
  }, [search, statusFilter, employees])

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
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: '#2563EB' }}
        >
          + Dodaj zaposlenika
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="Pretraži zaposlenike..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: '#D1D5DB', minWidth: 220, background: 'white' }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: '#D1D5DB', background: 'white', color: '#374151' }}
        >
          <option value="svi">Svi statusi</option>
          <option value="vrijedi">Vrijedi</option>
          <option value="uskoro">Uskoro istječe</option>
          <option value="isteklo">Isteklo</option>
          <option value="godisnjem">Na godišnjem</option>
          <option value="bolovanju">Na bolovanju</option>
          <option value="nagradi">🏆 Bez bolovanja 6mj.</option>
        </select>
        <span className="text-sm" style={{ color: '#94A3B8' }}>
          {filtered.length} {filtered.length === 1 ? 'zaposlenik' : 'zaposlenika'}
        </span>
      </div>

      <div className="bg-white rounded-xl overflow-hidden overflow-x-auto" style={{ border: '1px solid #E2E8F0' }}>
        <table className="w-full" style={{ minWidth: 600 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              {['Zaposlenik', 'Država', 'Dokument', 'Poslodavac', 'Istek', 'Status', 'Akcije'].map(col => (
                <th key={col} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#64748B' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-sm" style={{ color: '#94A3B8' }}>
                {employees.length === 0 ? 'Još nema zaposlenika. Dodajte prvog zaposlenika klikom na gumb gore.' : 'Nema rezultata za unesene filtere.'}
              </td></tr>
            ) : (
              filtered.map((emp, i) => {
                const status = statusFromExpiry(emp.doc_isteka)
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
                                style={{ background: '#DCFCE7', color: '#16A34A' }}>
                                Na godišnjem
                              </span>
                            )}
                            {emp.on_sick_leave && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: '#FEF9C3', color: '#CA8A04' }}>
                                Na bolovanju
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#475569' }}>{emp.drzava_rodjenja || '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#475569' }}>{emp.doc_tip ? (DOC_TYPES[emp.doc_tip] || emp.doc_tip) : '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#475569' }}>{emp.poslodavac || '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#475569' }}>{formatDateHR(emp.doc_isteka)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/zaposlenici/${emp.id}`}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium"
                          style={{ background: '#EFF6FF', color: '#2563EB' }}>
                          Uredi
                        </Link>
                        <button onClick={() => deleteEmployee(emp.id)}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium"
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
