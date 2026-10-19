'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  KATEGORIJA_TAG, OSOBNI_TYPES, PRATECI_TYPES, dokumentStatus, formatDatum, kategorijaZaNaziv, zamijenjeniIds,
  type Dokument, type Kategorija,
} from '@/lib/dokumenti'

// Svi dokumenti radnika na jednom mjestu: poredani po hitnosti, s otvaranjem, uređivanjem i dodavanjem.
// Sprema se odmah (bez glavnog "Spremi promjene"). Koriste ga Uredi radnika i Pregled radnika.

/** Dokument koji je pronašlo AI skeniranje — čeka potvrdu korisnika. */
export type DokumentNacrt = {
  key: string
  naziv: string
  kategorija: Kategorija
  datum_izdavanja: string
  datum_isteka: string
  file: File | null
}

type Forma = {
  tip: string // jedna od poznatih vrsta ili OSTALO
  naziv: string // samo za "Ostalo"
  kategorija: Kategorija
  datum_izdavanja: string
  datum_isteka: string
}

const OSTALO = '__ostalo__'
const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm'
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }
const card = { boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_')
}

function imeDatoteke(url: string) {
  try {
    const dijelovi = decodeURIComponent(url).split('/')
    return dijelovi[dijelovi.length - 1].replace(/^(doc|att|photo)_\d+_/, '')
  } catch { return 'Datoteka' }
}

function uFormu(d: { naziv: string | null; kategorija: Kategorija | null; datum_izdavanja: string | null; datum_isteka: string | null } | null): Forma {
  const naziv = d?.naziv || ''
  const poznata = kategorijaZaNaziv(naziv)
  return {
    tip: !naziv ? '' : poznata ? naziv : OSTALO,
    naziv: poznata ? '' : naziv,
    kategorija: poznata || d?.kategorija || 'prateci',
    datum_izdavanja: d?.datum_izdavanja || '',
    datum_isteka: d?.datum_isteka || '',
  }
}

function Tag({ t }: { t: { label: string; color: string; bg: string } }) {
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: t.bg, color: t.color }}>{t.label}</span>
}

function TipPill({ label, on, kat, onClick }: { label: string; on: boolean; kat: Kategorija | null; onClick: () => void }) {
  const t = kat ? KATEGORIJA_TAG[kat] : { color: '#475569', bg: '#F1F5F9' }
  return (
    <button type="button" onClick={onClick} className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
      style={on ? { background: t.bg, color: t.color, boxShadow: `0 0 0 1.5px ${t.color}` } : { background: 'white', color: '#64748B', border: '1px solid #E2E8F0' }}>
      {label}
    </button>
  )
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{children}</label>
}

