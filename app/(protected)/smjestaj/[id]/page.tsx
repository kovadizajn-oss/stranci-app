'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SmjestajForm, { smjestajDraft, type Smjestaj, type SmjestajDraft } from '@/components/SmjestajForm'
import { formatDatum, jeTrenutni, popunjenost } from '@/lib/smjestaj'

type Resident = {
  id: string
  employee_id: string
  datum_od: string
  datum_do: string | null
  ugovor_url: string | null
  napomena: string | null
  employees: { id: string; ime: string; prezime: string; status_zaposlenika: string | null } | null
}
type Employee = { id: string; ime: string; prezime: string }

const card = { boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }
const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm'
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }
const today = () => new Date().toISOString().slice(0, 10)

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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col mb-3">
      <span className="text-xs mb-0.5" style={{ color: '#94A3B8' }}>{label}</span>
      <span className="text-sm whitespace-pre-line" style={{ color: '#1E293B' }}>{children}</span>
    </div>
  )
}

export default function SmjestajDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [acc, setAcc] = useState<Smjestaj | null>(null)
  const [residents, setResidents] = useState<Resident[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const [adding, setAdding] = useState(false)
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
      setEmployees(json.employees || [])
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleSave(d: SmjestajDraft) {
    setSaving(true); setError('')
    const res = await fetch(`/api/smjestaj/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Spremanje nije uspjelo.'); return }
    setAcc(json); setEditing(false)
  }

  async function handleDelete() {
    if (!confirm('Obrisati ovaj smještaj? Obrisat će se i evidencija tko je u njemu živio.')) return
    setDeleting(true)
    await fetch(`/api/smjestaj/${id}`, { method: 'DELETE' })
    router.push('/smjestaj')
  }

  async function handleAddResident(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmp) return
    setAddSaving(true); setAddError('')
    try {
      const ugovor_url = newFile ? await uploadUgovor(newFile, newEmp) : null
      const res = await fetch('/api/smjestaj-stanari', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accommodation_id: id, employee_id: newEmp, datum_od: newOd, ugovor_url }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Useljenje nije uspjelo.')
      setResidents(prev => [json, ...prev])
      setAdding(false); setNewEmp(''); setNewOd(today()); setNewFile(null)
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

  async function zamijeniUgovor(r: Resident, file: File | null) {
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
  const p = popunjenost(trenutni.length, acc.kapacitet)
  const mjesto = [acc.adresa, acc.grad].filter(Boolean).join(', ')
  const smjesteniIds = new Set(trenutni.map(r => r.employee_id))

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link href="/smjestaj" className="text-sm" style={{ color: '#64748B' }}>← Smještaj</Link>

      <div className="flex items-start justify-between mt-4 mb-6 gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ECFDF5', border: '2px solid #A7F3D0' }}>
            <span style={{ fontSize: 24 }}>🏠</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#1E293B' }}>{acc.naziv}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {mjesto && <span className="text-sm" style={{ color: '#64748B' }}>📍 {mjesto}</span>}
              <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: p.bg, color: p.color }}>
                {acc.kapacitet ? `${p.label} mjesta popunjeno` : p.label}
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

      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        {/* Radnici */}
        <div className="bg-white rounded-2xl h-fit" style={card}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>👥 Radnici u smještaju ({trenutni.length})</p>
            {!adding && (
              <button onClick={() => { setAdding(true); setAddError('') }} className="btn-link text-xs font-medium" style={{ color: '#2563EB' }}>+ Useli radnika</button>
            )}
          </div>

          {acc.kapacitet && trenutni.length > acc.kapacitet && (
            <div className="mx-5 mt-4 px-3 py-2 rounded-lg text-xs" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
              ⚠️ Smještaj je preko kapaciteta ({trenutni.length} radnika na {acc.kapacitet} mjesta).
            </div>
          )}

          {adding && (
            <form onSubmit={handleAddResident} className="mx-5 mt-4 p-4 rounded-lg flex flex-col gap-3" style={{ background: '#F8FAFC', border: '1px solid #BFDBFE' }}>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Radnik *</label>
                <select required className={inputCls} style={inputStyle} value={newEmp} onChange={e => setNewEmp(e.target.value)}>
                  <option value="">Odaberi radnika...</option>
                  {employees.filter(e => !smjesteniIds.has(e.id)).map(e => (
                    <option key={e.id} value={e.id}>{e.prezime} {e.ime}</option>
                  ))}
                </select>
                <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Ako je radnik u drugom smještaju, tamo se automatski iseljava.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Useljen od</label>
                  <input type="date" className={inputCls} style={inputStyle} value={newOd} onChange={e => setNewOd(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Potpisani ugovor o smještaju</label>
                  {newFile ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                      <span className="text-xs truncate" style={{ color: '#16A34A' }}>✓ {newFile.name}</span>
                      <button type="button" onClick={() => setNewFile(null)} className="text-xs ml-auto" style={{ color: '#94A3B8' }}>✕</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#D1D5DB', background: 'white', color: '#64748B' }}>
                      📎 Priloži (PDF, JPG, PNG)
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setNewFile(e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>
              </div>
              {addError && <p className="text-xs" style={{ color: '#DC2626' }}>{addError}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setAdding(false); setNewFile(null) }} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
                <button type="submit" disabled={addSaving || !newEmp} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ background: addSaving || !newEmp ? '#93C5FD' : '#2563EB' }}>{addSaving ? 'Sprema...' : '✓ Useli'}</button>
              </div>
            </form>
          )}

          {trenutni.length === 0 && !adding ? (
            <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>U ovom smještaju trenutno nema radnika.</div>
          ) : (
            <div className="mt-2">
              {trenutni.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3"
                  style={{ borderBottom: i < trenutni.length - 1 ? '1px solid #F1F5F9' : 'none', opacity: busyId === r.id ? 0.5 : 1 }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    {r.employees ? `${r.employees.ime[0]}${r.employees.prezime[0]}` : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    {r.employees ? (
                      <Link href={`/zaposlenici/${r.employee_id}/pregled`} className="text-sm font-medium hover:underline" style={{ color: '#1E293B' }}>
                        {r.employees.ime} {r.employees.prezime}
                      </Link>
                    ) : <span className="text-sm" style={{ color: '#94A3B8' }}>Obrisan radnik</span>}
                    <p className="text-xs" style={{ color: '#64748B' }}>
                      Od {formatDatum(r.datum_od)}{r.datum_do ? ` · do ${formatDatum(r.datum_do)}` : ''}
                    </p>
                  </div>
                  {r.ugovor_url ? (
                    <a href={r.ugovor_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0" style={{ background: '#DCFCE7', color: '#16A34A' }}>📄 Ugovor</a>
                  ) : (
                    <label className="text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer flex-shrink-0" style={{ background: '#FEF9C3', color: '#CA8A04' }}>
                      Nema ugovora — priloži
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => zamijeniUgovor(r, e.target.files?.[0] || null)} />
                    </label>
                  )}
                  <button onClick={() => iseli(r)} disabled={busyId === r.id}
                    className="btn-danger text-xs px-2.5 py-1 rounded-lg font-medium flex-shrink-0" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                    Iseli
                  </button>
                </div>
              ))}
            </div>
          )}

          {bivsi.length > 0 && (
            <div style={{ borderTop: '1px solid #F1F5F9' }}>
              <button onClick={() => setShowHistory(s => !s)} className="w-full text-left px-5 py-3 text-xs font-medium" style={{ color: '#64748B' }}>
                {showHistory ? '▾' : '▸'} Prijašnji stanari ({bivsi.length})
              </button>
              {showHistory && bivsi.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-2" style={{ opacity: busyId === r.id ? 0.5 : 0.75 }}>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm" style={{ color: '#475569' }}>{r.employees ? `${r.employees.ime} ${r.employees.prezime}` : 'Obrisan radnik'}</span>
                    <span className="text-xs ml-2" style={{ color: '#94A3B8' }}>{formatDatum(r.datum_od)} – {formatDatum(r.datum_do)}</span>
                  </div>
                  {r.ugovor_url && <a href={r.ugovor_url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: '#2563EB' }}>📄 Ugovor</a>}
                  <button onClick={() => obrisiZapis(r)} className="text-xs" style={{ color: '#94A3B8' }} title="Obriši zapis">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Podaci */}
        <div className="bg-white rounded-2xl p-5 h-fit" style={card}>
          <p className="font-semibold text-sm mb-4" style={{ color: '#1E293B', borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>ℹ️ Podaci o smještaju</p>
          <div className="grid grid-cols-2 gap-x-4">
            <Row label="Površina">{acc.povrsina_m2 ? `${acc.povrsina_m2} m²` : '—'}</Row>
            <Row label="Broj soba">{acc.broj_soba ?? '—'}</Row>
            <Row label="Kapacitet">{acc.kapacitet ? `${acc.kapacitet} radnika` : '—'}</Row>
            <Row label="Slobodno">{acc.kapacitet ? Math.max(acc.kapacitet - trenutni.length, 0) : '—'}</Row>
          </div>
          {(acc.najmodavac || acc.najmodavac_kontakt) && (
            <div className="pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
              {acc.najmodavac && <Row label="Najmodavac / vlasnik">{acc.najmodavac}</Row>}
              {acc.najmodavac_kontakt && <Row label="Kontakt">{acc.najmodavac_kontakt}</Row>}
            </div>
          )}
          {acc.napomena && <div className="pt-3" style={{ borderTop: '1px solid #F1F5F9' }}><Row label="Napomena">{acc.napomena}</Row></div>}
        </div>
      </div>
    </div>
  )
}
