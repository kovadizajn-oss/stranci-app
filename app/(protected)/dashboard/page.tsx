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


export default function DashboardPage() {
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([])
  const [expired, setExpired] = useState<DeadlineItem[]>([])
  const [stats, setStats] = useState({ openObligations: 0, nearestDays: null as number | null, doneThisMonth: 0, totalWorkers: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const today = new Date()
      const in60 = new Date()
      in60.setDate(today.getDate() + 60)
      const todayStr = today.toISOString().split('T')[0]
      const in60Str = in60.toISOString().split('T')[0]
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

      const [{ data: docs }, { data: expiredDocs }, { count: workerCount }] = await Promise.all([
        supabase.from('documents')
          .select('id, employee_id, naziv, datum_isteka, employees(ime, prezime)')
          .lte('datum_isteka', in60Str)
          .gte('datum_isteka', todayStr)
          .order('datum_isteka'),
        supabase.from('documents')
          .select('id, employee_id, naziv, datum_isteka, employees(ime, prezime)')
          .lt('datum_isteka', todayStr)
          .order('datum_isteka'),
        supabase.from('employees')
          .select('id', { count: 'exact', head: true }),
      ])

      const toItem = (d: any): DeadlineItem => {
        const emp = d.employees
        return {
          id: d.id,
          employeeId: d.employee_id,
          employeeName: emp ? `${emp.ime} ${emp.prezime}` : 'Nepoznat',
          title: d.naziv || 'Dokument',
          description: '',
          dueDate: d.datum_isteka,
          type: 'document',
        }
      }

      const items = (docs || []).map(toItem)
      const expiredItems = (expiredDocs || []).map(toItem)

      // Nearest deadline
      let nearestDays: number | null = null
      if (items.length > 0) nearestDays = daysUntil(items[0].dueDate)

      setDeadlines(items)
      setExpired(expiredItems)
      setStats({
        openObligations: 0,
        nearestDays,
        doneThisMonth: 0,
        totalWorkers: workerCount || 0,
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
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold" style={{ color: '#1E293B' }}>
          Dobar dan, <span style={{ color: '#2563EB', fontStyle: 'italic' }}>Kvantus!</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>Evo što slijedi za vas u idućim tjednima.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          {
            label: 'Najbliži rok',
            value: loading ? '...' : nearestLabel,
            sub: stats.nearestDays !== null && stats.nearestDays >= 0 ? `za ${stats.nearestDays} dana` : '',
            dot: '#EF4444',
          },
          {
            label: 'Radnika',
            value: loading ? '...' : stats.totalWorkers,
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

      {/* Expired documents */}
      {!loading && expired.length > 0 && (
        <div className="bg-white rounded-xl mb-4" style={{ border: '2px solid #FECACA' }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #FEE2E2', background: '#FEF2F2', borderRadius: '10px 10px 0 0' }}>
            <div>
              <h2 className="font-semibold" style={{ color: '#DC2626' }}>⚠️ Isteklo</h2>
              <p className="text-xs mt-0.5" style={{ color: '#EF4444' }}>Ažurirajte datume kada se dokumenti obnove</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>
              {expired.length} {expired.length === 1 ? 'dokument' : 'dokumenta'}
            </span>
          </div>
          <div>
            {expired.map((item, i) => {
              const days = Math.abs(daysUntil(item.dueDate))
              const { day, month } = formatDate(item.dueDate)
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 md:px-6 py-4"
                  style={{ borderBottom: i < expired.length - 1 ? '1px solid #FEE2E2' : 'none' }}>
                  <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                    style={{ background: '#FEE2E2' }}>
                    <span className="text-lg font-bold leading-none" style={{ color: '#DC2626' }}>{day}</span>
                    <span className="text-xs font-medium mt-0.5" style={{ color: '#DC2626' }}>{month}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#1E293B' }}>{item.title}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: '#64748B' }}>{item.employeeName}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#DC2626' }}>Isteklo prije {days} {days === 1 ? 'dana' : 'dana'}</p>
                  </div>
                  <Link href={`/zaposlenici/${item.employeeId}`}
                    className="btn-danger text-xs px-2.5 py-1.5 rounded-lg font-medium flex-shrink-0"
                    style={{ background: '#FEE2E2', color: '#DC2626' }}>
                    Uredi
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming deadlines */}
      <div className="bg-white rounded-xl" style={{ border: '1px solid #E2E8F0' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h2 className="font-semibold" style={{ color: '#1E293B' }}>Nadolazeći rokovi</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Sortirano po datumu</p>
          </div>
          <Link href="/zaposlenici" className="btn-primary text-sm font-medium px-3 py-1.5 rounded-lg" style={{ background: '#EFF6FF', color: '#2563EB' }}>
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
                    className="w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                    style={{ background: bg }}
                  >
                    <span className="text-lg font-bold leading-none" style={{ color: text }}>{day}</span>
                    <span className="text-xs font-medium mt-0.5" style={{ color: text }}>{month}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#1E293B' }}>{item.title}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: '#64748B' }}>{item.employeeName}</p>
                    <p className="text-xs mt-0.5" style={{ color: days < 0 ? '#DC2626' : '#94A3B8' }}>
                      {days < 0 ? `Isteklo prije ${Math.abs(days)} dana` : days === 0 ? 'Danas' : `Za ${days} dana`}
                    </p>
                  </div>

                  {/* Action */}
                  <Link
                    href={`/zaposlenici/${item.employeeId}/pregled`}
                    className="btn-primary text-xs px-2.5 py-1.5 rounded-lg font-medium flex-shrink-0"
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
