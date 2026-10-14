'use client'

import { Fragment, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SmjestajForm, { smjestajDraft, type Smjestaj, type SmjestajDraft } from '@/components/SmjestajForm'
import { efektivniKapacitet, formatDatum, jeTrenutni, popunjenost } from '@/lib/smjestaj'

type Resident = {
  id: string
  employee_id: string
  room_id: string | null
  datum_od: string
  datum_do: string | null
  ugovor_url: string | null
  napomena: string | null
  employees: { id: string; ime: string; prezime: string; status_zaposlenika: string | null } | null
}
type Room = { id: string; naziv: string; broj_kreveta: number; povrsina_m2: number | null; napomena: string | null }
type Employee = { id: string; ime: string; prezime: string }

const card = { boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }
const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm'
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }
const today = () => new Date().toISOString().slice(0, 10)
const NO_ROOM = '__bez_sobe__'

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_')
}

async function uploadUgovor(file: File, employeeId: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('path', `${employeeId}/smjestaj_${Date.now()}_${safeFileName(file.name)}`)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`Učitavanje ugovora "${file.name}" nije uspjelo.`)
  return (await res.json()).url
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs" style={{ color: '#94A3B8' }}>{label}</span>
      <span className="text-sm font-semibold mt-0.5" style={{ color: tone || '#1E293B' }}>{value}</span>
    </div>
  )
}

