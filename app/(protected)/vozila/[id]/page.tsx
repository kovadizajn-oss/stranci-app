'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import VoziloForm, { Tablica, voziloDraft, type VoziloDraft } from '@/components/VoziloForm'
import {
  STATUS_VOZILA, VRSTE_DOGADJAJA, formatDatum, istek, vozacIme, vrstaDogadjaja,
  type Dogadjaj, type Vozac, type Vozilo,
} from '@/lib/vozila'

type Employee = { id: string; ime: string; prezime: string }
type ZapisDraft = { vrsta: string; datum: string; opis: string; kilometraza: string; trosak: string; servis: string; novi_istek: string }

const card = { boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }
const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm'
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }
const today = () => new Date().toISOString().slice(0, 10)
const prazanZapis = (vrsta = 'servis'): ZapisDraft => ({ vrsta, datum: today(), opis: '', kilometraza: '', trosak: '', servis: '', novi_istek: '' })
const euro = (n: number) => n.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_')
}

function L({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{children}</label>
}

function Podatak({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs mb-0.5" style={{ color: '#94A3B8' }}>{label}</span>
      <span className="text-sm" style={{ color: value ? '#1E293B' : '#CBD5E1', fontFamily: mono ? 'ui-monospace, monospace' : undefined }}>{value || '—'}</span>
    </div>
  )
}

/** Obrazac za novi / uređeni zapis o servisu, popravku, tehničkom... */
function ZapisForm({ initial, uredivanje, saving, error, onSave, onCancel, onDelete }: {
  initial: ZapisDraft
  uredivanje: boolean
  saving: boolean
  error: string
  onSave: (d: ZapisDraft, file: File | null) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [d, setD] = useState<ZapisDraft>(initial)
  const [file, setFile] = useState<File | null>(null)
  const set = (k: keyof ZapisDraft) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value })
  const vrsta = vrstaDogadjaja(d.vrsta)

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(d, file) }} className="p-3 rounded-xl flex flex-col gap-3" style={{ background: '#F8FAFC', border: '1px solid #BFDBFE' }}>
      <div className="flex flex-wrap gap-1.5">
        {VRSTE_DOGADJAJA.map(v => {
          const on = d.vrsta === v.value
          return (
            <button key={v.value} type="button" onClick={() => setD({ ...d, vrsta: v.value })} className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
              style={on ? { background: v.bg, color: v.color, boxShadow: `0 0 0 1.5px ${v.color}` } : { background: 'white', color: '#64748B', border: '1px solid #E2E8F0' }}>
              {v.ikona} {v.label}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div><L>Datum</L><input type="date" className={inputCls} style={inputStyle} value={d.datum} onChange={set('datum')} /></div>
        <div><L>Kilometraža</L><input inputMode="numeric" className={inputCls} style={inputStyle} placeholder="km" value={d.kilometraza} onChange={set('kilometraza')} /></div>
        <div><L>Trošak (€)</L><input inputMode="decimal" className={inputCls} style={inputStyle} placeholder="0,00" value={d.trosak} onChange={set('trosak')} /></div>
        <div><L>Servis / radionica</L><input className={inputCls} style={inputStyle} value={d.servis} onChange={set('servis')} /></div>
      </div>
      <div><L>Opis</L><input className={inputCls} style={inputStyle} placeholder="npr. Zamjena ulja i filtera" value={d.opis} onChange={set('opis')} /></div>
      {vrsta.istek && !uredivanje && (
        <div className="p-2.5 rounded-lg" style={{ background: 'white', border: '1px solid #E2E8F0' }}>
          <L>{vrsta.ikona} Novi datum — {vrsta.label.toLowerCase()} vrijedi do</L>
          <input type="date" className={inputCls} style={inputStyle} value={d.novi_istek} onChange={set('novi_istek')} />
          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Ako upišeš datum, odmah se ažurira i rok na vozilu.</p>
        </div>
      )}
      <div>
        {file ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <span className="text-xs truncate" style={{ color: '#16A34A' }}>✓ {file.name}</span>
            <button type="button" onClick={() => setFile(null)} className="text-xs ml-auto" style={{ color: '#94A3B8' }}>✕</button>
          </div>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg text-xs w-fit" style={{ border: '1.5px dashed #CBD5E1', background: 'white', color: '#64748B' }}>
            📎 Priloži račun / zapisnik {uredivanje ? '(zamjenjuje postojeći)' : ''}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
        )}
      </div>
      {error && <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>}
      <div className="flex gap-2 items-center">
        {onDelete && <button type="button" onClick={onDelete} className="btn-danger text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{ background: '#FEF2F2', color: '#DC2626' }}>Obriši</button>}
        <div className="flex-1" />
        <button type="button" onClick={onCancel} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
        <button type="submit" disabled={saving} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: saving ? '#93C5FD' : '#2563EB' }}>
          {saving ? 'Sprema...' : '✓ Spremi zapis'}
        </button>
      </div>
    </form>
  )
}

