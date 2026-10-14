'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SmjestajForm, { smjestajDraft, type Smjestaj, type SmjestajDraft } from '@/components/SmjestajForm'
import { popunjenost } from '@/lib/smjestaj'

type Row = Smjestaj & { broj_stanara: number }

export default function SmjestajPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/smjestaj')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setRows(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  async function handleAdd(d: SmjestajDraft) {
    setSaving(true); setError('')
    const res = await fetch('/api/smjestaj', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Spremanje nije uspjelo.'); return }
    setRows(prev => [...prev, { ...json, broj_stanara: 0 }].sort((a, b) => a.naziv.localeCompare(b.naziv, 'hr')))
    setAdding(false)
  }

  const ukupnoStanara = rows.reduce((s, r) => s + r.broj_stanara, 0)
  const ukupnoKapacitet = rows.reduce((s, r) => s + (r.kapacitet || 0), 0)
  const q = search.toLowerCase().trim()
  const filtered = rows.filter(r => !q || [r.naziv, r.adresa, r.grad, r.najmodavac].some(v => (v || '').toLowerCase().includes(q)))

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.3px' }}>Smještaj</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            {rows.length > 0
              ? `${rows.length} ${rows.length === 1 ? 'smještaj' : 'smještaja'} · ${ukupnoStanara} radnika smješteno${ukupnoKapacitet ? ` od ${ukupnoKapacitet} mjesta` : ''}`
              : 'Smještajni objekti i radnici koji u njima žive.'}
          </p>
        </div>
        {!adding && (
          <button onClick={() => { setAdding(true); setError('') }}
            className="btn-primary px-4 py-2.5 rounded-lg text-sm font-medium text-white flex-shrink-0" style={{ background: '#2563EB' }}>
            + Novi smještaj
          </button>
        )}
      </div>

      {adding && (
        <SmjestajForm title="Novi smještaj" initial={smjestajDraft()} saving={saving} error={error}
          onSave={handleAdd} onCancel={() => setAdding(false)} />
      )}

      {!adding && rows.length > 0 && (
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94A3B8' }}>🔍</span>
          <input className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: '#E2E8F0', color: '#1E293B', background: 'white' }}
            placeholder="Pretraži po nazivu, adresi, najmodavcu..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94A3B8' }}>✕</button>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Nema dodanih smještaja. Dodajte prvi klikom na gumb gore.</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Nema smještaja koji odgovaraju pretrazi.</div>
        ) : filtered.map((r, i) => {
          const p = popunjenost(r.broj_stanara, r.kapacitet)
          const detalji = [[r.adresa, r.grad].filter(Boolean).join(', '), r.povrsina_m2 ? `${r.povrsina_m2} m²` : null, r.broj_soba ? `${r.broj_soba} ${r.broj_soba === 1 ? 'soba' : 'sobe'}` : null].filter(Boolean).join(' · ')
          return (
            <Link key={r.id} href={`/smjestaj/${r.id}`} className="row-link flex items-center gap-4 px-5 py-4"
              style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ECFDF5' }}>
                <span style={{ fontSize: 18 }}>🏠</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#1E293B' }}>{r.naziv}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: '#64748B' }}>{detalji || '—'}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0" style={{ minWidth: 90 }}>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: p.bg, color: p.color }}>{p.label}</span>
                {r.kapacitet ? (
                  <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(p.pct, 100)}%`, background: p.color }} />
                  </div>
                ) : null}
              </div>
              <span className="text-sm ml-2 flex-shrink-0" style={{ color: '#CBD5E1' }}>→</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
