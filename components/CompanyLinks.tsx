'use client'

import { useState } from 'react'

export type CompanyLink = { id: string; company_id?: string; partner_id?: string; naziv: string; url: string }

const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm'
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function LinkForm({ initial, saving, onSave, onCancel }: {
  initial: { naziv: string; url: string }; saving: boolean
  onSave: (d: { naziv: string; url: string }) => void; onCancel: () => void
}) {
  const [d, setD] = useState(initial)
  return (
    <form onSubmit={e => { e.preventDefault(); if (d.url.trim()) onSave(d) }}
      className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #BFDBFE' }}>
      <input autoFocus className={inputCls} style={inputStyle} placeholder="Naziv (npr. Portal za radnike, Ugovor, Google Drive)"
        value={d.naziv} onChange={e => setD(p => ({ ...p, naziv: e.target.value }))} />
      <input required className={inputCls} style={inputStyle} placeholder="Link (npr. https://...) *"
        value={d.url} onChange={e => setD(p => ({ ...p, url: e.target.value }))} />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
        <button type="submit" disabled={saving} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ background: saving ? '#93C5FD' : '#2563EB' }}>{saving ? 'Sprema...' : '✓ Spremi'}</button>
      </div>
    </form>
  )
}

/** Linkovi za tvrtku (zadano) ili partnersku agenciju (endpoint="/api/partner-links", parentKey="partner_id"). */
export default function CompanyLinks({ companyId, initial, endpoint = '/api/company-links', parentKey = 'company_id' }: {
  companyId: string; initial: CompanyLink[]; endpoint?: string; parentKey?: string
}) {
  const [links, setLinks] = useState<CompanyLink[]>(initial)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(d: { naziv: string; url: string }) {
    setSaving(true); setError('')
    const isNew = editingId === 'new'
    const res = await fetch(isNew ? endpoint : `${endpoint}/${editingId}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...d, [parentKey]: companyId }),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Spremanje nije uspjelo.'); return }
    setLinks(prev => isNew ? [...prev, json] : prev.map(l => l.id === json.id ? json : l))
    setEditingId(null)
  }

  async function remove(l: CompanyLink) {
    if (!confirm(`Obrisati link "${l.naziv}"?`)) return
    const res = await fetch(`${endpoint}/${l.id}`, { method: 'DELETE' })
    if (res.ok) setLinks(prev => prev.filter(x => x.id !== l.id))
    else setError('Brisanje nije uspjelo.')
  }

  return (
    <div className="bg-white rounded-2xl p-5 h-fit" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
        <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>🔗 Linkovi</p>
        {editingId === null && (
          <button onClick={() => setEditingId('new')} className="btn-link text-xs font-medium" style={{ color: '#2563EB' }}>+ Dodaj</button>
        )}
      </div>

      {error && <p className="text-xs mb-3" style={{ color: '#DC2626' }}>{error}</p>}

      <div className="flex flex-col gap-2">
        {links.length === 0 && editingId !== 'new' && (
          <p className="text-sm" style={{ color: '#CBD5E1' }}>Nema linkova.</p>
        )}

        {links.map(l => editingId === l.id ? (
          <LinkForm key={l.id} saving={saving} onCancel={() => setEditingId(null)} onSave={save}
            initial={{ naziv: l.naziv, url: l.url }} />
        ) : (
          <div key={l.id} className="flex items-start gap-2">
            <a href={l.url} target="_blank" rel="noopener noreferrer"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <p className="text-sm font-medium truncate" style={{ color: '#2563EB' }}>{l.naziv} ↗</p>
              <p className="text-xs truncate" style={{ color: '#94A3B8' }}>{hostOf(l.url)}</p>
            </a>
            {editingId === null && (
              <div className="flex flex-col gap-1 flex-shrink-0 pt-1">
                <button onClick={() => setEditingId(l.id)} className="text-xs" style={{ color: '#2563EB' }}>Uredi</button>
                <button onClick={() => remove(l)} className="text-xs" style={{ color: '#EF4444' }}>Obriši</button>
              </div>
            )}
          </div>
        ))}

        {editingId === 'new' && (
          <LinkForm initial={{ naziv: '', url: '' }} saving={saving} onCancel={() => setEditingId(null)} onSave={save} />
        )}
      </div>
    </div>
  )
}
