'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import FilterDropdown from '@/components/FilterDropdown'

type Obaveza = {
  id: string
  naziv: string
  employee_id: string | null
  employee_name: string | null
  company_id: string | null
  company_name: string | null
  rok: string | null
  zavrseno: boolean
  created_at: string
}

type Employee = { id: string; ime: string; prezime: string }
type Company = { id: string; naziv: string }

type EditForm = { naziv: string; employee_id: string; company_id: string; rok: string }
const EMPTY_FORM: EditForm = { naziv: '', employee_id: '', company_id: '', rok: '' }

function toObaveza(o: any): Obaveza {
  return {
    id: o.id,
    naziv: o.naziv,
    employee_id: o.employee_id,
    employee_name: o.employees ? `${o.employees.ime} ${o.employees.prezime}` : null,
    company_id: o.company_id ?? null,
    company_name: o.companies?.naziv ?? null,
    rok: o.rok,
    zavrseno: o.zavrseno,
    created_at: o.created_at,
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}.`
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(dateStr); due.setHours(0,0,0,0)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

function RokBadge({ rok }: { rok: string | null }) {
  if (!rok) return <span className="text-xs" style={{ color: '#CBD5E1' }}>Bez roka</span>
  const days = daysUntil(rok)
  const color = days < 0 ? '#DC2626' : days <= 3 ? '#CA8A04' : '#64748B'
  const label = days < 0 ? `Kasni ${Math.abs(days)} dana` : days === 0 ? 'Danas' : days === 1 ? 'Sutra' : formatDate(rok)
  return <span className="text-xs font-medium" style={{ color }}>{label}</span>
}

export default function ObavezePage() {
  const [obaveze, setObaveze] = useState<Obaveza[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [vezano, setVezano] = useState<'sve' | 'radnici' | 'tvrtke' | 'opce'>('sve')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'sve' | 'otvoreno' | 'zavrseno'>('otvoreno')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<EditForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/obaveze')
      if (!res.ok) { setLoading(false); return }
      const { obaveze: obs, employees: emps, companies: cos } = await res.json()

      setObaveze((obs || []).map(toObaveza))
      setEmployees(emps || [])
      setCompanies(cos || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.naziv.trim()) return
    setSaving(true)

    const res = await fetch('/api/obaveze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ naziv: form.naziv.trim(), employee_id: form.employee_id || null, company_id: form.company_id || null, rok: form.rok || null }),
    })

    if (res.ok) {
      const data = await res.json()
      setObaveze(prev => [toObaveza(data), ...prev])
    }

    setForm(EMPTY_FORM)
    setAdding(false)
    setSaving(false)
  }

  function startEdit(ob: Obaveza) {
    setEditingId(ob.id)
    setEditForm({
      naziv: ob.naziv,
      employee_id: ob.employee_id || '',
      company_id: ob.company_id || '',
      rok: ob.rok || '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(EMPTY_FORM)
  }

  async function handleEditSave(id: string) {
    if (!editForm.naziv.trim()) return
    setEditSaving(true)

    const emp = employees.find(e => e.id === editForm.employee_id)
    const co = companies.find(c => c.id === editForm.company_id)
    await fetch(`/api/obaveze/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ naziv: editForm.naziv.trim(), employee_id: editForm.employee_id || null, company_id: editForm.company_id || null, rok: editForm.rok || null }),
    })

    setObaveze(prev => prev.map(o => o.id === id ? {
      ...o,
      naziv: editForm.naziv.trim(),
      employee_id: editForm.employee_id || null,
      employee_name: emp ? `${emp.ime} ${emp.prezime}` : null,
      company_id: editForm.company_id || null,
      company_name: co ? co.naziv : null,
      rok: editForm.rok || null,
    } : o))

    setEditSaving(false)
    setEditingId(null)
  }

  async function toggleDone(id: string, current: boolean) {
    if (!current && filter === 'otvoreno') {
      setCompleting(id)
      await fetch(`/api/obaveze/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zavrseno: true }) })
      setTimeout(() => {
        setObaveze(prev => prev.map(o => o.id === id ? { ...o, zavrseno: true } : o))
        setCompleting(null)
      }, 400)
    } else {
      await fetch(`/api/obaveze/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zavrseno: !current }) })
      setObaveze(prev => prev.map(o => o.id === id ? { ...o, zavrseno: !current } : o))
    }
  }

  async function deleteObaveza(id: string) {
    setDeleting(id)
    await fetch(`/api/obaveze/${id}`, { method: 'DELETE' })
    setObaveze(prev => prev.filter(o => o.id !== id))
    setEditingId(null)
    setDeleting(null)
  }

  const filtered = obaveze.filter(o => {
    if (filter === 'otvoreno' && o.zavrseno) return false
    if (filter === 'zavrseno' && !o.zavrseno) return false
    if (vezano === 'radnici' && !o.employee_id) return false
    if (vezano === 'tvrtke' && !o.company_id) return false
    if (vezano === 'opce' && (o.employee_id || o.company_id)) return false
    return true
  })

  const openCount = obaveze.filter(o => !o.zavrseno).length

  const inputCls = "px-3 py-2 rounded-lg border text-sm"
  const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.3px' }}>Obaveze</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            {openCount > 0 ? `${openCount} otvorenih obaveza` : 'Nema otvorenih obaveza 🎉'}
          </p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="btn-primary px-4 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: '#2563EB' }}>
            + Nova obaveza
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl p-4 mb-4" style={{ border: '2px solid #2563EB' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#1E293B' }}>Nova obaveza</p>
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              className={`${inputCls} w-full`} style={inputStyle}
              placeholder="Naziv obaveze..."
              value={form.naziv}
              onChange={e => setForm(p => ({ ...p, naziv: e.target.value }))}
              required
            />
            <div className="flex flex-col md:flex-row gap-3">
              <select
                className={`${inputCls} flex-1`} style={inputStyle}
                value={form.employee_id}
                onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}>
                <option value="">Bez radnika (opcionalno)</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.ime} {e.prezime}</option>
                ))}
              </select>
              <select
                className={`${inputCls} flex-1`} style={inputStyle}
                value={form.company_id}
                onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))}>
                <option value="">Bez tvrtke (opcionalno)</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.naziv}</option>
                ))}
              </select>
              <input type="date" className={inputCls} style={inputStyle}
                value={form.rok}
                onChange={e => setForm(p => ({ ...p, rok: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button"
                onClick={() => { setAdding(false); setForm(EMPTY_FORM) }}
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
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: '#F1F5F9' }}>
        {([['otvoreno', 'Otvoreno'], ['zavrseno', 'Završeno'], ['sve', 'Sve']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className="btn-tab px-3 py-1.5 rounded-md text-sm font-medium"
            style={{
              background: filter === val ? 'white' : 'transparent',
              color: filter === val ? '#1E293B' : '#64748B',
              boxShadow: filter === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            {label}
            {val === 'otvoreno' && openCount > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: '#EFF6FF', color: '#2563EB' }}>{openCount}</span>
            )}
          </button>
        ))}
      </div>
      <FilterDropdown label="Vezano za" value={vezano === 'sve' ? '' : vezano}
        onChange={v => setVezano((v || 'sve') as typeof vezano)}
        options={[
          { value: 'radnici', label: '🔗 Radnike', color: '#2563EB', bg: '#EFF6FF' },
          { value: 'tvrtke', label: '🏢 Tvrtke', color: '#7C3AED', bg: '#F3E8FF' },
          { value: 'opce', label: 'Općenito', color: '#64748B', bg: '#F1F5F9' },
        ]} />
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>
            {filter === 'otvoreno' ? 'Nema otvorenih obaveza.' : filter === 'zavrseno' ? 'Nema završenih obaveza.' : 'Nema obaveza.'}
          </div>
        ) : (
          filtered.map((ob, i) => {
            const isEditing = editingId === ob.id
            const borderBottom = i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none'

            if (isEditing) {
              return (
                <div key={ob.id} style={{ borderBottom, background: '#F8FAFC' }}>
                  {/* Edit form */}
                  <div className="px-4 py-4">
                    <p className="text-xs font-semibold mb-3" style={{ color: '#64748B' }}>Uredi obavezu</p>
                    <div className="flex flex-col gap-3">
                      <input
                        autoFocus
                        className={`${inputCls} w-full`} style={inputStyle}
                        placeholder="Naziv obaveze..."
                        value={editForm.naziv}
                        onChange={e => setEditForm(p => ({ ...p, naziv: e.target.value }))}
                      />
                      <div className="flex flex-col md:flex-row gap-3">
                        <select
                          className={`${inputCls} flex-1`} style={inputStyle}
                          value={editForm.employee_id}
                          onChange={e => setEditForm(p => ({ ...p, employee_id: e.target.value }))}>
                          <option value="">Bez radnika (opcionalno)</option>
                          {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.ime} {e.prezime}</option>
                          ))}
                        </select>
                        <select
                          className={`${inputCls} flex-1`} style={inputStyle}
                          value={editForm.company_id}
                          onChange={e => setEditForm(p => ({ ...p, company_id: e.target.value }))}>
                          <option value="">Bez tvrtke (opcionalno)</option>
                          {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.naziv}</option>
                          ))}
                        </select>
                        <input type="date" className={inputCls} style={inputStyle}
                          value={editForm.rok}
                          onChange={e => setEditForm(p => ({ ...p, rok: e.target.value }))} />
                      </div>
                      <div className="flex items-center justify-between">
                        {/* Delete on the left */}
                        <button type="button"
                          onClick={() => deleteObaveza(ob.id)}
                          disabled={deleting === ob.id}
                          className="btn-danger text-xs px-3 py-1.5 rounded-lg font-medium"
                          style={{ background: '#FEF2F2', color: '#DC2626' }}>
                          {deleting === ob.id ? 'Briše...' : '🗑 Obriši'}
                        </button>
                        {/* Cancel + Save on the right */}
                        <div className="flex gap-2">
                          <button type="button" onClick={cancelEdit}
                            className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: '#F1F5F9', color: '#374151' }}>
                            Odustani
                          </button>
                          <button type="button"
                            onClick={() => handleEditSave(ob.id)}
                            disabled={editSaving || !editForm.naziv.trim()}
                            className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                            style={{ background: editSaving ? '#93C5FD' : '#2563EB' }}>
                            {editSaving ? 'Sprema...' : '✓ Spremi'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={ob.id}
                className="group flex items-center gap-3 px-4 py-3.5"
                style={{
                  borderBottom,
                  opacity: completing === ob.id ? 0 : ob.zavrseno ? 0.6 : 1,
                  transform: completing === ob.id ? 'translateY(-6px)' : 'none',
                  transition: completing === ob.id ? 'opacity 0.35s ease, transform 0.35s ease' : 'opacity 0.2s ease',
                }}>
                {/* Checkbox */}
                <button onClick={() => toggleDone(ob.id, ob.zavrseno)}
                  className="btn-check w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{
                    border: ob.zavrseno ? 'none' : '2px solid #D1D5DB',
                    background: ob.zavrseno ? '#16A34A' : 'white',
                  }}>
                  {ob.zavrseno && <span className="text-white text-xs">✓</span>}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{
                    color: '#1E293B',
                    textDecoration: ob.zavrseno ? 'line-through' : 'none',
                  }}>{ob.naziv}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {ob.employee_name && (
                      <Link href={`/zaposlenici/${ob.employee_id}/pregled`}
                        className="text-xs font-medium hover:underline"
                        style={{ color: '#2563EB' }}>
                        🔗 {ob.employee_name}
                      </Link>
                    )}
                    {ob.company_name && (
                      <Link href={`/tvrtke/${ob.company_id}`}
                        className="text-xs font-medium hover:underline"
                        style={{ color: '#7C3AED' }}>
                        🏢 {ob.company_name}
                      </Link>
                    )}
                    <RokBadge rok={ob.rok} />
                  </div>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => startEdit(ob)}
                  className="btn-secondary text-xs px-2.5 py-1 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100 font-medium"
                  style={{ background: '#F1F5F9', color: '#475569' }}>
                  ✏️ Uredi
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