export default function VoziloDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [vozilo, setVozilo] = useState<Vozilo | null>(null)
  const [vozaci, setVozaci] = useState<Vozac[]>([])
  const [zapisi, setZapisi] = useState<Dogadjaj[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [noviVozac, setNoviVozac] = useState('')
  const [rucnoIme, setRucnoIme] = useState('')
  const [dodajeVozaca, setDodajeVozaca] = useState(false)

  const [zapisForm, setZapisForm] = useState<{ id: string | null; initial: ZapisDraft } | null>(null)
  const [zapisSaving, setZapisSaving] = useState(false)
  const [zapisError, setZapisError] = useState('')
  const [filterVrsta, setFilterVrsta] = useState('')

  useEffect(() => {
    fetch(`/api/vozila/${id}`).then(async r => {
      if (!r.ok) { router.push('/vozila'); return }
      const d = await r.json()
      setVozilo(d.vozilo); setVozaci(d.vozaci); setZapisi(d.dogadjaji); setEmployees(d.employees)
      setLoading(false)
    })
  }, [id, router])

  async function spremiVozilo(d: VoziloDraft) {
    setSaving(true); setError('')
    const res = await fetch(`/api/vozila/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Spremanje nije uspjelo.'); return }
    setVozilo(json); setEditing(false)
  }

  async function obrisiVozilo() {
    if (!confirm('Obrisati ovo vozilo zajedno s vozačima i povijesti servisa? Ako je samo prodano ili odjavljeno, bolje mu promijeni status.')) return
    const res = await fetch(`/api/vozila/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/vozila')
  }

  async function dodajVozaca() {
    const body = noviVozac === '__rucno__' ? { vehicle_id: id, ime: rucnoIme } : { vehicle_id: id, employee_id: noviVozac }
    const res = await fetch('/api/vozila-vozaci', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { alert(json.error || 'Dodavanje nije uspjelo.'); return }
    setVozaci(prev => [...prev, json]); setNoviVozac(''); setRucnoIme(''); setDodajeVozaca(false)
  }

  async function makniVozaca(v: Vozac) {
    if (!confirm(`Maknuti vozača ${vozacIme(v)}?`)) return
    const res = await fetch(`/api/vozila-vozaci/${v.id}`, { method: 'DELETE' })
    if (res.ok) setVozaci(prev => prev.filter(x => x.id !== v.id))
  }

  async function spremiZapis(d: ZapisDraft, file: File | null) {
    if (!zapisForm) return
    setZapisSaving(true); setZapisError('')
    try {
      let racun_url: string | undefined
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('path', `vozila/${id}/${Date.now()}_${safeFileName(file.name)}`)
        const up = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!up.ok) throw new Error(`Učitavanje "${file.name}" nije uspjelo.`)
        racun_url = (await up.json()).url
      }
      if (zapisForm.id) {
        const stari = zapisi.find(z => z.id === zapisForm.id)
        const res = await fetch(`/api/vozila-dogadjaji/${zapisForm.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...d, racun_url: racun_url ?? stari?.racun_url ?? null }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Spremanje nije uspjelo.')
        setZapisi(prev => prev.map(z => (z.id === json.id ? json : z)))
      } else {
        const res = await fetch('/api/vozila-dogadjaji', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...d, vehicle_id: id, racun_url }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Spremanje nije uspjelo.')
        setZapisi(prev => [json.dogadjaj, ...prev])
        if (json.vozilo) setVozilo(json.vozilo)
      }
      setZapisForm(null)
    } catch (e) {
      setZapisError(e instanceof Error ? e.message : 'Greška.')
    }
    setZapisSaving(false)
  }

  async function obrisiZapis(z: Dogadjaj) {
    if (!confirm('Obrisati ovaj zapis?')) return
    const res = await fetch(`/api/vozila-dogadjaji/${z.id}`, { method: 'DELETE' })
    if (res.ok) { setZapisi(prev => prev.filter(x => x.id !== z.id)); setZapisForm(null) }
  }

  if (loading || !vozilo) return <div className="p-8 text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>

  const st = STATUS_VOZILA[vozilo.status] || STATUS_VOZILA.aktivno
  const neaktivno = vozilo.status === 'odjavljeno' || vozilo.status === 'prodano'
  const sortirani = [...zapisi].sort((a, b) => (b.datum || '').localeCompare(a.datum || '') || (b.created_at || '').localeCompare(a.created_at || ''))
  const prikazani = sortirani.filter(z => !filterVrsta || z.vrsta === filterVrsta)
  const zadnji = (vrsta: string) => sortirani.find(z => z.vrsta === vrsta && z.datum)?.datum || null
  const ukupnoTrosak = zapisi.reduce((s, z) => s + (Number(z.trosak) || 0), 0)
  const dostupni = employees.filter(e => !vozaci.some(v => v.employee_id === e.id))

  const rokovi = [
    { naziv: 'Registracija', ikona: '📋', datum: vozilo.istek_registracije, vrsta: 'registracija', extra: null as string | null },
    { naziv: 'Tehnički pregled', ikona: '✅', datum: vozilo.istek_tehnickog, vrsta: 'tehnicki', extra: null },
    { naziv: 'Osiguranje', ikona: '🛡️', datum: vozilo.istek_osiguranja, vrsta: 'osiguranje', extra: [vozilo.osiguravatelj, vozilo.broj_police && `polica ${vozilo.broj_police}`].filter(Boolean).join(' · ') || null },
  ]

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <Link href="/vozila" className="text-sm" style={{ color: '#64748B' }}>← Vozni park</Link>

      {/* Zaglavlje */}
      <div className="flex items-start justify-between mt-4 mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: neaktivno ? '#F1F5F9' : '#EFF6FF' }}>
            <span style={{ fontSize: 26 }}>{/transporter|transit|kombi|sprinter|master|ducato|crafter|vivaro|trafic/i.test(vozilo.model || '') ? '🚐' : '🚗'}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.3px' }}>{vozilo.marka} {vozilo.model}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Tablica oznaka={vozilo.registracija} />
              <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: st.bg, color: st.color }}>{st.label}</span>
              {vozilo.lokacija && <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#F1F5F9', color: '#475569' }}>📍 {vozilo.lokacija}</span>}
            </div>
          </div>
        </div>
        {!editing && (
          <button onClick={() => { setEditing(true); setError('') }} className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: '#2563EB' }}>
            ✏️ Uredi
          </button>
        )}
      </div>

      {editing && (
        <VoziloForm title="Uredi vozilo" initial={voziloDraft(vozilo)} saving={saving} error={error}
          onSave={spremiVozilo} onCancel={() => setEditing(false)} onDelete={obrisiVozilo} />
      )}

      {/* Rokovi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {rokovi.map(r => {
          const s = istek(r.datum)
          return (
            <div key={r.naziv} className="bg-white rounded-2xl p-4" style={{ ...card, borderLeft: neaktivno ? undefined : `4px solid ${s.rang === 3 ? '#E2E8F0' : s.color}` }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase" style={{ color: '#94A3B8', letterSpacing: '0.04em' }}>{r.ikona} {r.naziv}</p>
                {!neaktivno && (
                  <button onClick={() => { setZapisForm({ id: null, initial: prazanZapis(r.vrsta) }); setZapisError('') }}
                    className="text-xs font-medium" style={{ color: '#2563EB' }} title="Upiši obnovu">Obnovi</button>
                )}
              </div>
              <p className="text-lg font-semibold mt-1" style={{ color: r.datum ? '#1E293B' : '#CBD5E1' }}>{r.datum ? formatDatum(r.datum) : 'Nije uneseno'}</p>
              {!neaktivno && r.datum && (
                <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1" style={{ background: s.bg, color: s.color }}>{s.label}</span>
              )}
              {r.extra && <p className="text-xs mt-1.5 truncate" style={{ color: '#64748B' }}>{r.extra}</p>}
            </div>
          )
        })}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] items-start">
        {/* Povijest servisa i popravaka */}
        <div className="bg-white rounded-2xl" style={card}>
          <div className="flex items-center justify-between px-4 py-3 gap-2 flex-wrap" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>🔧 Servisi, popravci i pregledi ({zapisi.length})</p>
            {!zapisForm && (
              <button onClick={() => { setZapisForm({ id: null, initial: prazanZapis() }); setZapisError('') }}
                className="btn-primary text-xs px-3 py-1.5 rounded-lg font-medium text-white" style={{ background: '#2563EB' }}>+ Dodaj zapis</button>
            )}
          </div>
          <div className="px-4 py-2.5 flex gap-4 flex-wrap text-xs" style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B' }}>
            <span>Zadnji servis: <b style={{ color: '#1E293B' }}>{formatDatum(zadnji('servis')) || '—'}</b></span>
            <span>Zadnji popravak: <b style={{ color: '#1E293B' }}>{formatDatum(zadnji('popravak')) || '—'}</b></span>
            {ukupnoTrosak > 0 && <span>Ukupno troškova: <b style={{ color: '#1E293B' }}>{euro(ukupnoTrosak)}</b></span>}
          </div>
          <div className="p-3 flex flex-col gap-2">
            {zapisForm && !zapisForm.id && (
              <ZapisForm key={`novi-${zapisForm.initial.vrsta}`} initial={zapisForm.initial} uredivanje={false} saving={zapisSaving} error={zapisError}
                onSave={spremiZapis} onCancel={() => setZapisForm(null)} />
            )}
            {zapisi.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1">
                {[{ value: '', label: 'Sve', ikona: '', color: '#2563EB', bg: '#EFF6FF' }, ...VRSTE_DOGADJAJA.filter(v => zapisi.some(z => z.vrsta === v.value))].map(v => {
                  const on = filterVrsta === v.value
                  return (
                    <button key={v.value || 'sve'} onClick={() => setFilterVrsta(v.value)} className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={on ? { background: v.bg, color: v.color, boxShadow: `0 0 0 1.5px ${v.color}` } : { background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>
                      {v.ikona} {v.label}
                    </button>
                  )
                })}
              </div>
            )}
            {zapisi.length === 0 && !zapisForm && (
              <p className="text-sm text-center py-6" style={{ color: '#94A3B8' }}>Još nema zapisa. Dodaj servis, popravak ili pregled.</p>
            )}
            {prikazani.map(z => zapisForm?.id === z.id ? (
              <ZapisForm key={z.id} uredivanje saving={zapisSaving} error={zapisError}
                initial={{ vrsta: z.vrsta, datum: z.datum || '', opis: z.opis || '', kilometraza: z.kilometraza?.toString() || '', trosak: z.trosak?.toString() || '', servis: z.servis || '', novi_istek: '' }}
                onSave={spremiZapis} onCancel={() => setZapisForm(null)} onDelete={() => obrisiZapis(z)} />
            ) : (() => {
              const v = vrstaDogadjaja(z.vrsta)
              const sitno = [z.kilometraza ? `${z.kilometraza.toLocaleString('hr-HR')} km` : null, z.servis, z.trosak ? euro(Number(z.trosak)) : null].filter(Boolean).join(' · ')
              return (
                <div key={z.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm" style={{ background: v.bg }}>{v.ikona}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: v.bg, color: v.color }}>{v.label}</span>
                      <span className="text-xs font-medium" style={{ color: '#475569' }}>{formatDatum(z.datum) || 'bez datuma'}</span>
                    </div>
                    {z.opis && <p className="text-sm mt-1" style={{ color: '#1E293B' }}>{z.opis}</p>}
                    {sitno && <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{sitno}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {z.racun_url && (
                      <a href={z.racun_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>📄 Račun</a>
                    )}
                    <button onClick={() => { setZapisForm({ id: z.id, initial: prazanZapis() }); setZapisError('') }} className="text-xs" style={{ color: '#64748B' }}>Uredi</button>
                  </div>
                </div>
              )
            })())}
          </div>
        </div>

        {/* Desno: podaci + vozači */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-4" style={card}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#1E293B' }}>🚗 Podaci o vozilu</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Podatak label="Broj šasije (VIN)" value={vozilo.broj_sasije} mono /></div>
              <Podatak label="Godište" value={vozilo.godina} />
              <Podatak label="Kilometraža" value={vozilo.kilometraza ? `${vozilo.kilometraza.toLocaleString('hr-HR')} km` : null} />
              <Podatak label="Lokacija" value={vozilo.lokacija} />
              <Podatak label="Osiguravatelj" value={vozilo.osiguravatelj} />
              {vozilo.napomena && <div className="col-span-2"><Podatak label="Napomena" value={vozilo.napomena} /></div>}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4" style={card}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>👤 Vozači ({vozaci.length})</p>
              {!dodajeVozaca && <button onClick={() => setDodajeVozaca(true)} className="btn-link text-xs font-medium" style={{ color: '#2563EB' }}>+ Dodaj</button>}
            </div>
            <div className="flex flex-col gap-1.5">
              {vozaci.length === 0 && !dodajeVozaca && <p className="text-xs" style={{ color: '#94A3B8' }}>Nema dodijeljenih vozača.</p>}
              {vozaci.map(v => (
                <div key={v.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    {vozacIme(v)[0]?.toUpperCase()}
                  </div>
                  {v.employee_id
                    ? <Link href={`/zaposlenici/${v.employee_id}/pregled`} className="text-sm flex-1 min-w-0 truncate hover:underline" style={{ color: '#1E293B' }}>{vozacIme(v)}</Link>
                    : <span className="text-sm flex-1 min-w-0 truncate" style={{ color: '#1E293B' }}>{vozacIme(v)}</span>}
                  <button onClick={() => makniVozaca(v)} className="text-xs flex-shrink-0" style={{ color: '#94A3B8' }} title="Makni">✕</button>
                </div>
              ))}
              {dodajeVozaca && (
                <div className="flex flex-col gap-2 p-2.5 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #BFDBFE' }}>
                  <select className={inputCls} style={inputStyle} value={noviVozac} onChange={e => setNoviVozac(e.target.value)}>
                    <option value="">Odaberi radnika...</option>
                    {dostupni.map(e => <option key={e.id} value={e.id}>{e.prezime} {e.ime}</option>)}
                    <option value="__rucno__">Netko drugi (upiši ime)</option>
                  </select>
                  {noviVozac === '__rucno__' && (
                    <input autoFocus className={inputCls} style={inputStyle} placeholder="Ime vozača" value={rucnoIme} onChange={e => setRucnoIme(e.target.value)} />
                  )}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setDodajeVozaca(false); setNoviVozac(''); setRucnoIme('') }} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
                    <button onClick={dodajVozaca} disabled={!noviVozac || (noviVozac === '__rucno__' && !rucnoIme.trim())}
                      className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                      style={{ background: !noviVozac || (noviVozac === '__rucno__' && !rucnoIme.trim()) ? '#93C5FD' : '#2563EB' }}>✓ Dodaj</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
