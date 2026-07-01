'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const STATUS_ZAP_CONFIG: Record<string, { color: string; bg: string }> = {
  'Aktivan':    { color: '#16A34A', bg: '#DCFCE7' },
  'U postupku': { color: '#2563EB', bg: '#EFF6FF' },
  'Na čekanju': { color: '#CA8A04', bg: '#FEF9C3' },
  'Otkazan':    { color: '#DC2626', bg: '#FEE2E2' },
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(dateStr); due.setHours(0,0,0,0)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

function docStatusFromDocs(docs: any[]) {
  if (!docs || docs.length === 0) return { label: 'Bez dokumenta', color: '#94A3B8', bg: '#F1F5F9' }
  const soonest = docs.reduce((a: any, b: any) => {
    if (!a.datum_isteka) return b
    if (!b.datum_isteka) return a
    return new Date(a.datum_isteka) < new Date(b.datum_isteka) ? a : b
  })
  if (!soonest.datum_isteka) return { label: 'Bez dokumenta', color: '#94A3B8', bg: '#F1F5F9' }
  const days = daysUntil(soonest.datum_isteka)
  if (days < 0) return { label: 'Isteklo', color: '#DC2626', bg: '#FEE2E2' }
  if (days <= 7) return { label: 'Kritično', color: '#DC2626', bg: '#FEE2E2' }
  if (days <= 30) return { label: 'Uskoro istječe', color: '#CA8A04', bg: '#FEF9C3' }
  return { label: 'Vrijedi', color: '#16A34A', bg: '#DCFCE7' }
}