/** Obrazac za novi / uređeni dokument. */
function DokumentForma({ initial, fileUrl, initialFile, naslov, istaknuto, saving, error, odustaniLabel, onSave, onCancel, onDelete }: {
  initial: Forma
  fileUrl?: string | null
  initialFile?: File | null
  naslov: string
  istaknuto?: boolean
  saving: boolean
  error: string
  odustaniLabel?: string
  onSave: (f: Forma, file: File | null, ukloniDatoteku: boolean) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [f, setF] = useState<Forma>(initial)
  const [file, setFile] = useState<File | null>(initialFile || null)
  const [ukloni, setUkloni] = useState(false)
  const [greska, setGreska] = useState('')

  function odaberi(tip: string) {
    if (tip === OSTALO) setF({ ...f, tip })
    else setF({ ...f, tip, kategorija: kategorijaZaNaziv(tip) || f.kategorija })
  }

  function spremi(e: React.FormEvent) {
    e.preventDefault()
    if (!f.tip) { setGreska('Odaberi vrstu dokumenta.'); return }
    if (f.tip === OSTALO && !f.naziv.trim()) { setGreska('Upiši naziv dokumenta.'); return }
    setGreska('')
    onSave(f, file, ukloni)
  }

  const postojeca = fileUrl && !ukloni ? fileUrl : null
  const fileInput = (
    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { setFile(e.target.files?.[0] || null); e.target.value = '' }} />
  )

  return (
    <form onSubmit={spremi} className="p-3 rounded-xl flex flex-col gap-3"
      style={istaknuto ? { background: '#F8FBFF', border: '1.5px dashed #93C5FD' } : { background: '#F8FAFC', border: '1px solid #BFDBFE' }}>
      <p className="text-xs font-semibold" style={{ color: istaknuto ? '#2563EB' : '#475569' }}>{naslov}</p>

      <div className="flex flex-col gap-2">
        <div>
          <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>Osobni</p>
          <div className="flex flex-wrap gap-1.5">
            {OSOBNI_TYPES.map(t => <TipPill key={t} label={t} on={f.tip === t} kat="osobni" onClick={() => odaberi(t)} />)}
          </div>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>Prateći</p>
          <div className="flex flex-wrap gap-1.5">
            {PRATECI_TYPES.map(t => <TipPill key={t} label={t} on={f.tip === t} kat="prateci" onClick={() => odaberi(t)} />)}
            <TipPill label="Ostalo…" on={f.tip === OSTALO} kat={null} onClick={() => odaberi(OSTALO)} />
          </div>
        </div>
        {f.tip === OSTALO && (
          <div className="flex flex-col gap-2 p-2.5 rounded-lg" style={{ background: 'white', border: '1px solid #E2E8F0' }}>
            <input autoFocus className={inputCls} style={inputStyle} placeholder="Naziv dokumenta" value={f.naziv} onChange={e => setF({ ...f, naziv: e.target.value })} />
            <div className="flex items-center gap-1.5">
              <span className="text-xs mr-1" style={{ color: '#64748B' }}>Skupina:</span>
              {(['osobni', 'prateci'] as Kategorija[]).map(k => (
                <TipPill key={k} label={KATEGORIJA_TAG[k].label} on={f.kategorija === k} kat={k} onClick={() => setF({ ...f, kategorija: k })} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div><Lbl>Datum izdavanja</Lbl><input type="date" className={inputCls} style={inputStyle} value={f.datum_izdavanja} onChange={e => setF({ ...f, datum_izdavanja: e.target.value })} /></div>
        <div><Lbl>Vrijedi do</Lbl><input type="date" className={inputCls} style={inputStyle} value={f.datum_isteka} onChange={e => setF({ ...f, datum_isteka: e.target.value })} /></div>
      </div>

      <div>
        <Lbl>Preslika</Lbl>
        {file ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <span className="text-xs truncate" style={{ color: '#16A34A' }}>✓ {file.name}</span>
            <button type="button" onClick={() => setFile(null)} className="text-xs ml-auto" style={{ color: '#94A3B8' }}>✕</button>
          </div>
        ) : postojeca ? (
          <div className="flex items-center gap-2">
            <a href={postojeca} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-0"
              style={{ background: 'white', border: '1px solid #E2E8F0' }}>
              <span className="text-xs">📄</span>
              <span className="text-xs truncate" style={{ color: '#2563EB' }}>{imeDatoteke(postojeca)}</span>
            </a>
            <label className="cursor-pointer text-xs px-2.5 py-2 rounded-lg flex-shrink-0" style={{ background: '#F1F5F9', color: '#374151' }}>Zamijeni{fileInput}</label>
            <button type="button" onClick={() => setUkloni(true)} className="text-xs flex-shrink-0" style={{ color: '#94A3B8' }} title="Ukloni presliku">✕</button>
          </div>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg text-xs"
            style={{ border: '1.5px dashed #CBD5E1', background: 'white', color: '#64748B' }}>
            📎 Priloži presliku <span style={{ color: '#94A3B8' }}>(PDF, JPG, PNG)</span>{fileInput}
          </label>
        )}
      </div>

      {(greska || error) && <p className="text-xs" style={{ color: '#DC2626' }}>{greska || error}</p>}
      <div className="flex gap-2 items-center">
        {onDelete && (
          <button type="button" onClick={onDelete} className="btn-danger text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{ background: '#FEF2F2', color: '#DC2626' }}>Obriši</button>
        )}
        <div className="flex-1" />
        <button type="button" onClick={onCancel} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: '#F1F5F9', color: '#374151' }}>
          {odustaniLabel || 'Odustani'}
        </button>
        <button type="submit" disabled={saving} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ background: saving ? '#93C5FD' : '#2563EB' }}>{saving ? 'Sprema...' : '✓ Spremi dokument'}</button>
      </div>
    </form>
  )
}

