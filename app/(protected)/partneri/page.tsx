'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PartnerForm, { draftFrom, type Partner, type PartnerDraft } from '@/components/PartnerForm'

type Row = Partner & { contacts: { ime: string; uloga: string | null; telefon: string | null; email: string | null }[] }

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

export default function PartneriPage() {
  const [partners, setPartners] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/partners')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setPartners(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  async function handleAdd(d: PartnerDraft) {
    setSaving(true); setError('')
    const res = await fetch('/api/partners', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Spremanje nije uspjelo.'); return }
    setPartners(prev => [...prev, { ...json, contacts: [] }].sort((a, b) => a.naziv.localeCompare(b.naziv, 'hr')))
    setAdding(false)
  }

  const q = search.toLowerCase().trim()
  const filtered = partners.filter(p =>
    !q ||
    [p.naziv, p.drzava, p.grad, p.usluge, p.email, p.web].some(v => (v || '').toLowerCase().includes(q)) ||
    p.contacts.some(c => `${c.ime} ${c.uloga || ''} ${c.telefon || ''} ${c.email || ''}`.toLowerCase().includes(q))
  )

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.3px' }}>Partnerske agencije</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Agencije s kojima Kvantus surađuje — kontakti, linkovi i podaci o suradnji.
          </p>
        </div>
        {!adding && (
          <button onClick={() => { setAdding(true); setError('') }}
            className="btn-primary px-4 py-2.5 rounded-lg text-sm font-medium text-white flex-shrink-0"
            style={{ background: '#2563EB' }}>
            + Nova agencija
          </button>
        )}
      </div>

      {adding && (
        <PartnerForm title="Nova partnerska agencija" initial={draftFrom()} saving={saving} error={error}
          onSave={handleAdd} onCancel={() => setAdding(false)} />
      )}

      {!adding && partners.length > 0 && (
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94A3B8' }}>🔍</span>
          <input className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: '#E2E8F0', color: '#1E293B', background: 'white' }}
            placeholder="Pretraži po nazivu, državi, kontaktu..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94A3B8' }}>✕</button>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
        ) : partners.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>
            Nema dodanih partnerskih agencija. Dodajte prvu klikom na gumb gore.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Nema agencija koje odgovaraju pretrazi.</div>
        ) : filtered.map((p, i) => {
          const first = p.contacts[0]
          const mjesto = [p.grad, p.drzava].filter(Boolean).join(', ')
          return (
            <Link key={p.id} href={`/partneri/${p.id}`}
              className="row-link flex items-center gap-4 px-5 py-4"
              style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F5F3FF' }}>
                <span style={{ fontSize: 18 }}>🤝</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#1E293B' }}>{p.naziv}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: '#64748B' }}>
                  {[mjesto, first ? `${first.ime}${first.telefon ? ` · ${first.telefon}` : ''}` : null].filter(Boolean).join(' — ') || '—'}
                  {p.contacts.length > 1 && <span style={{ color: '#94A3B8' }}>{` · +${p.contacts.length - 1}`}</span>}
                </p>
              </div>
              {p.web && <span className="hidden md:block text-xs flex-shrink-0" style={{ color: '#2563EB' }}>{hostOf(p.web)}</span>}
              <span className="text-sm ml-2 flex-shrink-0" style={{ color: '#CBD5E1' }}>→</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