const DOC_STATUSES = ['Vrijedi', 'Uskoro istječe', 'Kritično', 'Isteklo', 'Bez dokumenta']
const ZAP_STATUSES = Object.keys(STATUS_ZAP_CONFIG)

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [company, setCompany] = useState<any>(null)
  const [workers, setWorkers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ naziv: '', kontakt_ime: '', kontakt_telefon: '', kontakt_email: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [filterZap, setFilterZap] = useState<string>('')
  const [filterDoc, setFilterDoc] = useState<string>('')
  const [openFilter, setOpenFilter] = useState<'zap' | 'doc' | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenFilter(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: co }, { data: emps }] = await Promise.all([
      supabase.from('companies').select('*').eq('id', id).single(),
      supabase.from('employees')
        .select('id, ime, prezime, status_zaposlenika, documents(datum_isteka)')
        .eq('company_id', id)
        .order('prezime'),
    ])
    if (!co) { router.push('/tvrtke'); return }
    setCompany(co)
    setWorkers(emps || [])
    setEditForm({
      naziv: co.naziv || '',
      kontakt_ime: co.kontakt_ime || '',
      kontakt_telefon: co.kontakt_telefon || '',
      kontakt_email: co.kontakt_email || '',
    })
    setLoading(false)
  }

  async function handleEditSave() {
    if (!editForm.naziv.trim()) return
    setEditSaving(true)
    await supabase.from('companies').update({
      naziv: editForm.naziv.trim(),
      kontakt_ime: editForm.kontakt_ime.trim() || null,
      kontakt_telefon: editForm.kontakt_telefon.trim() || null,
      kontakt_email: editForm.kontakt_email.trim() || null,
    }).eq('id', id)
    setCompany((prev: any) => ({ ...prev, ...editForm }))
    setEditing(false)
    setEditSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Jeste li sigurni? Ovo će odmah obrisati tvrtku (radnici ostaju).')) return
    setDeleting(true)
    await supabase.from('companies').delete().eq('id', id)
    router.push('/tvrtke')
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm"
  const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }

  if (loading) return <div className="p-8 text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
  if (!company) return null

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link href="/tvrtke" className="text-sm" style={{ color: '#64748B' }}>← Tvrtke</Link>

      {/* Header */}
      <div className="flex items-start justify-between mt-4 mb-6 gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#EFF6FF', border: '2px solid #BFDBFE' }}>
            <span style={{ fontSize: 24 }}>🏢</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#1E293B' }}>{company.naziv}</h1>
            <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
              {workers.length} {workers.length === 1 ? 'radnik' : 'radnika'}
            </p>
          </div>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white flex-shrink-0"
            style={{ background: '#2563EB' }}>
            ✏️ Uredi
          </button>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="bg-white rounded-xl p-5 mb-5" style={{ border: '2px solid #2563EB' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>Uredi tvrtku</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Naziv tvrtke *</label>
              <input className={inputCls} style={inputStyle}
                value={editForm.naziv}
                onChange={e => setEditForm(p => ({ ...p, naziv: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Kontakt osoba</label>
              <input className={inputCls} style={inputStyle}
                value={editForm.kontakt_ime}
                onChange={e => setEditForm(p => ({ ...p, kontakt_ime: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Telefon</label>
              <input className={inputCls} style={inputStyle}
                value={editForm.kontakt_telefon}
                onChange={e => setEditForm(p => ({ ...p, kontakt_telefon: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Email</label>
              <input type="email" className={inputCls} style={inputStyle}
                value={editForm.kontakt_email}
                onChange={e => setEditForm(p => ({ ...p, kontakt_email: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <button onClick={handleDelete} disabled={deleting}
              className="btn-danger text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: '#FEF2F2', color: '#DC2626' }}>
              {deleting ? 'Briše...' : '🗑 Obriši tvrtku'}
            </button>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)}
                className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#F1F5F9', color: '#374151' }}>
                Odustani
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: editSaving ? '#93C5FD' : '#2563EB' }}>
                {editSaving ? 'Sprema...' : '✓ Spremi'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        {/* Workers list */}
        <div className="bg-white rounded-xl" style={{ border: '1px solid #E2E8F0' }}>
          {/* Header row with column labels + filters */}
          <div ref={filterRef} className="relative px-5 py-3" style={{ borderBottom: '1px solid #E2E8F0', borderRadius: '12px 12px 0 0' }}>
            <div className="flex items-center gap-3">
              {/* Spacer matching avatar w-8 */}
              <div className="w-8 flex-shrink-0" />
              <p className="text-xs font-medium flex-1" style={{ color: '#94A3B8' }}>Zaposlenik</p>

              {/* Status zaposlenika filter */}
              <div className="relative flex-shrink-0" style={{ width: 130 }}>
                <button onClick={() => setOpenFilter(openFilter === 'zap' ? null : 'zap')}
                  className="flex items-center justify-center gap-1 text-xs font-medium px-2 py-1 rounded-lg w-full whitespace-nowrap"
                  style={{
                    color: filterZap ? '#2563EB' : '#94A3B8',
                    background: filterZap ? '#EFF6FF' : 'transparent',
                    border: filterZap ? '1px solid #BFDBFE' : '1px solid transparent',
                  }}>
                  Status zaposlenika
                  {filterZap && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#2563EB' }} />}
                  <span style={{ fontSize: 9 }}>▾</span>
                </button>
                {openFilter === 'zap' && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl py-1 z-20"
                    style={{ border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160 }}>
                    {ZAP_STATUSES.map(s => {
                      const cfg = STATUS_ZAP_CONFIG[s]
                      return (
                        <button key={s} onClick={() => { setFilterZap(s); setOpenFilter(null) }}
                          className="w-full text-left px-3 py-2 text-xs flex items-center gap-2"
                          style={{ color: filterZap === s ? '#2563EB' : '#475569', fontWeight: filterZap === s ? 600 : 400 }}>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: cfg.bg, color: cfg.color }}>{s}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Doc status filter */}
              <div className="relative flex-shrink-0" style={{ width: 125 }}>
                <button onClick={() => setOpenFilter(openFilter === 'doc' ? null : 'doc')}
                  className="flex items-center justify-center gap-1 text-xs font-medium px-2 py-1 rounded-lg w-full whitespace-nowrap"
                  style={{
                    color: filterDoc ? '#2563EB' : '#94A3B8',
                    background: filterDoc ? '#EFF6FF' : 'transparent',
                    border: filterDoc ? '1px solid #BFDBFE' : '1px solid transparent',
                  }}>
                  Status dokumenta
                  {filterDoc && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#2563EB' }} />}
                  <span style={{ fontSize: 9 }}>▾</span>
                </button>
                {openFilter === 'doc' && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl py-1 z-20"
                    style={{ border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160 }}>
                    {DOC_STATUSES.map(s => (
                      <button key={s} onClick={() => { setFilterDoc(s); setOpenFilter(null) }}
                        className="w-full text-left px-3 py-2 text-xs"
                        style={{ color: filterDoc === s ? '#2563EB' : '#475569', fontWeight: filterDoc === s ? 600 : 400 }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active filters row */}
            {(filterZap || filterDoc) && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs" style={{ color: '#94A3B8' }}>Filtrirano:</span>
                {filterZap && (
                  <button onClick={() => setFilterZap('')}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                    {filterZap} ✕
                  </button>
                )}
                {filterDoc && (
                  <button onClick={() => setFilterDoc('')}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                    {filterDoc} ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {workers.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>
              Nema radnika u ovoj tvrtki.<br />
              <span className="text-xs">Dodijelite radnike kroz stranicu za uređivanje radnika.</span>
            </div>
          ) : (() => {
            const filtered = workers.filter(w => {
              const docStatus = docStatusFromDocs(w.documents || [])
              if (filterZap && w.status_zaposlenika !== filterZap) return false
              if (filterDoc && docStatus.label !== filterDoc) return false
              return true
            })
            if (filtered.length === 0) return (
              <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Nema radnika koji odgovaraju filteru.</div>
            )
            return filtered.map((w: any, i: number) => {
              const zapCfg = STATUS_ZAP_CONFIG[w.status_zaposlenika || ''] || { color: '#475569', bg: '#F1F5F9' }
              const docStatus = docStatusFromDocs(w.documents || [])
              return (
                <Link key={w.id} href={`/zaposlenici/${w.id}/pregled`}
                  className="row-link flex items-center gap-3 px-5 py-3.5"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    {w.ime[0]}{w.prezime[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: '#1E293B' }}>{w.ime} {w.prezime}</p>
                  </div>
                  <div className="flex-shrink-0 flex justify-center" style={{ width: 130 }}>
                    {w.status_zaposlenika && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: zapCfg.bg, color: zapCfg.color }}>
                        {w.status_zaposlenika}
                      </span>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex justify-center" style={{ width: 125 }}>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: docStatus.bg, color: docStatus.color }}>
                      {docStatus.label}
                    </span>
                  </div>
                </Link>
              )
            })
          })()}
        </div>

        {/* Contact card */}
        <div className="bg-white rounded-xl p-5 h-fit" style={{ border: '1px solid #E2E8F0' }}>
          <p className="font-semibold text-sm mb-4" style={{ color: '#1E293B', borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
            📞 Kontakt
          </p>
          {company.kontakt_ime || company.kontakt_telefon || company.kontakt_email ? (
            <div className="flex flex-col gap-3">
              {company.kontakt_ime && (
                <div>
                  <p className="text-xs mb-0.5" style={{ color: '#94A3B8' }}>Kontakt osoba</p>
                  <p className="text-sm" style={{ color: '#1E293B' }}>{company.kontakt_ime}</p>
                </div>
              )}
              {company.kontakt_telefon && (
                <div>
                  <p className="text-xs mb-0.5" style={{ color: '#94A3B8' }}>Telefon</p>
                  <a href={`tel:${company.kontakt_telefon}`} className="text-sm" style={{ color: '#2563EB' }}>
                    {company.kontakt_telefon}
                  </a>
                </div>
              )}
              {company.kontakt_email && (
                <div>
                  <p className="text-xs mb-0.5" style={{ color: '#94A3B8' }}>Email</p>
                  <a href={`mailto:${company.kontakt_email}`} className="text-sm" style={{ color: '#2563EB' }}>
                    {company.kontakt_email}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#CBD5E1' }}>Nema kontakt podataka.</p>
          )}
        </div>
      </div>
    </div>
  )
}