function RoomForm({ initial, saving, onSave, onCancel, onDelete }: {
  initial: { naziv: string; broj_kreveta: string; povrsina_m2: string }
  saving: boolean; onSave: (d: { naziv: string; broj_kreveta: string; povrsina_m2: string }) => void
  onCancel: () => void; onDelete?: () => void
}) {
  const [d, setD] = useState(initial)
  return (
    <form onSubmit={e => { e.preventDefault(); if (d.naziv.trim()) onSave(d) }} className="p-4 flex flex-col gap-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Naziv sobe *</label>
        <input autoFocus required className={inputCls} style={inputStyle} placeholder="npr. Soba 1, Potkrovlje..."
          value={d.naziv} onChange={e => setD(p => ({ ...p, naziv: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Broj kreveta *</label>
          <input required inputMode="numeric" className={inputCls} style={inputStyle}
            value={d.broj_kreveta} onChange={e => setD(p => ({ ...p, broj_kreveta: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Površina (m²)</label>
          <input inputMode="decimal" className={inputCls} style={inputStyle}
            value={d.povrsina_m2} onChange={e => setD(p => ({ ...p, povrsina_m2: e.target.value }))} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          {onDelete && (
            <button type="button" onClick={onDelete} className="btn-danger text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: '#FEF2F2', color: '#DC2626' }}>🗑 Obriši sobu</button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
          <button type="submit" disabled={saving} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ background: saving ? '#93C5FD' : '#2563EB' }}>{saving ? 'Sprema...' : '✓ Spremi'}</button>
        </div>
      </div>
    </form>
  )
}

export default function SmjestajDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [acc, setAcc] = useState<Smjestaj | null>(null)
  const [residents, setResidents] = useState<Resident[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // Sobe
  const [roomEditing, setRoomEditing] = useState<string | 'new' | null>(null)
  const [roomSaving, setRoomSaving] = useState(false)
  const [roomError, setRoomError] = useState('')

  // Useljenje
  const [movingInto, setMovingInto] = useState<string | null>(null) // room id ili NO_ROOM
  const [newEmp, setNewEmp] = useState('')
  const [newOd, setNewOd] = useState(today())
  const [newFile, setNewFile] = useState<File | null>(null)
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  const [showHistory, setShowHistory] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/smjestaj/${id}`)
      if (!res.ok) { router.push('/smjestaj'); return }
      const json = await res.json()
      setAcc(json.accommodation)
      setResidents(json.residents || [])
      setRooms(json.rooms || [])
      setEmployees(json.employees || [])
      setLoading(false)
    }
    load()
  }, [id, router])

  // ── Smještaj ──
  async function handleSave(d: SmjestajDraft) {
    setSaving(true); setError('')
    const res = await fetch(`/api/smjestaj/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Spremanje nije uspjelo.'); return }
    setAcc(json); setEditing(false)
  }

  async function handleDelete() {
    if (!confirm('Obrisati ovaj smještaj? Obrisat će se i sobe te evidencija tko je u njemu živio.')) return
    setDeleting(true)
    await fetch(`/api/smjestaj/${id}`, { method: 'DELETE' })
    router.push('/smjestaj')
  }

  // ── Sobe ──
  async function saveRoom(d: { naziv: string; broj_kreveta: string; povrsina_m2: string }) {
    setRoomSaving(true); setRoomError('')
    const isNew = roomEditing === 'new'
    const res = await fetch(isNew ? '/api/smjestaj-sobe' : `/api/smjestaj-sobe/${roomEditing}`, {
      method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...d, accommodation_id: id }),
    })
    const json = await res.json().catch(() => ({}))
    setRoomSaving(false)
    if (!res.ok) { setRoomError(json.error || 'Spremanje sobe nije uspjelo.'); return }
    setRooms(prev => isNew ? [...prev, json] : prev.map(r => r.id === json.id ? json : r))
    setRoomEditing(null)
  }

  async function deleteRoom(room: Room) {
    const n = residents.filter(r => r.room_id === room.id && jeTrenutni(r.datum_do)).length
    const msg = n > 0
      ? `Obrisati "${room.naziv}"? ${n} ${n === 1 ? 'radnik ostaje' : 'radnika ostaje'} u smještaju, ali bez sobe.`
      : `Obrisati "${room.naziv}"?`
    if (!confirm(msg)) return
    const res = await fetch(`/api/smjestaj-sobe/${room.id}`, { method: 'DELETE' })
    if (!res.ok) { setRoomError('Brisanje sobe nije uspjelo.'); return }
    setRooms(prev => prev.filter(r => r.id !== room.id))
    setResidents(prev => prev.map(r => r.room_id === room.id ? { ...r, room_id: null } : r))
    setRoomEditing(null)
  }

  // ── Stanari ──
  function openMoveIn(roomId: string) {
    setMovingInto(roomId); setNewEmp(''); setNewOd(today()); setNewFile(null); setAddError('')
  }

  async function handleMoveIn(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmp || !movingInto) return
    setAddSaving(true); setAddError('')
    try {
      const ugovor_url = newFile ? await uploadUgovor(newFile, newEmp) : null
      const res = await fetch('/api/smjestaj-stanari', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accommodation_id: id, employee_id: newEmp, datum_od: newOd, ugovor_url, room_id: movingInto === NO_ROOM ? null : movingInto }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Useljenje nije uspjelo.')
      setResidents(prev => [json, ...prev.map(r => r.employee_id === newEmp && !r.datum_do ? { ...r, datum_do: newOd } : r)])
      setMovingInto(null)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Useljenje nije uspjelo.')
    } finally {
      setAddSaving(false)
    }
  }

  async function updateResident(r: Resident, patch: Record<string, unknown>) {
    setBusyId(r.id)
    const res = await fetch(`/api/smjestaj-stanari/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    if (res.ok) {
      const json = await res.json()
      setResidents(prev => prev.map(x => x.id === r.id ? json : x))
    }
    setBusyId(null)
  }

  async function iseli(r: Resident) {
    const name = r.employees ? `${r.employees.ime} ${r.employees.prezime}` : 'radnika'
    if (!confirm(`Iseliti ${name} danas (${formatDatum(today())})?`)) return
    await updateResident(r, { datum_do: today() })
  }

  async function prilozUgovor(r: Resident, file: File | null) {
    if (!file) return
    setBusyId(r.id)
    try {
      const url = await uploadUgovor(file, r.employee_id)
      await updateResident(r, { ugovor_url: url })
    } catch { setBusyId(null) }
  }

  async function obrisiZapis(r: Resident) {
    if (!confirm('Obrisati ovaj zapis iz evidencije (npr. ako je unesen greškom)?')) return
    setBusyId(r.id)
    const res = await fetch(`/api/smjestaj-stanari/${r.id}`, { method: 'DELETE' })
    if (res.ok) setResidents(prev => prev.filter(x => x.id !== r.id))
    setBusyId(null)
  }

  if (loading) return <div className="p-8 text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
  if (!acc) return null

  const trenutni = residents.filter(r => jeTrenutni(r.datum_do))
  const bivsi = residents.filter(r => !jeTrenutni(r.datum_do))
  const kreveti = rooms.reduce((s, r) => s + (r.broj_kreveta || 0), 0)
  const kapacitet = efektivniKapacitet(acc.kapacitet, kreveti)
  const p = popunjenost(trenutni.length, kapacitet)
  const mjesto = [acc.adresa, acc.grad].filter(Boolean).join(', ')
  const smjesteniIds = new Set(trenutni.map(r => r.employee_id))
  const roomIds = new Set(rooms.map(r => r.id))
  const bezSobe = trenutni.filter(r => !r.room_id || !roomIds.has(r.room_id))
  const roomName = (rid: string | null) => rooms.find(r => r.id === rid)?.naziv

  // ── Redak stanara (koristi se u sobama i u "Bez sobe") ──
  function residentRow(r: Resident) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', opacity: busyId === r.id ? 0.5 : 1 }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: '#EFF6FF', color: '#2563EB' }}>
          {r.employees ? `${r.employees.ime[0]}${r.employees.prezime[0]}` : '?'}
        </div>
        <div className="flex-1 min-w-0">
          {r.employees ? (
            <Link href={`/zaposlenici/${r.employee_id}/pregled`} className="text-sm font-medium hover:underline block truncate" style={{ color: '#1E293B' }}>
              {r.employees.ime} {r.employees.prezime}
            </Link>
          ) : <span className="text-sm" style={{ color: '#94A3B8' }}>Obrisan radnik</span>}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs" style={{ color: '#64748B' }}>Od {formatDatum(r.datum_od)}</span>
            {r.ugovor_url ? (
              <a href={r.ugovor_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: '#DCFCE7', color: '#16A34A' }}>📄 Ugovor</a>
            ) : (
              <label className="text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer" style={{ background: '#FEF9C3', color: '#CA8A04' }}>
                Nema ugovora — priloži
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => prilozUgovor(r, e.target.files?.[0] || null)} />
              </label>
            )}
          </div>
        </div>
        {rooms.length > 0 && (
          <select aria-label="Premjesti u sobu" title="Premjesti u drugu sobu"
            className="text-xs px-2 py-1 rounded-lg border flex-shrink-0" style={{ borderColor: '#E2E8F0', color: '#475569', background: 'white', maxWidth: 120 }}
            value={r.room_id && roomIds.has(r.room_id) ? r.room_id : NO_ROOM}
            onChange={e => updateResident(r, { room_id: e.target.value === NO_ROOM ? null : e.target.value })}>
            {rooms.map(room => <option key={room.id} value={room.id}>{room.naziv}</option>)}
            <option value={NO_ROOM}>Bez sobe</option>
          </select>
        )}
        <button onClick={() => iseli(r)} disabled={busyId === r.id}
          className="btn-danger text-xs px-2.5 py-1 rounded-lg font-medium flex-shrink-0" style={{ background: '#FEF2F2', color: '#DC2626' }}>
          Iseli
        </button>
      </div>
    )
  }

  function moveInForm(roomLabel: string) {
    return (
      <form onSubmit={handleMoveIn} className="p-3 rounded-lg flex flex-col gap-3" style={{ background: '#F8FAFC', border: '1px solid #BFDBFE' }}>
        <p className="text-xs font-semibold" style={{ color: '#475569' }}>Useli radnika — {roomLabel}</p>
        <select required autoFocus className={inputCls} style={inputStyle} value={newEmp} onChange={e => setNewEmp(e.target.value)}>
          <option value="">Odaberi radnika...</option>
          {employees.filter(e => !smjesteniIds.has(e.id)).map(e => <option key={e.id} value={e.id}>{e.prezime} {e.ime}</option>)}
        </select>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Useljen od</label>
            <input type="date" className={inputCls} style={inputStyle} value={newOd} onChange={e => setNewOd(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Ugovor o smještaju</label>
            {newFile ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <span className="text-xs truncate" style={{ color: '#16A34A' }}>✓ {newFile.name}</span>
                <button type="button" onClick={() => setNewFile(null)} className="text-xs ml-auto" style={{ color: '#94A3B8' }}>✕</button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#D1D5DB', background: 'white', color: '#64748B' }}>
                📎 Priloži
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setNewFile(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>
        </div>
        <p className="text-xs" style={{ color: '#94A3B8' }}>Radnici koji su već ovdje nisu na popisu. Ako je radnik u drugom smještaju, tamo se automatski iseljava.</p>
        {addError && <p className="text-xs" style={{ color: '#DC2626' }}>{addError}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setMovingInto(null)} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
          <button type="submit" disabled={addSaving || !newEmp} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ background: addSaving || !newEmp ? '#93C5FD' : '#2563EB' }}>{addSaving ? 'Sprema...' : '✓ Useli'}</button>
        </div>
      </form>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <Link href="/smjestaj" className="text-sm" style={{ color: '#64748B' }}>← Smještaj</Link>

      {/* Header */}
      <div className="flex items-start justify-between mt-4 mb-5 gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ECFDF5', border: '2px solid #A7F3D0' }}>
            <span style={{ fontSize: 24 }}>🏠</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#1E293B' }}>{acc.naziv}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {mjesto && <span className="text-sm" style={{ color: '#64748B' }}>📍 {mjesto}</span>}
              <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: p.bg, color: p.color }}>
                {kapacitet ? `${p.label} mjesta popunjeno` : p.label}
              </span>
            </div>
          </div>
        </div>
        {!editing && (
          <button onClick={() => { setEditing(true); setError('') }}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white flex-shrink-0" style={{ background: '#2563EB' }}>
            ✏️ Uredi
          </button>
        )}
      </div>

      {editing && (
        <SmjestajForm title="Uredi smještaj" initial={smjestajDraft(acc)} saving={saving} error={error}
          onSave={handleSave} onCancel={() => setEditing(false)}
          extraLeft={
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="btn-danger text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              {deleting ? 'Briše...' : '🗑 Obriši smještaj'}
            </button>
          } />
      )}

      {/* Pregled */}
      <div className="bg-white rounded-2xl p-5 mb-4 grid grid-cols-2 md:grid-cols-6 gap-4" style={card}>
        <Stat label="Površina" value={acc.povrsina_m2 ? `${acc.povrsina_m2} m²` : '—'} />
        <Stat label="Sobe" value={rooms.length || acc.broj_soba || '—'} />
        <Stat label={kreveti > 0 ? 'Kreveti' : 'Kapacitet'} value={kapacitet ?? '—'} />
        <Stat label="Zauzeto" value={trenutni.length} />
        <Stat label="Slobodno" value={kapacitet ? Math.max(kapacitet - trenutni.length, 0) : '—'}
          tone={kapacitet && trenutni.length >= kapacitet ? '#DC2626' : '#16A34A'} />
        <Stat label="Najmodavac" value={acc.najmodavac || '—'} />
        {(acc.najmodavac_kontakt || acc.napomena) && (
          <div className="col-span-2 md:col-span-6 pt-3 flex flex-col gap-1" style={{ borderTop: '1px solid #F1F5F9' }}>
            {acc.najmodavac_kontakt && <span className="text-xs" style={{ color: '#64748B' }}>📞 Kontakt najmodavca: <span style={{ color: '#1E293B' }}>{acc.najmodavac_kontakt}</span></span>}
            {acc.napomena && <span className="text-xs whitespace-pre-line" style={{ color: '#64748B' }}>📝 {acc.napomena}</span>}
          </div>
        )}
      </div>

      {kapacitet && trenutni.length > kapacitet && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
          ⚠️ Smještaj je preko kapaciteta: {trenutni.length} radnika na {kapacitet} {kreveti > 0 ? 'kreveta' : 'mjesta'}.
        </div>
      )}

      {/* Sobe */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>🛏️ Sobe ({rooms.length})</p>
        {roomEditing === null && (
          <button onClick={() => { setRoomEditing('new'); setRoomError('') }} className="btn-link text-xs font-medium" style={{ color: '#2563EB' }}>+ Dodaj sobu</button>
        )}
      </div>
      {roomError && <p className="text-xs mb-2" style={{ color: '#DC2626' }}>{roomError}</p>}

      {rooms.length === 0 && roomEditing !== 'new' && (
        <div className="bg-white rounded-2xl p-6 mb-4 text-center text-sm" style={{ ...card, color: '#94A3B8' }}>
          Još nema soba. Dodaj sobe i broj kreveta pa smjesti radnike po sobama —
          kapacitet smještaja tada se računa iz kreveta.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 mb-4">
        {rooms.map(room => {
          const stanari = trenutni.filter(r => r.room_id === room.id)
          const slobodno = room.broj_kreveta - stanari.length
          const rp = popunjenost(stanari.length, room.broj_kreveta)
          const m2PoOsobi = room.povrsina_m2 && stanari.length ? (room.povrsina_m2 / stanari.length) : null
          return (
            <div key={room.id} className="bg-white rounded-2xl h-fit" style={card}>
              {roomEditing === room.id ? (
                <RoomForm saving={roomSaving} onSave={saveRoom} onCancel={() => setRoomEditing(null)} onDelete={() => deleteRoom(room)}
                  initial={{ naziv: room.naziv, broj_kreveta: String(room.broj_kreveta), povrsina_m2: room.povrsina_m2 ? String(room.povrsina_m2) : '' }} />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2 px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1E293B' }}>{room.naziv}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                        {room.broj_kreveta} {room.broj_kreveta === 1 ? 'krevet' : room.broj_kreveta < 5 ? 'kreveta' : 'kreveta'}
                        {room.povrsina_m2 ? ` · ${room.povrsina_m2} m²` : ''}
                        {m2PoOsobi ? ` · ${m2PoOsobi.toFixed(1)} m² po osobi` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: rp.bg, color: rp.color }}>{rp.label}</span>
                      {roomEditing === null && (
                        <button onClick={() => { setRoomEditing(room.id); setRoomError('') }} className="text-xs" style={{ color: '#2563EB' }}>Uredi</button>
                      )}
                    </div>
                  </div>
                  <div className="p-3 flex flex-col gap-2">
                    {stanari.map(r => <Fragment key={r.id}>{residentRow(r)}</Fragment>)}
                    {movingInto === room.id ? (
                      moveInForm(room.naziv)
                    ) : slobodno > 0 ? (
                      Array.from({ length: slobodno }).map((_, i) => (
                        <button key={i} onClick={() => openMoveIn(room.id)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left"
                          style={{ border: '1.5px dashed #CBD5E1', color: '#94A3B8', background: 'white' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#2563EB' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#94A3B8' }}>
                          <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F1F5F9' }}>🛏️</span>
                          Slobodan krevet — + Useli
                        </button>
                      ))
                    ) : slobodno < 0 ? (
                      <p className="text-xs px-1" style={{ color: '#DC2626' }}>⚠️ U sobi je {-slobodno} {-slobodno === 1 ? 'radnik' : 'radnika'} više nego kreveta.</p>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          )
        })}

        {roomEditing === 'new' && (
          <div className="bg-white rounded-2xl h-fit" style={{ ...card, border: '2px solid #2563EB' }}>
            <RoomForm saving={roomSaving} onSave={saveRoom} onCancel={() => setRoomEditing(null)}
              initial={{ naziv: `Soba ${rooms.length + 1}`, broj_kreveta: '2', povrsina_m2: '' }} />
          </div>
        )}
      </div>

      {/* Bez sobe */}
      {(bezSobe.length > 0 || rooms.length === 0) && (
        <div className="bg-white rounded-2xl mb-4" style={card}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>
              {rooms.length > 0 ? `👥 Bez dodijeljene sobe (${bezSobe.length})` : `👥 Radnici u smještaju (${bezSobe.length})`}
            </p>
            {movingInto !== NO_ROOM && (
              <button onClick={() => openMoveIn(NO_ROOM)} className="btn-link text-xs font-medium" style={{ color: '#2563EB' }}>+ Useli radnika</button>
            )}
          </div>
          <div className="p-3 flex flex-col gap-2">
            {bezSobe.map(r => <Fragment key={r.id}>{residentRow(r)}</Fragment>)}
            {movingInto === NO_ROOM && moveInForm(rooms.length > 0 ? 'bez sobe' : acc.naziv)}
            {bezSobe.length === 0 && movingInto !== NO_ROOM && (
              <p className="text-sm text-center py-4" style={{ color: '#94A3B8' }}>U ovom smještaju trenutno nema radnika.</p>
            )}
            {bezSobe.length > 0 && rooms.length > 0 && (
              <p className="text-xs px-1" style={{ color: '#94A3B8' }}>Odaberi sobu u padajućem izborniku pored radnika.</p>
            )}
          </div>
        </div>
      )}

      {/* Prijašnji stanari */}
      {bivsi.length > 0 && (
        <div className="bg-white rounded-2xl" style={card}>
          <button onClick={() => setShowHistory(s => !s)} className="w-full text-left px-4 py-3 text-xs font-medium" style={{ color: '#64748B' }}>
            {showHistory ? '▾' : '▸'} Prijašnji stanari ({bivsi.length})
          </button>
          {showHistory && bivsi.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-2" style={{ borderTop: '1px solid #F8FAFC', opacity: busyId === r.id ? 0.5 : 1 }}>
              <div className="flex-1 min-w-0">
                <span className="text-sm" style={{ color: '#475569' }}>{r.employees ? `${r.employees.ime} ${r.employees.prezime}` : 'Obrisan radnik'}</span>
                <span className="text-xs ml-2" style={{ color: '#94A3B8' }}>
                  {formatDatum(r.datum_od)} – {formatDatum(r.datum_do)}{roomName(r.room_id) ? ` · ${roomName(r.room_id)}` : ''}
                </span>
              </div>
              {r.ugovor_url && <a href={r.ugovor_url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: '#2563EB' }}>📄 Ugovor</a>}
              <button onClick={() => obrisiZapis(r)} className="text-xs" style={{ color: '#94A3B8' }} title="Obriši zapis">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