export default function RadnikDokumenti({ employeeId, docs, onDocsChange, drafts = [], onDraftsChange, sticky, urediHref }: {
  employeeId: string
  docs: Dokument[]
  onDocsChange: (docs: Dokument[]) => void
  drafts?: DokumentNacrt[]
  onDraftsChange?: (d: DokumentNacrt[]) => void
  sticky?: boolean
  /** Samo pregled (npr. Pregled radnika): bez dodavanja/uređivanja, gumb Uredi vodi na ovu adresu. */
  urediHref?: string
}) {
  const samoPregled = !!urediHref
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<{ key: string; msg: string } | null>(null)
  const [prilazemId, setPrilazemId] = useState<string | null>(null)
  const [showStari, setShowStari] = useState(false)

  async function upload(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('path', `${employeeId}/doc_${Date.now()}_${safeFileName(file.name)}`)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error(`Učitavanje "${file.name}" nije uspjelo.`)
    return (await res.json()).url as string
  }

  /** Sprema novi (postojeci = null) ili postojeći dokument. Vraća true ako je uspjelo. */
  async function spremi(key: string, postojeci: Dokument | null, f: Forma, file: File | null, ukloni: boolean) {
    setSavingKey(key); setError(null)
    try {
      let fileUrl = ukloni ? null : (postojeci?.file_url || null)
      if (file) fileUrl = await upload(file)
      const payload = {
        employee_id: employeeId,
        naziv: f.tip === OSTALO ? f.naziv.trim() : f.tip,
        kategorija: f.tip === OSTALO ? f.kategorija : (kategorijaZaNaziv(f.tip) || f.kategorija),
        datum_izdavanja: f.datum_izdavanja || null,
        datum_isteka: f.datum_isteka || null,
        file_url: fileUrl,
      }
      const res = await fetch(postojeci ? `/api/documents/${postojeci.id}` : '/api/documents', {
        method: postojeci ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Spremanje dokumenta nije uspjelo.')
      const spremljen: Dokument = { ...(postojeci || {}), ...payload, id: postojeci ? postojeci.id : data.id }
      onDocsChange(postojeci ? docs.map(d => (d.id === postojeci.id ? spremljen : d)) : [...docs, spremljen])
      setSavingKey(null)
      return true
    } catch (err) {
      setError({ key, msg: err instanceof Error ? err.message : 'Greška.' })
      setSavingKey(null)
      return false
    }
  }

  async function obrisi(d: Dokument) {
    if (!confirm(`Obrisati dokument "${d.naziv || 'Dokument'}"?`)) return
    const res = await fetch(`/api/documents/${d.id}`, { method: 'DELETE' })
    if (res.ok) { onDocsChange(docs.filter(x => x.id !== d.id)); setEditId(null) }
    else setError({ key: d.id, msg: 'Brisanje nije uspjelo.' })
  }

  /** Brzo prilaganje preslike dokumentu koji je nema. */
  async function prilozi(d: Dokument, file: File | null) {
    if (!file) return
    setPrilazemId(d.id); setError(null)
    try {
      const url = await upload(file)
      const res = await fetch(`/api/documents/${d.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...d, file_url: url }),
      })
      if (!res.ok) throw new Error('Spremanje preslike nije uspjelo.')
      onDocsChange(docs.map(x => (x.id === d.id ? { ...x, file_url: url } : x)))
    } catch (err) {
      setError({ key: d.id, msg: err instanceof Error ? err.message : 'Greška.' })
    }
    setPrilazemId(null)
  }

  // Aktualni po hitnosti; stari (postoji noviji iste vrste) zasebno
  const zamijenjeni = zamijenjeniIds(docs)
  const aktualni = docs.filter(d => !zamijenjeni.has(d.id)).sort((a, b) => {
    const sa = dokumentStatus(a.datum_isteka), sb = dokumentStatus(b.datum_isteka)
    return sa.rang - sb.rang || sa.dana - sb.dana || (a.naziv || '').localeCompare(b.naziv || '', 'hr')
  })
  const stari = docs.filter(d => zamijenjeni.has(d.id))
    .sort((a, b) => (b.datum_isteka || '').localeCompare(a.datum_isteka || ''))
  const errFor = (k: string) => (error?.key === k ? error.msg : '')

  function kartica(d: Dokument, star = false) {
    if (editId === d.id) {
      return (
        <DokumentForma key={d.id} naslov="Uredi dokument" initial={uFormu(d)} fileUrl={d.file_url}
          saving={savingKey === d.id} error={errFor(d.id)}
          onSave={async (f, file, ukloni) => { if (await spremi(d.id, d, f, file, ukloni)) setEditId(null) }}
          onCancel={() => { setEditId(null); setError(null) }} onDelete={() => obrisi(d)} />
      )
    }
    const s = dokumentStatus(d.datum_isteka)
    const kat = d.kategorija ? KATEGORIJA_TAG[d.kategorija] : null
    const datumi = [d.datum_izdavanja && `izdano ${formatDatum(d.datum_izdavanja)}`, d.datum_isteka && `vrijedi do ${formatDatum(d.datum_isteka)}`].filter(Boolean).join(' · ')
    return (
      <div key={d.id} className="p-3 rounded-xl" style={{
        background: s.rang === 0 && !star ? '#FFFBFB' : '#F8FAFC',
        border: `1px solid ${s.rang === 0 && !star ? '#FECACA' : '#E2E8F0'}`,
        opacity: star ? 0.75 : 1,
      }}>
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm" style={{ background: kat?.bg || '#F1F5F9' }}>
            {d.file_url && !/\.pdf($|\?)/i.test(d.file_url) ? '🖼️' : '📄'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: '#1E293B' }}>{d.naziv || 'Dokument'}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {kat && <Tag t={kat} />}
              {star ? <Tag t={{ label: 'Zamijenjen novijim', color: '#64748B', bg: '#F1F5F9' }} /> : <Tag t={s} />}
            </div>
            {datumi && <p className="text-xs mt-1.5" style={{ color: '#64748B' }}>{datumi}</p>}
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {d.file_url && (
              <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs px-2.5 py-1 rounded-lg font-medium"
                style={{ background: '#EFF6FF', color: '#2563EB' }}>Otvori</a>
            )}
            {!samoPregled && (
              <button type="button" onClick={() => { setEditId(d.id); setAdding(false); setError(null) }} className="text-xs" style={{ color: '#64748B' }}>Uredi</button>
            )}
          </div>
        </div>
        {!d.file_url && !star && samoPregled && (
          <p className="mt-2 text-xs px-2.5 py-1.5 rounded-lg font-medium w-fit" style={{ background: '#FEF9C3', color: '#A16207' }}>⚠ Nema preslike</p>
        )}
        {!d.file_url && !star && !samoPregled && (
          <label className={`mt-2 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium cursor-pointer w-fit ${prilazemId === d.id ? 'opacity-60 pointer-events-none' : ''}`}
            style={{ background: '#FEF9C3', color: '#A16207' }}>
            {prilazemId === d.id ? 'Učitavanje...' : '⚠ Nema preslike — priloži'}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { prilozi(d, e.target.files?.[0] || null); e.target.value = '' }} />
          </label>
        )}
        {errFor(d.id) && <p className="text-xs mt-2" style={{ color: '#DC2626' }}>{errFor(d.id)}</p>}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl flex flex-col ${sticky ? 'lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]' : ''}`} style={card}>
      <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>📁 Dokumenti ({aktualni.length})</p>
        {samoPregled ? (
          <Link href={urediHref} className="btn-secondary text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>
            ✏️ Uredi
          </Link>
        ) : !adding && (
          <button type="button" onClick={() => { setAdding(true); setEditId(null); setError(null) }}
            className="btn-primary text-xs px-3 py-1.5 rounded-lg font-medium text-white" style={{ background: '#2563EB' }}>
            + Dodaj dokument
          </button>
        )}
      </div>

      <div className={`p-3 flex flex-col gap-2 ${sticky ? 'lg:overflow-y-auto' : ''}`}>
        {drafts.map(n => (
          <DokumentForma key={n.key} naslov="🤖 Novo iz AI skeniranja — provjeri i spremi" istaknuto
            initial={uFormu(n)} initialFile={n.file} saving={savingKey === n.key} error={errFor(n.key)} odustaniLabel="Odbaci"
            onSave={async (f, file, ukloni) => { if (await spremi(n.key, null, f, file, ukloni)) onDraftsChange?.(drafts.filter(x => x.key !== n.key)) }}
            onCancel={() => onDraftsChange?.(drafts.filter(x => x.key !== n.key))} />
        ))}

        {adding && (
          <DokumentForma key="novi" naslov="Novi dokument" initial={uFormu(null)} saving={savingKey === 'novi'} error={errFor('novi')}
            onSave={async (f, file, ukloni) => { if (await spremi('novi', null, f, file, ukloni)) setAdding(false) }}
            onCancel={() => { setAdding(false); setError(null) }} />
        )}

        {aktualni.length === 0 && !adding && drafts.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: '#94A3B8' }}>
            Još nema dokumenata.<br />{samoPregled ? 'Dodaju se na stranici Uredi.' : 'Klikni „+ Dodaj dokument” ili koristi AI skeniranje.'}
          </p>
        )}

        {aktualni.map(d => kartica(d))}

        {stari.length > 0 && (
          <div className="mt-1">
            <button type="button" onClick={() => setShowStari(s => !s)} className="text-xs font-medium px-1 py-1" style={{ color: '#64748B' }}>
              {showStari ? '▾' : '▸'} Stari dokumenti ({stari.length})
            </button>
            {showStari && <div className="flex flex-col gap-2 mt-1">{stari.map(d => kartica(d, true))}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
