'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const DOC_TYPE_LABELS: Record<string, string> = {
  putovnica: 'Putovnica',
  dozvola_boravka: 'Dozvola boravka',
  radna_dozvola: 'Radna dozvola',
  oib: 'OIB',
  zdravstveno: 'Zdravstveno osiguranje',
  ugovor_o_radu: 'Ugovor o radu',
  other: 'Ostalo',
}

const ATT_TYPE_LABELS: Record<string, string> = {
  ugovor_o_radu: 'Ugovor o radu',
  potvrda_o_zaposlenju: 'Potvrda o zaposlenju',
  potvrda_o_prijavi: 'Potvrda o prijavi boravišta',
  najamninski_ugovor: 'Najamninski ugovor',
  other: 'Ostalo',
}

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
  const d = new Date(dateStr)
  return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}.`
}

function fileNameFromUrl(url: string) {
  try {
    const parts = decodeURIComponent(url).split('/')
    const raw = parts[parts.length - 1]
    return raw.replace(/^(doc|att|photo)_\d+_/, '')
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
  const [documents, setDocuments] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [addresses, setAddresses] = useState<any[]>([])
  const [vacations, setVacations] = useState<any[]>([])
  const [sickLeaves, setSickLeaves] = useState<any[]>([])
  const [workHistory, setWorkHistory] = useState<any[]>([])

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const { data: employee } = await supabase.from('employees').select('*').eq('id', id).single()
      if (!employee) return
      setEmp(employee)

      const [{ data: docs }, { data: atts }, { data: addrs }, { data: vacs }, { data: sick }, { data: wh }] = await Promise.all([
        supabase.from('documents').select('*').eq('employee_id', id).order('datum_isteka', { ascending: true }),
        supabase.from('attachments').select('*').eq('employee_id', id),
        supabase.from('addresses').select('*').eq('employee_id', id).order('datum_od', { ascending: false }),
        supabase.from('vacations').select('*').eq('employee_id', id).order('datum_od', { ascending: false }),
        supabase.from('sick_leaves').select('*').eq('employee_id', id).order('datum_od', { ascending: false }),
        supabase.from('work_history').select('*').eq('employee_id', id).order('datum_od', { ascending: false }),
      ])

      setDocuments(docs || [])
      setAttachments(atts || [])
      setAddresses(addrs || [])
      setVacations(vacs || [])
      setSickLeaves(sick || [])
      setWorkHistory(wh || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="p-8 text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
  if (!emp) return <div className="p-8 text-sm" style={{ color: '#EF4444' }}>Zaposlenik nije pronađen.</div>

  const currentAddress = addresses.find((a: any) => a.is_current)
  const pastAddresses = addresses.filter((a: any) => !a.is_current)

  const onVacation = vacations.some((v: any) => v.datum_od <= today && v.datum_do >= today)
  const onSickLeave = sickLeaves.some((s: any) => s.datum_od <= today && s.datum_do >= today)

  const smjestajBadge = emp.datum_isteka_smjestaja ? expiryBadge(emp.datum_isteka_smjestaja) : null

  return (
    <div className="p-8" style={{ maxWidth: 1100 }}>
      {/* Back */}
      <Link href="/zaposlenici" className="text-sm" style={{ color: '#64748B' }}>← Zaposlenici</Link>

      {/* Header */}
      <div className="flex items-start justify-between mt-4 mb-8">
        <div className="flex items-center gap-5">
          {/* Avatar / Photo */}
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-2xl"
            style={{ background: '#EFF6FF', color: '#2563EB', border: '3px solid #E2E8F0' }}>
            {emp.photo_url
              ? <img src={emp.photo_url} alt="Foto" className="w-full h-full object-cover" />
              : `${emp.ime?.[0] || ''}${emp.prezime?.[0] || ''}`
            }
          </div>

          {/* Name + badges */}
          <div>
            <h1 className="text-3xl font-semibold mb-2" style={{ color: '#1E293B' }}>
              {emp.ime} {emp.prezime}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {emp.drzava_drzavljanstva && (
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#F1F5F9', color: '#475569' }}>
                  🌍 {emp.drzava_drzavljanstva}
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
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                  🌴 Na godišnjem
                </span>
              )}
              {onSickLeave && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#FEF9C3', color: '#CA8A04' }}>
                  🏥 Na bolovanju
                </span>
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
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 380px' }}>

        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">

          {/* Osobni podaci */}
          <Card title="Osobni podaci" icon="👤">
            <div className="grid grid-cols-2 gap-x-6">
              <Row label="Ime" value={emp.ime} />
              <Row label="Prezime" value={emp.prezime} />
              <Row label="Datum rođenja" value={formatDate(emp.datum_rodjenja)} />
              <Row label="Mjesto rođenja" value={emp.mjesto_rodjenja} />
              <Row label="Država rođenja" value={emp.drzava_rodjenja} />
              <Row label="Država državljanstva" value={emp.drzava_drzavljanstva} />
              <div className="col-span-2">
                <Row label="Adresa prebivališta" value={emp.adresa_prebivalista} />
              </div>
            </div>
          </Card>

          {/* Kontakt */}
          <Card title="Kontakt podaci" icon="✉️">
            <div className="grid grid-cols-2 gap-x-6">
              <Row label="Email" value={emp.email} />
              <Row label="Telefon" value={emp.telefon} />
            </div>
          </Card>

          {/* Rad */}
          <Card title="Rad stranca" icon="💼">
            {workHistory.length === 0 && !emp.poslodavac ? (
              <p className="text-sm" style={{ color: '#CBD5E1' }}>Nema podataka o zaposlenju.</p>
            ) : (() => {
              // Most recent job is first (ordered by datum_od DESC)
              const latestJob = workHistory[0] || null
              const isActive = latestJob?.is_current && !latestJob?.datum_do
              const pastJobs = workHistory.slice(1)

              return (
                <>
                  <div className="grid grid-cols-2 gap-x-6 mb-3">
                    <Row label="Poslodavac / firma" value={latestJob?.poslodavac || emp.poslodavac} />
                    <Row label="Radno mjesto" value={latestJob?.radno_mjesto || emp.radno_mjesto} />
                    {latestJob?.datum_od && (
                      <Row label="Zaposleni od" value={formatDate(latestJob.datum_od)} />
                    )}
                    {latestJob?.datum_do && (
                      <div className="flex flex-col mb-3">
                        <span className="text-xs mb-0.5" style={{ color: '#94A3B8' }}>Zaposleni do</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium w-fit"
                          style={{ background: '#FEE2E2', color: '#DC2626' }}>
                          {formatDate(latestJob.datum_do)}
                        </span>
                      </div>
                    )}
                  </div>
                  {!isActive && latestJob && (
                    <div className="mb-3">
                      <span className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ background: '#F1F5F9', color: '#64748B' }}>
                        Bez aktivnog zaposlenja
                      </span>
                    </div>
                  )}
                  {pastJobs.length > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2E8F0' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: '#64748B' }}>Radna povijest</p>
                      {pastJobs.map((job: any, i: number) => (
                        <div key={job.id || i} className="text-xs mb-1.5" style={{ color: '#475569' }}>
                          <span className="font-medium">{job.poslodavac}</span>
                          {job.radno_mjesto && <span style={{ color: '#94A3B8' }}> · {job.radno_mjesto}</span>}
                          {(job.datum_od || job.datum_do) && (
                            <span style={{ color: '#94A3B8' }}> · {formatDate(job.datum_od)} – {formatDate(job.datum_do)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}
          </Card>

          {/* Boravak */}
          <Card title="Boravak stranca" icon="🏠">
            <div className="mb-3">
              <span className="text-xs mb-0.5 block" style={{ color: '#94A3B8' }}>Trenutna adresa boravišta</span>
              <span className="text-sm" style={{ color: currentAddress ? '#1E293B' : '#CBD5E1' }}>
                {currentAddress?.adresa || '—'}
              </span>
              {currentAddress?.datum_od && (
                <span className="text-xs ml-2" style={{ color: '#94A3B8' }}>od {formatDate(currentAddress.datum_od)}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-6 mb-3">
              <div>
                <span className="text-xs mb-0.5 block" style={{ color: '#94A3B8' }}>Datum isteka smještaja</span>
                {emp.datum_isteka_smjestaja ? (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: smjestajBadge?.bg, color: smjestajBadge?.color }}>
                    {smjestajBadge?.label}
                  </span>
                ) : <span className="text-sm" style={{ color: '#CBD5E1' }}>—</span>}
              </div>
              <Row label="Datum ulaska u EGP" value={formatDate(emp.datum_ulaska_egp)} />
            </div>
            <Row label="Mjesto ulaska u EGP" value={emp.mjesto_ulaska_egp} />

            {pastAddresses.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #E2E8F0' }}>
                <p className="text-xs font-medium mb-2" style={{ color: '#64748B' }}>Prethodne adrese</p>
                {pastAddresses.map((addr: any, i: number) => (
                  <div key={addr.id || i} className="text-xs mb-1.5" style={{ color: '#475569' }}>
                    {addr.adresa}
                    {(addr.datum_od || addr.datum_do) && (
                      <span style={{ color: '#94A3B8' }}> · {formatDate(addr.datum_od)} – {formatDate(addr.datum_do)}</span>
                    )}
                  </div>
                ))}
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
                      <span className="text-xs" style={{ color: '#64748B' }}>
                        {formatDate(v.datum_od)} – {formatDate(v.datum_do)}
                      </span>
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
                      <span className="text-xs" style={{ color: '#64748B' }}>
                        {formatDate(s.datum_od)} – {formatDate(s.datum_do)}
                      </span>
                      {active && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#FEF9C3', color: '#CA8A04' }}>Aktivno</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4">

          {/* Osobni dokumenti */}
          <Card title="Osobni dokumenti" icon="🪪">
            {documents.length === 0 ? (
              <p className="text-sm" style={{ color: '#CBD5E1' }}>Nema unesenih dokumenata.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {documents.map((doc: any, i: number) => {
                  const badge = expiryBadge(doc.datum_isteka)
                  return (
                    <div key={doc.id || i} className="p-3 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium" style={{ color: '#1E293B' }}>
                          {DOC_TYPE_LABELS[doc.tip_dokumenta] || doc.tip_dokumenta || '—'}
                        </p>
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                            style={{ background: '#EFF6FF', color: '#2563EB' }}>
                            📄 Otvori
                          </a>
                        )}
                      </div>
                      {doc.broj_dokumenta && (
                        <p className="text-xs mb-1.5" style={{ color: '#64748B' }}>Br. {doc.broj_dokumenta}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: '#94A3B8' }}>
                          {doc.datum_izdavanja ? `Izdano: ${formatDate(doc.datum_izdavanja)}` : ''}
                        </span>
                        {badge && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Prateći dokumenti */}
          <Card title="Prateći dokumenti" icon="📎">
            {attachments.length === 0 ? (
              <p className="text-sm" style={{ color: '#CBD5E1' }}>Nema unesenih dokumenata.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {attachments.map((att: any, i: number) => {
                  const badge = expiryBadge(att.datum_isteka)
                  return (
                    <div key={att.id || i} className="p-3 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium" style={{ color: '#1E293B' }}>
                          {ATT_TYPE_LABELS[att.tip_dokumenta] || att.tip_dokumenta || '—'}
                        </p>
                        {att.file_url && (
                          <a href={att.file_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                            style={{ background: '#EFF6FF', color: '#2563EB' }}>
                            📄 Otvori
                          </a>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs" style={{ color: '#94A3B8' }}>
                          {att.datum_izdavanja ? `Izdano: ${formatDate(att.datum_izdavanja)}` : ''}
                        </span>
                        {badge && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  )
}
