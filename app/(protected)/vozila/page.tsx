'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import VoziloForm, { Tablica, voziloDraft, type VoziloDraft } from '@/components/VoziloForm'
import FilterDropdown, { type FilterOption } from '@/components/FilterDropdown'
import { STATUS_VOZILA, istek, najhitnijiIstek, vozacIme, formatDatum, type StatusVozila, type Vozac, type Vozilo } from '@/lib/vozila'

type Row = Vozilo & { vozaci: Vozac[]; zadnji_servis: string | null; zadnji_popravak: string | null }

const card = { boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }
const STATUS_OPTS: FilterOption[] = (Object.keys(STATUS_VOZILA) as StatusVozila[]).map(s => ({ value: s, label: STATUS_VOZILA[s].label, color: STATUS_VOZILA[s].color, bg: STATUS_VOZILA[s].bg }))
const neaktivno = (s: StatusVozila) => s === 'odjavljeno' || s === 'prodano'

function Istek({ naziv, datum, iskljuceno }: { naziv: string; datum: string | null; iskljuceno: boolean }) {
  const s = istek(datum)
  return (
    <div className="flex flex-col items-start">
      <span className="text-[10px] uppercase font-semibold" style={{ color: '#94A3B8', letterSpacing: '0.04em' }}>{naziv}</span>
      {iskljuceno ? <span className="text-xs" style={{ color: '#CBD5E1' }}>—</span>
        : <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: s.bg, color: s.color }}>{s.kratko}</span>}
    </div>
  )
}

export default function VozilaPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLokacija, setFilterLokacija] = useState('')

  useEffect(() => {
    fetch('/api/vozila').then(r => (r.ok ? r.json() : [])).then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  async function handleAdd(d: VoziloDraft) {
    setSaving(true); setError('')
    const res = await fetch('/api/vozila', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Spremanje nije uspjelo.'); return }
    setRows(prev => [...prev, { ...json, vozaci: [], zadnji_servis: null, zadnji_popravak: null }])
    setAdding(false)
  }

  const lokacije = Array.from(new Set(rows.map(r => r.lokacija).filter((x): x is string => !!x))).sort((a, b) => a.localeCompare(b, 'hr'))
  const q = search.toLowerCase().trim()
  const filtered = rows
    .filter(r => !filterStatus || r.status === filterStatus)
    .filter(r => !filterLokacija || r.lokacija === filterLokacija)
    .filter(r => !q || [r.marka, r.model, r.registracija, r.broj_sasije, r.lokacija, ...r.vozaci.map(vozacIme)].some(v => (v || '').toLowerCase().includes(q)))
    // Aktivna vozila prva, unutar njih po najhitnijem isteku
    .sort((a, b) => Number(neaktivno(a.status)) - Number(neaktivno(b.status))
      || (najhitnijiIstek(a)?.dana ?? Infinity) - (najhitnijiIstek(b)?.dana ?? Infinity)
      || a.marka.localeCompare(b.marka, 'hr'))

  const aktivnih = rows.filter(r => !neaktivno(r.status)).length
  const upozorenja = rows.filter(r => { const h = najhitnijiIstek(r); return h && h.rang <= 1 }).length

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.3px' }}>Vozni park</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            {rows.length > 0
              ? `${rows.length} ${rows.length === 1 ? 'vozilo' : 'vozila'} · ${aktivnih} u upotrebi${upozorenja ? ` · ⚠️ ${upozorenja} s isteklim ili skorim rokom` : ''}`
              : 'Vozila, vozači, registracija, tehnički, osiguranje i servisi.'}
          </p>
        </div>
        {!adding && (
          <button onClick={() => { setAdding(true); setError('') }}
            className="btn-primary px-4 py-2.5 rounded-lg text-sm font-medium text-white flex-shrink-0" style={{ background: '#2563EB' }}>
            + Novo vozilo
          </button>
        )}
      </div>

      {adding && <VoziloForm title="Novo vozilo" initial={voziloDraft()} saving={saving} error={error} onSave={handleAdd} onCancel={() => setAdding(false)} />}

      {!adding && rows.length > 0 && (
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94A3B8' }}>🔍</span>
            <input className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm" style={{ borderColor: '#E2E8F0', color: '#1E293B', background: 'white' }}
              placeholder="Pretraži po marki, registraciji, šasiji, vozaču..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <FilterDropdown label="Status" value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTS} />
            {lokacije.length > 1 && <FilterDropdown label="Lokacija" value={filterLokacija} onChange={setFilterLokacija} options={lokacije.map(l => ({ value: l }))} />}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl overflow-hidden" style={card}>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Još nema vozila. Dodajte prvo klikom na „+ Novo vozilo”.</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Nema vozila koja odgovaraju pretrazi.</div>
        ) : filtered.map((r, i) => {
          const st = STATUS_VOZILA[r.status] || STATUS_VOZILA.aktivno
          const off = neaktivno(r.status)
          const detalji = [r.lokacija, r.vozaci.length ? `👤 ${r.vozaci.map(vozacIme).join(', ')}` : null,
            r.zadnji_servis ? `servis ${formatDatum(r.zadnji_servis)}` : null, r.zadnji_popravak ? `popravak ${formatDatum(r.zadnji_popravak)}` : null]
            .filter(Boolean).join(' · ')
          return (
            <Link key={r.id} href={`/vozila/${r.id}`} className="row-link flex items-center gap-4 px-5 py-4 flex-wrap md:flex-nowrap"
              style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none', opacity: off ? 0.65 : 1 }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: off ? '#F1F5F9' : '#EFF6FF' }}>
                <span style={{ fontSize: 18 }}>{/transporter|transit|kombi|sprinter|master|ducato|crafter|vivaro|trafic/i.test(r.model || '') ? '🚐' : '🚗'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>{r.marka} {r.model}</p>
                  <Tablica oznaka={r.registracija} mala />
                  {r.status !== 'aktivno' && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.color }}>{st.label}</span>}
                </div>
                <p className="text-xs mt-1 truncate" style={{ color: '#64748B' }}>{detalji || '—'}</p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <Istek naziv="Registr." datum={r.istek_registracije} iskljuceno={off} />
                <Istek naziv="Tehnički" datum={r.istek_tehnickog} iskljuceno={off} />
                <Istek naziv="Osigur." datum={r.istek_osiguranja} iskljuceno={off} />
              </div>
              <span className="text-sm ml-1 flex-shrink-0 hidden md:block" style={{ color: '#CBD5E1' }}>→</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
