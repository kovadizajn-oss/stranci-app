'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type DeadlineItem = {
  id: string
  employeeId: string
  employeeName: string
  title: string
  description: string
  dueDate: string
  type: 'document' | 'obligation'
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDate().toString().padStart(2, '0')
  const months = ['SIJ','VEL','OŽU','TRA','SVI','LIP','SRP','KOL','RUJ','LIS','STU','PRO']
  return { day, month: months[d.getMonth()] }
}

function daysUntil(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function badgeColor(days: number) {
  if (days < 0) return { bg: '#FEE2E2', text: '#DC2626' }
  if (days <= 7) return { bg: '#FEE2E2', text: '#DC2626' }
  if (days <= 30) return { bg: '#FEF9C3', text: '#CA8A04' }
  return { bg: '#F1F5F9', text: '#475569' }
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  putovnica: 'Putovnica',
  dozvola_boravka: 'Dozvola boravka',
  radna_dozvola: 'Radna dozvola',
  oib: 'OIB',
  zdravstveno: 'Zdravstveno osiguranje',
  ugovor_o_radu: 'Ugovor o radu',
  other: 'Ostalo',
}

export default function DashboardPage() {
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([])
  const [stats, setStats] = useState({ openObligations: 0, nearestDays: null as number | null, doneThisMonth: 0, totalDocs: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const today = new Date()
      const in60 = new Date()
      in60.setDate(today.getDate() + 60)
      const todayStr = today.toISOString().split('T')[0]
      const in60Str = in60.toISOString().split('T')[0]
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

      // Fetch expiring documents with employee info
      const { data: docs } = await supabase
        .from('documents')
        .select('id, employee_id, tip_dokumenta, broj_dokumenta, datum_isteka, employees(ime, prezime)')
        .lte('datum_isteka', in60Str)
        .gte('datum_isteka', todayStr)
        .order('datum_isteka')

      // Fetch employees with expiring smještaj
      const { data: smjestajEmps } = await supabase
        .from('employees')
        .select('id, ime, prezime, datum_isteka_smjestaja')
        .lte('datum_isteka_smjestaja', in60Str)
        .gte('datum_isteka_smjestaja', todayStr)
        .order('datum_isteka_smjestaja')

      // Fetch open obligations with employee info
      const { data: obs } = await supabase
        .from('obligations')
        .select('id, employee_id, naslov, opis, datum_dospieca, status, employees(ime, prezime)')
        .eq('status', 'otvoreno')
        .lte('datum_dospieca', in60Str)
        .order('datum_dospieca')

      // Stats
      const { count: openCount } = await supabase
        .from('obligations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'otvoreno')

      const { count: doneCount } = await supabase
        .from('obligations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'dovršeno')
        .gte('created_at', monthStart)

      const { count: docCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })

      const items: DeadlineItem[] = []

      docs?.forEach((d: any) => {
        const emp = d.employees
        items.push({
          id: d.id,
          employeeId: d.employee_id,
          employeeName: emp ? `${emp.ime} ${emp.prezime}` : 'Nepoznat',
          title: DOCUMENT_TYPE_LABELS[d.tip_dokumenta] || d.tip_dokumenta || 'Dokument',
          description: d.broj_dokumenta ? `Br. dokumenta: ${d.broj_dokumenta}` : '',
          dueDate: d.datum_isteka,
          type: 'document',
        })
      })

      smjestajEmps?.forEach((emp: any) => {
        items.push({
          id: `smjestaj-${emp.id}`,
          employeeId: emp.id,
          employeeName: `${emp.ime} ${emp.prezime}`,
          title: 'Istek smještaja',
          description: '',
          dueDate: emp.datum_isteka_smjestaja,
          type: 'document',
        })
      })

      obs?.forEach((o: any) => {
        const emp = o.employees
        items.push({
          id: o.id,
          employeeId: o.employee_id,
          employeeName: emp ? `${emp.ime} ${emp.prezime}` : 'Nepoznat',
          title: o.naslov,
          description: o.opis || '',
          dueDate: o.datum_dospieca,
          type: 'obligation',
        })
      })

      items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

      // Nearest deadline
      let nearestDays: number | null = null
      if (items.length > 0) {
        nearestDays = daysUntil(items[0].dueDate)
      }

      setDeadlines(items)
      setStats({
        openObligations: openCount || 0,
        nearestDays,
        doneThisMonth: doneCount || 0,
        totalDocs: docCount || 0,
      })
      setLoading(false)
    }

    fetchData()
  }, [])

  const nearestLabel = stats.nearestDays === null
    ? '—'
    : stats.nearestDays < 0
    ? 'Isteklo'
    : stats.nearestDays === 0
    ? 'Danas'
    : deadlines.length > 0
    ? formatDate(deadlines[0].dueDate).day + ' ' + formatDate(deadlines[0].dueDate).month
    : '—'

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold" style={{ color: '#1E293B' }}>
          Dobar dan, <span style={{ color: '#2563EB', fontStyle: 'italic' }}>Kvantus!</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>Evo što slijedi za vas u idućim tjednima.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Otvorenih obaveza',
            value: loading ? '...' : stats.openObligations,
            sub: `od ukupno ${stats.openObligations}`,
            dot: '#F59E0B',
          },
          {
            label: 'Najbliži rok',
            value: loading ? '...' : nearestLabel,
            sub: stats.nearestDays !== null && stats.nearestDays >= 0 ? `za ${stats.nearestDays} dana` : '',
            dot: '#EF4444',
          },
          {
            label: 'Dovršeno ovaj mj.',
            value: loading ? '...' : stats.doneThisMonth,
            sub: '+0 ovaj tjedan',
            dot: '#22C55E',
          },
          {
            label: 'Dokumenata',
            value: loading ? '...' : stats.totalDocs,
            sub: '',
            dot: '#94A3B8',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl p-5"
            style={{ border: '1px solid #E2E8F0' }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: card.dot }} />
              <span className="text-xs" style={{ color: '#64748B' }}>{card.label}</span>
            </div>
            <p className="text-3xl font-semibold mb-1" style={{ color: '#1E293B' }}>{card.value}</p>
            {card.sub && <p className="text-xs" style={{ color: '#94A3B8' }}>{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Upcoming deadlines */}
      <div className="bg-white rounded-xl" style={{ border: '1px solid #E2E8F0' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h2 className="font-semibold" style={{ color: '#1E293B' }}>Nadolazeći rokovi</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Sortirano po datumu</p>
          </div>
          <Link href="/zaposlenici" className="text-sm font-medium" style={{ color: '#2563EB' }}>
            Pogledaj sve →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
        ) : deadlines.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>
            Nema nadolazećih rokova u sljedećih 60 dana. 🎉
          </div>
        ) : (
          <div>
            {deadlines.map((item, i) => {
              const days = daysUntil(item.dueDate)
              const { bg, text } = badgeColor(days)
              const { day, month } = formatDate(item.dueDate)
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-6 py-4"
                  style={{ borderBottom: i < deadlines.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                >
                  {/* Date badge */}
                  <div
                    className="w-14 h-14 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                    style={{ background: bg }}
                  >
                    <span className="text-xl font-bold leading-none" style={{ color: text }}>{day}</span>
                    <span className="text-xs font-medium mt-0.5" style={{ color: text }}>{month}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm" style={{ color: '#1E293B' }}>{item.title}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F1F5F9', color: '#64748B' }}>
                        {item.employeeName}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#64748B' }}>{item.description}</p>
                    )}
                    <p className="text-xs mt-1" style={{ color: days < 0 ? '#DC2626' : '#94A3B8' }}>
                      {days < 0 ? `Isteklo prije ${Math.abs(days)} dana` : days === 0 ? 'Danas' : `Za ${days} dana`}
                    </p>
                  </div>

                  {/* Action */}
                  <Link
                    href={`/zaposlenici/${item.employeeId}`}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: '#EFF6FF', color: '#2563EB' }}
                  >
                    Pogledaj
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
