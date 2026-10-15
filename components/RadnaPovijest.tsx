'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { VRSTA_BADGE, type VrstaZaposlenja } from '@/lib/zaposlenje'
import { STATUS_PRIJAVE, statusPrijave, type Angazman, type Faza, type StatusPrijave } from '@/lib/radna-povijest'

// Kretanje radnika: gdje je bio, gdje je sada, gdje ide.
// "Sada" dolazi iz samog radnika (employees), "prije" i "sljedeće" iz employee_assignments.

type Trenutno = {
  company_id: string | null
  poslodavac: string | null
  vrsta_zaposlenja: VrstaZaposlenja | null
  radno_mjesto: string | null
  ustupanje_od: string | null
  ustupanje_do: string | null
}

type Draft = {
  company_id: string
  poslodavac: string
  vrsta_zaposlenja: string
  radno_mjesto: string
  datum_od: string
  datum_do: string
  status_prijave: StatusPrijave
  datum_prijave: string
  napomena: string
}

const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm'
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }
const today = () => new Date().toISOString().slice(0, 10)
const RUCNO = '__rucno__'

function fmt(d: string | null | undefined) {
  if (!d) return null
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}.`
}

function toDraft(a?: Angazman | null): Draft {
  return {
    company_id: a?.company_id || '',
    poslodavac: a?.poslodavac || '',
    vrsta_zaposlenja: a?.vrsta_zaposlenja || '',
    radno_mjesto: a?.radno_mjesto || '',
    datum_od: a?.datum_od || '',
    datum_do: a?.datum_do || '',
    status_prijave: a?.status_prijave || 'priprema',
    datum_prijave: a?.datum_prijave || '',
    napomena: a?.napomena || '',
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{children}</label>
}

function VrstaPill({ vrsta }: { vrsta: string | null }) {
  const b = vrsta ? VRSTA_BADGE[vrsta as VrstaZaposlenja] : null
  return b ? <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: b.bg, color: b.color }}>{b.label}</span> : null
}

function TvrtkaNaziv({ id, naziv }: { id: string | null; naziv: string | null }) {
  if (id) return <Link href={`/tvrtke/${id}`} className="text-sm font-semibold hover:underline" style={{ color: '#1E293B' }}>{naziv || 'Tvrtka'}</Link>
  return <span className="text-sm font-semibold" style={{ color: '#1E293B' }}>{naziv || 'Bez tvrtke'}</span>
}

function AngazmanForm({ faza, initial, companies, saving, error, onSave, onCancel, onDelete }: {
  faza: Faza
  initial: Draft
  companies: { id: string; naziv: string }[]
  saving: boolean
  error: string
  onSave: (d: Draft) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [d, setD] = useState<Draft>(initial)
  const [rucno, setRucno] = useState(!initial.company_id && !!initial.poslodavac)
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value })

  function odaberiTvrtku(v: string) {
    if (v === RUCNO) { setRucno(true); setD({ ...d, company_id: '', poslodavac: '' }); return }
    setRucno(false)
    setD({ ...d, company_id: v, poslodavac: companies.find(c => c.id === v)?.naziv || '' })
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(d) }} className="p-3 rounded-lg flex flex-col gap-3"
      style={{ background: '#F8FAFC', border: '1px solid #BFDBFE' }}>
      <p className="text-xs font-semibold" style={{ color: '#475569' }}>
        {faza === 'planirano' ? '→ Planirani prelazak' : '↩ Prijašnje zaposlenje'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Tvrtka</Label>
          <select className={inputCls} style={inputStyle} value={rucno ? RUCNO : d.company_id} onChange={e => odaberiTvrtku(e.target.value)}>
            <option value="">Odaberi tvrtku...</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.naziv}</option>)}
            <option value={RUCNO}>Druga tvrtka (upiši naziv)</option>
          </select>
          {rucno && (
            <input autoFocus className={`${inputCls} mt-2`} style={inputStyle} placeholder="Naziv tvrtke" value={d.poslodavac} onChange={set('poslodavac')} />
          )}
        </div>
        <div>
          <Label>Radno mjesto</Label>
          <input className={inputCls} style={inputStyle} value={d.radno_mjesto} onChange={set('radno_mjesto')} />
        </div>
      </div>

      <div>
        <Label>Vrsta zaposlenja</Label>
        <div className="flex flex-wrap gap-1.5">
          {(['ustupanje', 'izravno'] as VrstaZaposlenja[]).map(v => {
            const b = VRSTA_BADGE[v]; const on = d.vrsta_zaposlenja === v
            return (
              <button key={v} type="button" onClick={() => setD({ ...d, vrsta_zaposlenja: on ? '' : v })}
                className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
                style={on ? { background: b.bg, color: b.color, boxShadow: `0 0 0 1.5px ${b.color}` } : { background: 'white', color: '#64748B', border: '1px solid #E2E8F0' }}>
                {b.label}
              </button>
            )
          })}
        </div>
      </div>

      {faza === 'planirano' ? (
        <>
          <div>
            <Label>Status prijave</Label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_PRIJAVE.map(s => {
                const on = d.status_prijave === s.value
                return (
                  <button key={s.value} type="button" onClick={() => setD({ ...d, status_prijave: s.value })}
                    className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
                    style={on ? { background: s.bg, color: s.color, boxShadow: `0 0 0 1.5px ${s.color}` } : { background: 'white', color: '#64748B', border: '1px solid #E2E8F0' }}>
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Zahtjev predan</Label><input type="date" className={inputCls} style={inputStyle} value={d.datum_prijave} onChange={set('datum_prijave')} /></div>
            <div><Label>Planirani početak</Label><input type="date" className={inputCls} style={inputStyle} value={d.datum_od} onChange={set('datum_od')} /></div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>Od</Label><input type="date" className={inputCls} style={inputStyle} value={d.datum_od} onChange={set('datum_od')} /></div>
          <div><Label>Do</Label><input type="date" className={inputCls} style={inputStyle} value={d.datum_do} onChange={set('datum_do')} /></div>
        </div>
      )}

      <div>
        <Label>Napomena</Label>
        <input className={inputCls} style={inputStyle} value={d.napomena} onChange={set('napomena')}
          placeholder={faza === 'planirano' ? 'npr. čeka se nova dozvola za boravak i rad' : 'npr. razlog odlaska'} />
      </div>

      {error && <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>}
      <div className="flex gap-2 items-center">
        {onDelete && (
          <button type="button" onClick={onDelete} className="btn-danger text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{ background: '#FEF2F2', color: '#DC2626' }}>Obriši</button>
        )}
        <div className="flex-1" />
        <button type="button" onClick={onCancel} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
        <button type="submit" disabled={saving || !d.poslodavac.trim()} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ background: saving || !d.poslodavac.trim() ? '#93C5FD' : '#2563EB' }}>{saving ? 'Sprema...' : '✓ Spremi'}</button>
      </div>
    </form>
  )
}

// Jedna točka na vremenskoj crti
function Stavka({ dot, label, children, last }: { dot: string; label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 14 }}>
        <div className="w-3 h-3 rounded-full mt-1" style={{ background: dot, boxShadow: `0 0 0 3px ${dot}22` }} />
        {!last && <div className="flex-1 w-px mt-1" style={{ background: '#E2E8F0' }} />}
      </div>
      <div className="flex-1 min-w-0 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94A3B8', letterSpacing: '0.04em' }}>{label}</p>
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </div>
  )
}

export default function RadnaPovijest({ employeeId, trenutno, povijest, onChanged }: {
  employeeId: string
  trenutno: Trenutno
  povijest: Angazman[]
  onChanged: () => void
}) {
  const [items, setItems] = useState<Angazman[]>(povijest)
  const [companies, setCompanies] = useState<{ id: string; naziv: string }[]>([])
  const [editing, setEditing] = useState<{ faza: Faza; id: string | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [prelazakId, setPrelazakId] = useState<string | null>(null)
  const [prelazakDatum, setPrelazakDatum] = useState('')

  useEffect(() => { setItems(povijest) }, [povijest])
  useEffect(() => {
    if (!editing || companies.length > 0) return
    fetch('/api/companies').then(r => (r.ok ? r.json() : [])).then(data =>
      setCompanies((Array.isArray(data) ? data : []).map((c: { id: string; naziv: string }) => ({ id: c.id, naziv: c.naziv }))))
  }, [editing, companies.length])

  const planovi = items.filter(a => a.faza === 'planirano')
    .sort((a, b) => (a.datum_od || '9999').localeCompare(b.datum_od || '9999'))
  const prijasnji = items.filter(a => a.faza === 'prijasnje')
    .sort((a, b) => (b.datum_do || b.datum_od || '').localeCompare(a.datum_do || a.datum_od || ''))
  const imaTrenutno = !!(trenutno.poslodavac || trenutno.company_id)
  // Početak trenutnog posla: datum ustupanja ili kraj zadnjeg prijašnjeg
  const trenutnoOd = trenutno.ustupanje_od || prijasnji.find(p => p.datum_do)?.datum_do || null

  function otvori(faza: Faza, id: string | null = null) {
    setEditing({ faza, id }); setError(''); setPrelazakId(null)
  }

  async function spremi(d: Draft) {
    if (!editing) return
    setSaving(true); setError('')
    const body = { ...d, faza: editing.faza, employee_id: employeeId }
    const res = await fetch(editing.id ? `/api/radna-povijest/${editing.id}` : '/api/radna-povijest', {
      method: editing.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      setItems(prev => editing.id ? prev.map(x => (x.id === editing.id ? data : x)) : [...prev, data])
      setEditing(null)
    } else setError(data.error || 'Spremanje nije uspjelo.')
    setSaving(false)
  }

  async function obrisi(a: Angazman) {
    if (!confirm(a.faza === 'planirano' ? `Otkazati planirani prelazak u ${a.poslodavac}?` : `Obrisati zapis "${a.poslodavac}" iz povijesti?`)) return
    const res = await fetch(`/api/radna-povijest/${a.id}`, { method: 'DELETE' })
    if (res.ok) { setItems(prev => prev.filter(x => x.id !== a.id)); setEditing(null) }
    else setError('Brisanje nije uspjelo.')
  }

  async function obaviPrelazak(a: Angazman) {
    setSaving(true); setError('')
    const res = await fetch(`/api/radna-povijest/${a.id}/prelazak`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datum: prelazakDatum || today() }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) { setPrelazakId(null); onChanged() }
    else setError(data.error || 'Prelazak nije uspio.')
  }

  const editFor = (a: Angazman) => editing?.id === a.id
  const forma = (faza: Faza, a?: Angazman) => (
    <AngazmanForm key={a?.id || `novo-${faza}`} faza={faza} initial={toDraft(a)} companies={companies} saving={saving} error={error}
      onSave={spremi} onCancel={() => setEditing(null)} onDelete={a ? () => obrisi(a) : undefined} />
  )

  return (
    <div>
      {/* SLJEDEĆE */}
      {(planovi.length > 0 || editing?.faza === 'planirano') && (
        <Stavka dot="#2563EB" label="Sljedeće">
          {planovi.map(a => editFor(a) ? forma('planirano', a) : (
            <div key={a.id} className="p-3 rounded-lg" style={{ background: '#F8FBFF', border: '1.5px dashed #93C5FD' }}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ color: '#2563EB' }}>→</span>
                    <TvrtkaNaziv id={a.company_id} naziv={a.poslodavac} />
                    <VrstaPill vrsta={a.vrsta_zaposlenja} />
                    {(() => { const s = statusPrijave(a.status_prijave); return <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span> })()}
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                    {[a.radno_mjesto, a.datum_prijave && `zahtjev predan ${fmt(a.datum_prijave)}`, a.datum_od ? `početak ${fmt(a.datum_od)}` : 'početak još nije poznat']
                      .filter(Boolean).join(' · ')}
                  </p>
                  {a.napomena && <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{a.napomena}</p>}
                </div>
                <button onClick={() => otvori('planirano', a.id)} className="text-xs flex-shrink-0" style={{ color: '#64748B' }}>Uredi</button>
              </div>

              {prelazakId === a.id ? (
                <div className="mt-3 pt-3 flex flex-col gap-2" style={{ borderTop: '1px solid #DBEAFE' }}>
                  <p className="text-xs" style={{ color: '#475569' }}>
                    {imaTrenutno ? <>Trenutni posao (<b>{trenutno.poslodavac}</b>) ide u prijašnje, a </> : null}
                    <b>{a.poslodavac}</b> postaje trenutni poslodavac.
                  </p>
                  <div className="flex items-end gap-2 flex-wrap">
                    <div>
                      <Label>Dan prelaska</Label>
                      <input type="date" className="px-3 py-1.5 rounded-lg border text-sm" style={inputStyle} value={prelazakDatum} onChange={e => setPrelazakDatum(e.target.value)} />
                    </div>
                    <div className="flex-1" />
                    <button onClick={() => setPrelazakId(null)} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
                    <button onClick={() => obaviPrelazak(a)} disabled={saving} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                      style={{ background: saving ? '#93C5FD' : '#16A34A' }}>{saving ? 'Sprema...' : '✓ Potvrdi prelazak'}</button>
                  </div>
                  {error && <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>}
                </div>
              ) : (
                <button onClick={() => { setPrelazakId(a.id); setPrelazakDatum(a.datum_od || today()); setEditing(null); setError('') }}
                  className="mt-2 text-xs font-medium px-2.5 py-1 rounded-lg" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                  ✓ Prelazak obavljen
                </button>
              )}
            </div>
          ))}
          {editing?.faza === 'planirano' && !editing.id && forma('planirano')}
        </Stavka>
      )}

      {/* SADA */}
      <Stavka dot="#16A34A" label="Sada" last={prijasnji.length === 0 && editing?.faza !== 'prijasnje'}>
        {imaTrenutno ? (
          <div className="p-3 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <TvrtkaNaziv id={trenutno.company_id} naziv={trenutno.poslodavac} />
              <VrstaPill vrsta={trenutno.vrsta_zaposlenja} />
            </div>
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>
              {[trenutno.radno_mjesto, trenutnoOd ? `od ${fmt(trenutnoOd)}` : null, trenutno.ustupanje_do ? `do ${fmt(trenutno.ustupanje_do)}` : null].filter(Boolean).join(' · ') || 'Datum početka nije unesen'}
            </p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#CBD5E1' }}>Trenutno nije zaposlen.</p>
        )}
      </Stavka>

      {/* PRIJE */}
      {(prijasnji.length > 0 || editing?.faza === 'prijasnje') && (
        <Stavka dot="#94A3B8" label="Prije" last>
          {editing?.faza === 'prijasnje' && !editing.id && forma('prijasnje')}
          {prijasnji.map(a => editFor(a) ? forma('prijasnje', a) : (
            <div key={a.id} className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <TvrtkaNaziv id={a.company_id} naziv={a.poslodavac} />
                  <VrstaPill vrsta={a.vrsta_zaposlenja} />
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                  {[a.radno_mjesto, (a.datum_od || a.datum_do) ? `${fmt(a.datum_od) || '?'} – ${fmt(a.datum_do) || '?'}` : null].filter(Boolean).join(' · ') || '—'}
                </p>
                {a.napomena && <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{a.napomena}</p>}
              </div>
              <button onClick={() => otvori('prijasnje', a.id)} className="text-xs flex-shrink-0" style={{ color: '#64748B' }}>Uredi</button>
            </div>
          ))}
        </Stavka>
      )}

      {!editing && (
        <div className="flex flex-wrap gap-3 pl-[26px]">
          <button onClick={() => otvori('planirano')} className="btn-link text-xs font-medium" style={{ color: '#2563EB' }}>+ Planiraj prelazak</button>
          <button onClick={() => otvori('prijasnje')} className="btn-link text-xs font-medium" style={{ color: '#64748B' }}>+ Dodaj prijašnje zaposlenje</button>
        </div>
      )}
    </div>
  )
}
