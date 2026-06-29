'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Obaveza = {
  id: string
  naziv: string
  employee_id: string | null
  employee_name: string | null
  rok: string | null
  zavrseno: boolean
  created_at: string
}

type Employee = { id: string; ime: string; prezime: string }

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
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'sve' | 'otvoreno' | 'zavrseno'>('otvoreno')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ naziv: '', employee_id: '', rok: '' })
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: obs }, { data: emps }] = await Promise.all([
        supabase.from('obaveze')
          .select('id, naziv, employee_id, rok, zavrseno, created_at, employees(ime, prezime)')
          .order('zavrseno', { ascending: true })
          .order('rok', { ascending: true, nullsFirst: false }),
        supabase.from('employees').select('id, ime, prezime').order('prezime'),
      ])

      setObaveze((obs || []).map((o: any) => ({
        id: o.id,
        naziv: o.naziv,
        employee_id: o.employee_id,
        employee_name: o.employees ? `${o.employees.ime} ${o.employees.prezime}` : null,
        rok: o.rok,
        zavrseno: o.zavrseno,
        created_at: o.created_at,
      })))
      setEmployees(emps || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.naziv.trim()) return
    setSaving(true)

    const { data } = await supabase.from('obaveze').insert({
      naziv: form.naziv.trim(),
      employee_id: form.employee_id || null,
      rok: form.rok || null,
      zavrseno: false,
    }).select('id, naziv, employee_id, rok, zavrseno, created_at, employees(ime, prezime)').single()

    if (data) {
      const newOb: Obaveza = {
        id: data.id,
        naziv: data.naziv,
        employee_id: data.employee_id,
        employee_name: data.employees ? `${(data.employees as any).ime} ${(data.employees as any).prezime}` : null,
        rok: data.rok,
        zavrseno: data.zavrseno,
        created_at: data.created_at,
      }
      setObaveze(prev => [newOb, ...prev])
    }

    setForm({ naziv: '', employee_id: '', rok: '' })
    setAdding(false)
    setSaving(false)
  }

  async function toggleDone(id: string, current: boolean) {
    if (!current && filter === 'otvoreno') {
      // Animate out before updating state
      setCompleting(id)
      await supabase.from('obaveze').update({ zavrseno: true }).eq('id', id)
      setTimeout(() => {
        setObaveze(prev => prev.map(o => o.id === id ? { ...o, zavrseno: true } : o))
        setCompleting(null)
      }, 400)
    } else {
      await supabase.from('obaveze').update({ zavrseno: !current }).eq('id', id)
      setObaveze(prev => prev.map(o => o.id === id ? { ...o, zavrseno: !current } : o))
    }
  }

  async function deleteObaveza(id: string) {
    await supabase.from('obaveze').delete().eq('id', id)
    setObaveze(prev => prev.filter(o => o.id !== id))
  }

  const filtered = obaveze.filter(o => {
    if (filter === 'otvoreno') return !o.zavrseno
    if (filter === 'zavrseno') return o.zavrseno
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
          <h1 className="text-2xl font-semibold" style={{ color: '#1E293B' }}>Obaveze</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            {openCount > 0 ? `${openCount} otvorenih obaveza` : 'Nema otvorenih obaveza 🎉'}
          </p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-white"
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
              <input type="date" className={inputCls} style={inputStyle}
                value={form.rok}
                onChange={e => setForm(p => ({ ...p, rok: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setAdding(false); setForm({ naziv: '', employee_id: '', rok: '' }) }}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#F1F5F9', color: '#374151' }}>
                Odustani
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: saving ? '#93C5FD' : '#2563EB' }}>
                {saving ? 'Sprema...' : '✓ Spremi'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: '#F1F5F9' }}>
        {([['otvoreno', 'Otvoreno'], ['zavrseno', 'Završeno'], ['sve', 'Sve']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
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

      {/* List */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>
            {filter === 'otvoreno' ? 'Nema otvorenih obaveza.' : filter === 'zavrseno' ? 'Nema završenih obaveza.' : 'Nema obaveza.'}
          </div>
        ) : (
          filtered.map((ob, i) => (
            <div key={ob.id}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{
                borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                opacity: completing === ob.id ? 0 : ob.zavrseno ? 0.6 : 1,
                transform: completing === ob.id ? 'translateY(-6px)' : 'none',
                transition: completing === ob.id ? 'opacity 0.35s ease, transform 0.35s ease' : 'opacity 0.2s ease',
                maxHeight: completing === ob.id ? 0 : undefined,
              }}>
              {/* Checkbox */}
              <button onClick={() => toggleDone(ob.id, ob.zavrseno)}
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
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
                  <RokBadge rok={ob.rok} />
                </div>
              </div>

              {/* Delete */}
              <button onClick={() => deleteObaveza(ob.id)}
                className="text-xs px-2 py-1 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
