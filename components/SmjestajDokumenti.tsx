'use client'

import { useEffect, useState } from 'react'
import { DOKUMENT_VRSTE, dokumentVrsta, formatDatum } from '@/lib/smjestaj'

// Dokumenti smještaja: izvadak iz zemljišne knjige, posjedovni list, ugovor o najmu...
// Datoteke idu u spremište preko /api/upload, zapisi u tablicu accommodation_documents.

export type SmjestajDokument = {
  id: string
  accommodation_id: string
  vrsta: string
  naziv: string | null
  datum: string | null
  napomena: string | null
  url: string
  putanja: string | null
  file_name: string | null
  created_at: string
}

type Draft = { vrsta: string; naziv: string; datum: string; napomena: string }

const card = { boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }
const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm'
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }
const emptyDraft = (): Draft => ({ vrsta: 'zk_izvadak', naziv: '', datum: '', napomena: '' })

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_')
}

function Pill({ vrsta }: { vrsta: string }) {
  const v = dokumentVrsta(vrsta)
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: v.bg, color: v.color }}>{v.label}</span>
}

function DokumentFields({ d, setD }: { d: Draft; setD: (d: Draft) => void }) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#374151' }}>Vrsta dokumenta</label>
        <div className="flex flex-wrap gap-1.5">
          {DOKUMENT_VRSTE.map(v => {
            const on = d.vrsta === v.value
            return (
              <button key={v.value} type="button" onClick={() => setD({ ...d, vrsta: v.value })}
                className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
                style={on
                  ? { background: v.bg, color: v.color, boxShadow: `0 0 0 1.5px ${v.color}` }
                  : { background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>
                {v.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Naziv <span style={{ color: '#94A3B8' }}>(neobavezno)</span></label>
          <input className={inputCls} style={inputStyle} placeholder={dokumentVrsta(d.vrsta).label} value={d.naziv}
            onChange={e => setD({ ...d, naziv: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Datum izdavanja / stanje na dan</label>
          <input type="date" className={inputCls} style={inputStyle} value={d.datum} onChange={e => setD({ ...d, datum: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Napomena</label>
        <input className={inputCls} style={inputStyle} placeholder="npr. k.č. 5321, ZK uložak 6029, k.o. Velika Gorica" value={d.napomena}
          onChange={e => setD({ ...d, napomena: e.target.value })} />
      </div>
    </>
  )
}

export default function SmjestajDokumenti({ accommodationId }: { accommodationId: string }) {
  const [docs, setDocs] = useState<SmjestajDokument[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [editId, setEditId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/smjestaj-dokumenti?accommodation_id=${accommodationId}`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => { setDocs(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [accommodationId])

  function closeAdd() { setAdding(false); setFile(null); setDraft(emptyDraft()); setError('') }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Odaberi datoteku.'); return }
    setSaving(true); setError('')
    try {
      const putanja = `smjestaj/${accommodationId}/${Date.now()}_${safeFileName(file.name)}`
      const fd = new FormData()
      fd.append('file', file)
      fd.append('path', putanja)
      const up = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!up.ok) throw new Error(`Učitavanje "${file.name}" nije uspjelo.`)
      const { url } = await up.json()
      const res = await fetch('/api/smjestaj-dokumenti', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, accommodation_id: accommodationId, url, putanja, file_name: file.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Spremanje nije uspjelo.')
      setDocs(prev => [data, ...prev])
      closeAdd()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška.')
    }
    setSaving(false)
  }

  function startEdit(d: SmjestajDokument) {
    setEditId(d.id); setError('')
    setEditDraft({ vrsta: d.vrsta, naziv: d.naziv || '', datum: d.datum || '', napomena: d.napomena || '' })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    setSaving(true); setError('')
    const res = await fetch(`/api/smjestaj-dokumenti/${editId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editDraft),
    })
    const data = await res.json()
    if (res.ok) { setDocs(prev => prev.map(x => (x.id === editId ? data : x))); setEditId(null) }
    else setError(data.error || 'Spremanje nije uspjelo.')
    setSaving(false)
  }

  async function handleDelete(d: SmjestajDokument) {
    if (!confirm(`Obrisati dokument "${d.naziv || dokumentVrsta(d.vrsta).label}"? Datoteka će se trajno obrisati.`)) return
    const res = await fetch(`/api/smjestaj-dokumenti/${d.id}`, { method: 'DELETE' })
    if (res.ok) { setDocs(prev => prev.filter(x => x.id !== d.id)); setEditId(null) }
    else setError('Brisanje nije uspjelo.')
  }

  // Redoslijed: po vrsti (ZK izvadak prvi), unutar vrste najnoviji prvi
  const red = (v: string) => DOKUMENT_VRSTE.findIndex(x => x.value === v)
  const sorted = [...docs].sort((a, b) =>
    red(a.vrsta) - red(b.vrsta) || (b.datum || b.created_at).localeCompare(a.datum || a.created_at))

  return (
    <div className="bg-white rounded-2xl mb-4" style={card}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>📁 Dokumenti ({docs.length})</p>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditId(null); setError('') }} className="btn-link text-xs font-medium" style={{ color: '#2563EB' }}>
            + Dodaj dokument
          </button>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2">
        {adding && (
          <form onSubmit={handleAdd} className="p-3 rounded-lg flex flex-col gap-3" style={{ background: '#F8FAFC', border: '1px solid #BFDBFE' }}>
            {file ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <span className="text-sm truncate" style={{ color: '#16A34A' }}>✓ {file.name}</span>
                <button type="button" onClick={() => setFile(null)} className="text-xs ml-auto" style={{ color: '#94A3B8' }}>✕</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1 cursor-pointer px-3 py-5 rounded-lg text-sm"
                style={{ border: '1.5px dashed #CBD5E1', background: 'white', color: '#64748B' }}>
                <span>📎 Odaberi datoteku</span>
                <span className="text-xs" style={{ color: '#94A3B8' }}>PDF ili slika (JPG, PNG)</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            )}
            <DokumentFields d={draft} setD={setDraft} />
            {error && <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeAdd} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
              <button type="submit" disabled={saving || !file} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ background: saving || !file ? '#93C5FD' : '#2563EB' }}>{saving ? 'Sprema...' : '✓ Spremi dokument'}</button>
            </div>
          </form>
        )}

        {loading && <p className="text-xs px-1 py-2" style={{ color: '#94A3B8' }}>Učitavanje...</p>}
        {!loading && docs.length === 0 && !adding && (
          <p className="text-sm text-center py-4" style={{ color: '#94A3B8' }}>
            Još nema dokumenata. Ovdje spremi izvadak iz zemljišne knjige, posjedovni list, ugovor o najmu i slično.
          </p>
        )}

        {sorted.map(d => editId === d.id ? (
          <form key={d.id} onSubmit={handleEdit} className="p-3 rounded-lg flex flex-col gap-3" style={{ background: '#F8FAFC', border: '1px solid #BFDBFE' }}>
            <p className="text-xs" style={{ color: '#64748B' }}>📄 {d.file_name || 'Datoteka'}</p>
            <DokumentFields d={editDraft} setD={setEditDraft} />
            {error && <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>}
            <div className="flex gap-2 items-center">
              <button type="button" onClick={() => handleDelete(d)} className="btn-danger text-xs px-2.5 py-1.5 rounded-lg font-medium"
                style={{ background: '#FEF2F2', color: '#DC2626' }}>Obriši</button>
              <div className="flex-1" />
              <button type="button" onClick={() => setEditId(null)} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
              <button type="submit" disabled={saving} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ background: saving ? '#93C5FD' : '#2563EB' }}>{saving ? 'Sprema...' : '✓ Spremi'}</button>
            </div>
          </form>
        ) : (
          <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base" style={{ background: dokumentVrsta(d.vrsta).bg }}>
              {/\.pdf$/i.test(d.file_name || d.url) ? '📄' : '🖼️'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate" style={{ color: '#1E293B' }}>
                  {d.naziv || dokumentVrsta(d.vrsta).label}
                </a>
                {d.naziv && <Pill vrsta={d.vrsta} />}
              </div>
              <p className="text-xs mt-0.5 truncate" style={{ color: '#64748B' }}>
                {[d.datum ? `Stanje na dan ${formatDatum(d.datum)}` : null, d.napomena].filter(Boolean).join(' · ') || d.file_name || ''}
              </p>
            </div>
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs px-2.5 py-1 rounded-lg font-medium flex-shrink-0"
              style={{ background: '#EFF6FF', color: '#2563EB' }}>Otvori</a>
            <button onClick={() => { startEdit(d); setAdding(false) }} className="text-xs flex-shrink-0" style={{ color: '#64748B' }}>Uredi</button>
          </div>
        ))}
      </div>
    </div>
  )
}
