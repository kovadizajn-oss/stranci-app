'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(dateStr); due.setHours(0,0,0,0)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

function expiryBadge(dateStr: string | null) {
  if (!dateStr) return null
  const days = daysUntil(dateStr)
  const d = new Date(dateStr)
  const label = `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}.`
  if (days < 0) return { label: `Isteklo ${label}`, color: '#DC2626', bg: '#FEE2E2' }
  if (days <= 7) return { label: `Istječe ${label}`, color: '#DC2626', bg: '#FEE2E2' }
  if (days <= 30) return { label: `Istječe ${label}`, color: '#CA8A04', bg: '#FEF9C3' }
  return { label: `Vrijedi do ${label}`, color: '#16A34A', bg: '#DCFCE7' }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}.`
}

function fileNameFromUrl(url: string) {
  try {
    const parts = decodeURIComponent(url).split('/')
    return parts[parts.length - 1].replace(/^(doc|att|photo)_\d+_/, '')
  } catch { return 'Datoteka' }
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #E2E8F0' }}>
      <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
        <span>{icon}</span>
        <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>{title}</p>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col mb-3">
      <span className="text-xs mb-0.5" style={{ color: '#94A3B8' }}>{label}</span>
      <span className="text-sm" style={{ color: value ? '#1E293B' : '#CBD5E1' }}>{value || '—'}</span>
    </div>
  )
}

export default function CandidatePregled() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [emp, setEmp] = useState<any>(null)
  const [radnaDozvola, setRadnaDozvola] = useState<any>(null)
  const [lijecnicki, setLijecnicki] = useState<any>(null)
  const [vacations, setVacations] = useState<any[]>([])
  const [sickLeaves, setSickLeaves] = useState<any[]>([])

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const { data: employee } = await supabase.from('employees').select('*').eq('id', id).single()
      if (!employee) return
      setEmp(employee)

      const [{ data: docs }, { data: vacs }, { data: sick }] = await Promise.all([
        supabase.from('documents').select('*').eq('employee_id', id),
        supabase.from('vacations').select('*').eq('employee_id', id).order('datum_od', { ascending: false }),
        supabase.from('sick_leaves').select('*').eq('employee_id', id).order('datum_od', { ascending: false }),
      ])

      setRadnaDozvola(docs?.find((d: any) => d.tip_dokumenta === 'radna_dozvola') || null)
      setLijecnicki(docs?.find((d: any) => d.tip_dokumenta === 'lijecnicki') || null)
      setVacations(vacs || [])
      setSickLeaves(sick || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="p-8 text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
  if (!emp) return <div className="p-8 text-sm" style={{ color: '#EF4444' }}>Zaposlenik nije pronađen.</div>

  const onVacation = vacations.some((v: any) => v.datum_od <= today && v.datum_do >= today)
  const onSickLeave = sickLeaves.some((s: any) => s.datum_od <= today && s.datum_do >= today)
  const rdBadge = expiryBadge(radnaDozvola?.datum_isteka)
  const ljBadge = expiryBadge(lijecnicki?.datum_isteka)

  return (
    <div className="p-4 md:p-8" style={{ maxWidth: 1000 }}>
      <Link href="/zaposlenici" className="text-sm" style={{ color: '#64748B' }}>← Zaposlenici</Link>

      {/* Header */}
      <div className="flex items-start justify-between mt-4 mb-6 gap-3">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0"
            style={{ background: '#EFF6FF', color: '#2563EB', border: '3px solid #E2E8F0' }}>
            {emp.ime?.[0]}{emp.prezime?.[0]}
          </div>
          <div>
            <h1 className="text-3xl font-semibold mb-2" style={{ color: '#1E293B' }}>{emp.ime} {emp.prezime}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {emp.drzava_rodjenja && (
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#F1F5F9', color: '#475569' }}>
                  🌍 {emp.drzava_rodjenja}
                </span>
              )}
              {emp.poslodavac && (
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#F1F5F9', color: '#475569' }}>
                  💼 {emp.poslodavac}
                </span>
              )}
              {emp.radno_mjesto && (
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#F1F5F9', color: '#475569' }}>
                  {emp.radno_mjesto}
                </span>
              )}
              {onVacation && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#DCFCE7', color: '#16A34A' }}>🌴 Na godišnjem</span>
              )}
              {onSickLeave && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#FEF9C3', color: '#CA8A04' }}>🏥 Na bolovanju</span>
              )}
            </div>
          </div>
        </div>
        <Link href={`/zaposlenici/${id}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white flex-shrink-0"
          style={{ background: '#2563EB' }}>
          ✏️ Uredi
        </Link>
      </div>

      {/* Main grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-[1fr_360px]">

        {/* LEFT */}
        <div className="flex flex-col gap-4">

          {/* Osobni podaci */}
          <Card title="Osobni podaci" icon="👤">
            <div className="grid grid-cols-2 gap-x-6">
              <Row label="Ime" value={emp.ime} />
              <Row label="Prezime" value={emp.prezime} />
              <div className="col-span-2">
                <Row label="Država rođenja" value={emp.drzava_rodjenja} />
              </div>
            </div>
          </Card>

          {/* Rad stranca */}
          <Card title="Rad stranca" icon="💼">
            {!emp.poslodavac && !emp.radno_mjesto ? (
              <p className="text-sm" style={{ color: '#CBD5E1' }}>Nema podataka o zaposlenju.</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-6">
                <Row label="Poslodavac / firma" value={emp.poslodavac} />
                <Row label="Radno mjesto" value={emp.radno_mjesto} />
              </div>
            )}
          </Card>

          {/* Godišnji & Bolovanje */}
          <Card title="Godišnji odmor & Bolovanje" icon="📅">
            {vacations.length === 0 && sickLeaves.length === 0 ? (
              <p className="text-sm" style={{ color: '#CBD5E1' }}>Nema unesenih odsutnosti.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {vacations.map((v: any, i: number) => {
                  const active = v.datum_od <= today && v.datum_do >= today
                  return (
                    <div key={v.id || i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                      style={{ background: active ? '#F0FDF4' : '#F8FAFC', border: `1px solid ${active ? '#BBF7D0' : '#E2E8F0'}` }}>
                      <span>🌴</span>
                      <div className="flex-1">
                        <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Godišnji odmor</span>
                        {v.napomena && <span className="text-xs ml-2" style={{ color: '#64748B' }}>{v.napomena}</span>}
                      </div>
                      <span className="text-xs" style={{ color: '#64748B' }}>{formatDate(v.datum_od)} – {formatDate(v.datum_do)}</span>
                      {active && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#DCFCE7', color: '#16A34A' }}>Aktivno</span>}
                    </div>
                  )
                })}
                {sickLeaves.map((s: any, i: number) => {
                  const active = s.datum_od <= today && s.datum_do >= today
                  return (
                    <div key={s.id || i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                      style={{ background: active ? '#FEFCE8' : '#F8FAFC', border: `1px solid ${active ? '#FEF08A' : '#E2E8F0'}` }}>
                      <span>🏥</span>
                      <div className="flex-1">
                        <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Bolovanje</span>
                        {s.napomena && <span className="text-xs ml-2" style={{ color: '#64748B' }}>{s.napomena}</span>}
                      </div>
                      <span className="text-xs" style={{ color: '#64748B' }}>{formatDate(s.datum_od)} – {formatDate(s.datum_do)}</span>
                      {active && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#FEF9C3', color: '#CA8A04' }}>Aktivno</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-4">

          {/* Radna dozvola */}
          <Card title="Radna dozvola" icon="📋">
            {!radnaDozvola ? (
              <p className="text-sm" style={{ color: '#CBD5E1' }}>Nije unesena.</p>
            ) : (
              <>
                <div className="flex flex-col mb-3">
                  <span className="text-xs mb-1" style={{ color: '#94A3B8' }}>Datum isteka</span>
                  {rdBadge ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium w-fit" style={{ background: rdBadge.bg, color: rdBadge.color }}>{rdBadge.label}</span>
                  ) : <span className="text-sm" style={{ color: '#CBD5E1' }}>—</span>}
                </div>
                {radnaDozvola.file_url && (
                  <a href={radnaDozvola.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mt-1"
                    style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    📄 {fileNameFromUrl(radnaDozvola.file_url)}
                  </a>
                )}
              </>
            )}
          </Card>

          {/* Liječnički pregled */}
          <Card title="Liječnički pregled" icon="🏥">
            {!lijecnicki ? (
              <p className="text-sm" style={{ color: '#CBD5E1' }}>Nije unesen.</p>
            ) : (
              <>
                <div className="flex flex-col mb-3">
                  <span className="text-xs mb-1" style={{ color: '#94A3B8' }}>Datum isteka</span>
                  {ljBadge ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium w-fit" style={{ background: ljBadge.bg, color: ljBadge.color }}>{ljBadge.label}</span>
                  ) : <span className="text-sm" style={{ color: '#CBD5E1' }}>—</span>}
                </div>
                {lijecnicki.file_url && (
                  <a href={lijecnicki.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mt-1"
                    style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    📄 {fileNameFromUrl(lijecnicki.file_url)}
                  </a>
                )}
              </>
            )}
          </Card>

        </div>
      </div>
    </div>
  )
}
