'use client'

import { useState } from 'react'

export type Contact = {
  id: string
  company_id: string
  ime: string
  uloga: string | null
  telefon: string | null
  email: string | null
  napomena: string | null
}

type Draft = { ime: string; uloga: string; telefon: string; email: string; napomena: string }
const EMPTY: Draft = { ime: '', uloga: '', telefon: '', email: '', napomena: '' }

const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm'
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }

function ContactForm({ initial, saving, onSave, onCancel }: {
  initial: Draft; saving: boolean; onSave: (d: Draft) => void; onCancel: () => void
}) {
  const [d, setD] = useState<Draft>(initial)
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setD(p => ({ ...p, [k]: e.target.value }))
  return (
    <form onSubmit={e => { e.preventDefault(); if (d.ime.trim()) onSave(d) }}
      className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #BFDBFE' }}>
      <input autoFocus required className={inputCls} style={inputStyle} placeholder="Ime i prezime *" value={d.ime} onChange={set('ime')} />
      <input className={inputCls} style={inputStyle} placeholder="Uloga (npr. voditelj skladišta, HR, računovodstvo)" value={d.uloga} onChange={set('uloga')} />
      <input className={inputCls} style={inputStyle} placeholder="Telefon" value={d.telefon} onChange={set('telefon')} />
      <input type="email" className={inputCls} style={inputStyle} placeholder="Email" value={d.email} onChange={set('email')} />
      <input className={inputCls} style={inputStyle} placeholder="Napomena (opcionalno)" value={d.napomena} onChange={set('napomena')} />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
        <button type="submit" disabled={saving} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ background: saving ? '#93C5FD' : '#2563EB' }}>{saving ? 'Sprema...' : '✓ Spremi'}</button>
      </div>
    </form>
  )
}

export default function CompanyContacts({ companyId, initial }: { companyId: string; initial: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initial)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(d: Draft) {
    setSaving(true); setError('')
    const isNew = editingId === 'new'
    const res = await fetch(isNew ? '/api/company-contacts' : `/api/company-contacts/${editingId}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...d, company_id: companyId }),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Spremanje nije uspjelo.'); return }
    setContacts(prev => isNew ? [...prev, json] : prev.map(c => c.id === json.id ? json : c))
    setEditingId(null)
  }

  async function remove(c: Contact) {
    if (!confirm(`Obrisati kontakt "${c.ime}"?`)) return
    const res = await fetch(`/api/company-contacts/${c.id}`, { method: 'DELETE' })
    if (res.ok) setContacts(prev => prev.filter(x => x.id !== c.id))
    else setError('Brisanje nije uspjelo.')
  }

  return (
    <div className="bg-white rounded-2xl p-5 h-fit" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
        <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>📞 Kontakt osobe</p>
        {editingId === null && (
          <button onClick={() => setEditingId('new')} className="btn-link text-xs font-medium" style={{ color: '#2563EB' }}>+ Dodaj</button>
        )}
      </div>

      {error && <p className="text-xs mb-3" style={{ color: '#DC2626' }}>{error}</p>}

      <div className="flex flex-col gap-3">
        {contacts.length === 0 && editingId !== 'new' && (
          <p className="text-sm" style={{ color: '#CBD5E1' }}>Nema kontakt osoba.</p>
        )}

        {contacts.map(c => editingId === c.id ? (
          <ContactForm key={c.id} saving={saving} onCancel={() => setEditingId(null)} onSave={save}
            initial={{ ime: c.ime, uloga: c.uloga || '', telefon: c.telefon || '', email: c.email || '', napomena: c.napomena || '' }} />
        ) : (
          <div key={c.id} className="group" style={{ borderBottom: '1px solid #F8FAFC', paddingBottom: 10 }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: '#1E293B' }}>{c.ime}</p>
                {c.uloga && <p className="text-xs" style={{ color: '#64748B' }}>{c.uloga}</p>}
              </div>
              {editingId === null && (
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setEditingId(c.id)} className="text-xs" style={{ color: '#2563EB' }}>Uredi</button>
                  <button onClick={() => remove(c)} className="text-xs" style={{ color: '#EF4444' }}>Obriši</button>
                </div>
              )}
            </div>
            {c.telefon && <a href={`tel:${c.telefon.replace(/\s+/g, '')}`} className="block text-sm mt-1" style={{ color: '#2563EB' }}>📱 {c.telefon}</a>}
            {c.email && <a href={`mailto:${c.email}`} className="block text-sm mt-0.5 truncate" style={{ color: '#2563EB' }}>✉️ {c.email}</a>}
            {c.napomena && <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{c.napomena}</p>}
          </div>
        ))}

        {editingId === 'new' && (
          <ContactForm initial={EMPTY} saving={saving} onCancel={() => setEditingId(null)} onSave={save} />
        )}
      </div>
    </div>
  )
}
