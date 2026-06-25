'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type CalEvent = {
  id: string
  type: 'vacation' | 'sick' | 'doc_expiry'
  employeeName: string
  employeeId: string
  dateFrom: string
  dateTo: string
  label: string
}

const EVENT_CONFIG = {
  vacation:        { color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0', icon: '🌴', label: 'Godišnji odmor' },
  sick:            { color: '#CA8A04', bg: '#FEF9C3', border: '#FDE047', icon: '🏥', label: 'Bolovanje' },
  doc_expiry:      { color: '#DC2626', bg: '#FEE2E2', border: '#FECACA', icon: '📄', label: 'Istek dokumenta' },
}

const MONTH_NAMES = ['Siječanj','Veljača','Ožujak','Travanj','Svibanj','Lipanj',
                     'Srpanj','Kolovoz','Rujan','Listopad','Studeni','Prosinac']
const DAY_LABELS = ['Pon','Uto','Sri','Čet','Pet','Sub','Ned']

const DOC_TYPE_LABELS: Record<string, string> = {
  radna_dozvola: 'Radna dozvola',
  lijecnicki: 'Liječnički pregled',
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatHR(dateStr: string) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}.`
}

export default function KalendarPage() {
  const today = new Date()
  const todayStr = toDateStr(today)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAll() {
      const [
        { data: vacs },
        { data: sick },
        { data: docs },
      ] = await Promise.all([
        supabase.from('vacations').select('id, employee_id, datum_od, datum_do, employees(ime, prezime)'),
        supabase.from('sick_leaves').select('id, employee_id, datum_od, datum_do, employees(ime, prezime)'),
        supabase.from('documents').select('id, employee_id, tip_dokumenta, datum_isteka, employees(ime, prezime)').not('datum_isteka', 'is', null),
      ])

      const all: CalEvent[] = []

      vacs?.forEach((v: any) => {
        const emp = v.employees
        if (!emp) return
        all.push({ id: v.id, type: 'vacation', employeeName: `${emp.ime} ${emp.prezime}`, employeeId: v.employee_id, dateFrom: v.datum_od, dateTo: v.datum_do, label: 'Godišnji odmor' })
      })

      sick?.forEach((s: any) => {
        const emp = s.employees
        if (!emp) return
        all.push({ id: s.id, type: 'sick', employeeName: `${emp.ime} ${emp.prezime}`, employeeId: s.employee_id, dateFrom: s.datum_od, dateTo: s.datum_do, label: 'Bolovanje' })
      })

      docs?.forEach((d: any) => {
        if (!d.datum_isteka) return
        const emp = d.employees
        if (!emp) return
        all.push({ id: `doc-${d.id}`, type: 'doc_expiry', employeeName: `${emp.ime} ${emp.prezime}`, employeeId: d.employee_id, dateFrom: d.datum_isteka, dateTo: d.datum_isteka, label: DOC_TYPE_LABELS[d.tip_dokumenta] || 'Dokument' })
      })


      setEvents(all)
      setLoading(false)
    }
    fetchAll()
  }, [])

  // Calendar days for current month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6

    const days: (string | null)[] = []
    for (let i = 0; i < startDow; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(toDateStr(new Date(year, month, d)))
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [year, month])

  // Map each date string to its events
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalEvent[]> = {}
    const monthStart = toDateStr(new Date(year, month, 1))
    const monthEnd = toDateStr(new Date(year, month + 1, 0))

    events.forEach(e => {
      // Only expand days within visible month (for performance)
      const from = e.dateFrom > monthStart ? e.dateFrom : monthStart
      const to = e.dateTo < monthEnd ? e.dateTo : monthEnd
      if (from > to) return

      const cur = new Date(from)
      const end = new Date(to)
      while (cur <= end) {
        const key = toDateStr(cur)
        if (!map[key]) map[key] = []
        map[key].push(e)
        cur.setDate(cur.getDate() + 1)
      }
    })
    return map
  }, [events, year, month])

  // Agenda: all events touching this month, sorted by start date
  const agendaEvents = useMemo(() => {
    const monthStart = toDateStr(new Date(year, month, 1))
    const monthEnd = toDateStr(new Date(year, month + 1, 0))
    return [...events]
      .filter(e => e.dateFrom <= monthEnd && e.dateTo >= monthStart)
      .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom))
  }, [events, year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : []

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: '#1E293B' }}>Kalendar</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>Pregled godišnjih odmora, bolovanja i rokova isteka.</p>
      </div>

      {/* Calendar card */}
      <div className="bg-white rounded-xl mb-6" style={{ border: '1px solid #E2E8F0' }}>

        {/* Calendar header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-lg font-medium transition-colors"
              style={{ background: '#F8FAFC', color: '#374151' }}>‹</button>
            <h2 className="text-lg font-semibold" style={{ color: '#1E293B', minWidth: 180, textAlign: 'center' }}>
              {MONTH_NAMES[month]} {year}
            </h2>
            <button onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-lg font-medium transition-colors"
              style={{ background: '#F8FAFC', color: '#374151' }}>›</button>
            <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(todayStr) }}
              className="ml-2 px-3 py-1 rounded-lg text-xs font-medium"
              style={{ background: '#EFF6FF', color: '#2563EB' }}>Danas</button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5">
            {(Object.entries(EVENT_CONFIG) as [keyof typeof EVENT_CONFIG, typeof EVENT_CONFIG[keyof typeof EVENT_CONFIG]][]).map(([type, cfg]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                <span className="text-xs" style={{ color: '#64748B' }}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 px-4 pt-3">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-semibold pb-2" style={{ color: '#94A3B8' }}>{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 px-4 pb-4 gap-1">
          {calendarDays.map((dateStr, i) => {
            if (!dateStr) return <div key={`empty-${i}`} className="min-h-16" />

            const dayEvents = eventsByDay[dateStr] || []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDay
            const dayNum = parseInt(dateStr.split('-')[2])

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDay(prev => prev === dateStr ? null : dateStr)}
                className="rounded-lg p-1.5 cursor-pointer min-h-16 transition-all"
                style={{
                  background: isSelected ? '#EFF6FF' : isToday ? '#F8FAFC' : 'transparent',
                  border: isSelected ? '1px solid #BFDBFE' : isToday ? '1px solid #E2E8F0' : '1px solid transparent',
                }}
              >
                <div className="mb-1">
                  <span
                    className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                    style={{
                      background: isToday ? '#2563EB' : 'transparent',
                      color: isToday ? 'white' : '#374151',
                    }}
                  >{dayNum}</span>
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {dayEvents.slice(0, 5).map((ev, j) => (
                    <span key={j} className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: EVENT_CONFIG[ev.type].color }}
                      title={`${ev.employeeName} – ${ev.label}`} />
                  ))}
                  {dayEvents.length > 5 && (
                    <span style={{ color: '#94A3B8', fontSize: 9, lineHeight: '8px' }}>+{dayEvents.length - 5}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected day popup */}
        {selectedDay && (
          <div className="px-6 py-4" style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: '0 0 12px 12px' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#1E293B' }}>{formatHR(selectedDay)}</p>
            {selectedEvents.length === 0 ? (
              <p className="text-sm" style={{ color: '#94A3B8' }}>Nema događaja ovaj dan.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedEvents.map((ev, i) => {
                  const cfg = EVENT_CONFIG[ev.type]
                  return (
                    <Link key={i} href={`/zaposlenici/${ev.employeeId}/pregled`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      <span>{cfg.icon}</span>
                      <span>{ev.employeeName}</span>
                      <span style={{ opacity: 0.7 }}>– {ev.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agenda list */}
      <div className="bg-white rounded-xl" style={{ border: '1px solid #E2E8F0' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <h2 className="font-semibold" style={{ color: '#1E293B' }}>Pregled — {MONTH_NAMES[month]} {year}</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
        ) : agendaEvents.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Nema događaja ovaj mjesec.</div>
        ) : (
          <div>
            {agendaEvents.map((ev, i) => {
              const cfg = EVENT_CONFIG[ev.type]
              const isRange = ev.dateFrom !== ev.dateTo
              return (
                <div key={ev.id + i} className="flex items-center gap-4 px-6 py-3"
                  style={{ borderBottom: i < agendaEvents.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: '#1E293B' }}>{ev.employeeName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.icon} {ev.label}
                    </span>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: '#64748B' }}>
                    {isRange
                      ? `${formatHR(ev.dateFrom)} – ${formatHR(ev.dateTo)}`
                      : formatHR(ev.dateFrom)}
                  </span>
                  <Link href={`/zaposlenici/${ev.employeeId}/pregled`}
                    className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0"
                    style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    Pregled
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
