'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Company = {
  id: string
  naziv: string
  kontakt_ime: string | null
  kontakt_telefon: string | null
  kontakt_email: string | null
  created_at: string
  worker_count: number
}

export default function TvrtkePage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ naziv: '', kontakt_ime: '', kontakt_telefon: '', kontakt_email: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('companies')
      .select('id, naziv, kontakt_ime, kontakt_telefon, kontakt_email, created_at, employees(id)')
      .order('naziv')

    setCompanies((data || []).map((c: any) => ({
      ...c,
      worker_count: c.employees?.length || 0,
    })))
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.naziv.trim()) return
    setSaving(true)

    const { data } = await supabase.from('companies').insert({
      naziv: form.naziv.trim(),
      kontakt_ime: form.kontakt_ime.trim() || null,
      kontakt_telefon: form.kontakt_telefon.trim() || null,
      kontakt_email: form.kontakt_email.trim() || null,
    }).select('id, naziv, kontakt_ime, kontakt_telefon, kontakt_email, created_at').single()

    if (data) {
      setCompanies(prev => [...prev, { ...data, worker_count: 0 }].sort((a, b) => a.naziv.localeCompare(b.naziv)))
    }

    setForm({ naziv: '', kontakt_ime: '', kontakt_telefon: '', kontakt_email: '' })
    setAdding(false)
    setSaving(false)
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm"
  const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#1E293B' }}>Tvrtke</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Klijenti i poslodavci s kojima Kvantus surađuje.
          </p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="btn-primary px-4 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: '#2563EB' }}>
            + Nova tvrtka
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl p-5 mb-5" style={{ border: '2px solid #2563EB' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Nova tvrtka</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Naziv tvrtke *</label>
              <input autoFocus className={inputCls} style={inputStyle}
                placeholder="npr. Jobbicus d.o.o."
                value={form.naziv}
                onChange={e => setForm(p => ({ ...p, naziv: e.target.value }))}
                required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Kontakt osoba</label>
              <input className={inputCls} style={inputStyle}
                placeholder="Ime i prezime"
                value={form.kontakt_ime}
                onChange={e => setForm(p => ({ ...p, kontakt_ime: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Telefon</label>
              <input className={inputCls} style={inputStyle}
                placeholder="+385..."
                value={form.kontakt_telefon}
                onChange={e => setForm(p => ({ ...p, kontakt_telefon: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Email</label>
              <input type="email" className={inputCls} style={inputStyle}
                placeholder="kontakt@tvrtka.hr"
                value={form.kontakt_email}
                onChange={e => setForm(p => ({ ...p, kontakt_email: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button"
              onClick={() => { setAdding(false); setForm({ naziv: '', kontakt_ime: '', kontakt_telefon: '', kontakt_email: '' }) }}
              className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: '#F1F5F9', color: '#374151' }}>
              Odustani
            </button>
            <button type="submit" disabled={saving}
              className="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: saving ? '#93C5FD' : '#2563EB' }}>
              {saving ? 'Sprema...' : '✓ Spremi'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
        ) : companies.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>
            Nema dodanih tvrtki. Dodajte prvu tvrtku klikom na gumb gore.
          </div>
        ) : (
          companies.map((co, i) => (
            <Link key={co.id} href={`/tvrtke/${co.id}`}
              className="flex items-center gap-4 px-5 py-4 group"
              style={{
                borderBottom: i < companies.length - 1 ? '1px solid #F1F5F9' : 'none',
                display: 'flex',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#EFF6FF' }}>
                <span style={{ fontSize: 18 }}>🏢</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>{co.naziv}</p>
                {co.kontakt_ime && (
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                    {co.kontakt_ime}
                    {co.kontakt_telefon && ` · ${co.kontakt_telefon}`}
                  </p>
                )}
              </div>

              {/* Worker count */}
              <div className="text-right flex-shrink-0">
                <span className="text-sm font-semibold" style={{ color: '#1E293B' }}>{co.worker_count}</span>
                <p className="text-xs" style={{ color: '#94A3B8' }}>{co.worker_count === 1 ? 'radnik' : 'radnika'}</p>
              </div>

              <span className="text-sm ml-2 flex-shrink-0" style={{ color: '#CBD5E1' }}>→</span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
