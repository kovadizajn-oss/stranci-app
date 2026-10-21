'use client'

import { useState } from 'react'
import { STATUS_VOZILA, type StatusVozila, type Vozilo } from '@/lib/vozila'

// Obrazac za novo vozilo / uređivanje vozila + oznaka registarske tablice.

export type VoziloDraft = Record<
  'marka' | 'model' | 'registracija' | 'broj_sasije' | 'godina' | 'lokacija' | 'status' | 'kilometraza' |
  'istek_registracije' | 'istek_tehnickog' | 'istek_osiguranja' | 'osiguravatelj' | 'broj_police' | 'napomena', string>

export function voziloDraft(v?: Partial<Vozilo> | null): VoziloDraft {
  const t = (x: unknown) => (x === null || x === undefined ? '' : String(x))
  return {
    marka: t(v?.marka), model: t(v?.model), registracija: t(v?.registracija), broj_sasije: t(v?.broj_sasije),
    godina: t(v?.godina), lokacija: t(v?.lokacija), status: v?.status || 'aktivno', kilometraza: t(v?.kilometraza),
    istek_registracije: t(v?.istek_registracije), istek_tehnickog: t(v?.istek_tehnickog), istek_osiguranja: t(v?.istek_osiguranja),
    osiguravatelj: t(v?.osiguravatelj), broj_police: t(v?.broj_police), napomena: t(v?.napomena),
  }
}

/** Registarska tablica u stilu hrvatske tablice */
export function Tablica({ oznaka, mala }: { oznaka: string | null; mala?: boolean }) {
  if (!oznaka) return null
  return (
    <span className="inline-flex items-stretch rounded overflow-hidden font-semibold whitespace-nowrap"
      style={{ border: '1.5px solid #1E293B', background: 'white', fontSize: mala ? 11 : 13, lineHeight: mala ? '16px' : '20px', letterSpacing: '0.04em' }}>
      <span className="flex items-center px-1" style={{ background: '#1D4ED8', color: 'white', fontSize: mala ? 7 : 8, letterSpacing: 0 }}>HR</span>
      <span className="px-1.5" style={{ color: '#0F172A' }}>{oznaka}</span>
    </span>
  )
}

const card = { boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }
const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm'
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }

function L({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{children}</label>
}

export default function VoziloForm({ title, initial, saving, error, onSave, onCancel, onDelete }: {
  title: string
  initial: VoziloDraft
  saving: boolean
  error: string
  onSave: (d: VoziloDraft) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [d, setD] = useState<VoziloDraft>(initial)
  const set = (k: keyof VoziloDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value })

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(d) }} className="bg-white rounded-2xl p-5 mb-4" style={card}>
      <p className="font-semibold text-sm mb-4" style={{ color: '#1E293B' }}>{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><L>Marka *</L><input required className={inputCls} style={inputStyle} placeholder="npr. Volkswagen" value={d.marka} onChange={set('marka')} /></div>
        <div><L>Model / tip</L><input className={inputCls} style={inputStyle} placeholder="npr. Transporter" value={d.model} onChange={set('model')} /></div>
        <div><L>Registarska oznaka</L><input className={inputCls} style={inputStyle} placeholder="npr. ZG1234AB" value={d.registracija} onChange={set('registracija')} /></div>
        <div><L>Broj šasije (VIN)</L><input className={inputCls} style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }} value={d.broj_sasije} onChange={set('broj_sasije')} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><L>Godište</L><input inputMode="numeric" className={inputCls} style={inputStyle} placeholder="npr. 2015" value={d.godina} onChange={set('godina')} /></div>
          <div><L>Kilometraža</L><input inputMode="numeric" className={inputCls} style={inputStyle} placeholder="km" value={d.kilometraza} onChange={set('kilometraza')} /></div>
        </div>
        <div><L>Lokacija</L><input className={inputCls} style={inputStyle} placeholder="npr. Velika Gorica" value={d.lokacija} onChange={set('lokacija')} /></div>

        <div className="md:col-span-2">
          <L>Status</L>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STATUS_VOZILA) as StatusVozila[]).map(s => {
              const c = STATUS_VOZILA[s]; const on = d.status === s
              return (
                <button key={s} type="button" onClick={() => setD({ ...d, status: s })} className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
                  style={on ? { background: c.bg, color: c.color, boxShadow: `0 0 0 1.5px ${c.color}` } : { background: 'white', color: '#64748B', border: '1px solid #E2E8F0' }}>
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div><L>📋 Registracija vrijedi do</L><input type="date" className={inputCls} style={inputStyle} value={d.istek_registracije} onChange={set('istek_registracije')} /></div>
          <div><L>✅ Tehnički pregled do</L><input type="date" className={inputCls} style={inputStyle} value={d.istek_tehnickog} onChange={set('istek_tehnickog')} /></div>
          <div><L>🛡️ Osiguranje vrijedi do</L><input type="date" className={inputCls} style={inputStyle} value={d.istek_osiguranja} onChange={set('istek_osiguranja')} /></div>
        </div>
        <div><L>Osiguravatelj</L><input className={inputCls} style={inputStyle} placeholder="npr. Croatia osiguranje" value={d.osiguravatelj} onChange={set('osiguravatelj')} /></div>
        <div><L>Broj police</L><input className={inputCls} style={inputStyle} value={d.broj_police} onChange={set('broj_police')} /></div>
        <div className="md:col-span-2"><L>Napomena</L><textarea rows={2} className={inputCls} style={inputStyle} value={d.napomena} onChange={set('napomena')} /></div>
      </div>
      {error && <p className="text-xs mt-3" style={{ color: '#DC2626' }}>{error}</p>}
      <div className="flex gap-2 items-center mt-4">
        {onDelete && (
          <button type="button" onClick={onDelete} className="btn-danger text-xs px-3 py-2 rounded-lg font-medium" style={{ background: '#FEF2F2', color: '#DC2626' }}>Obriši vozilo</button>
        )}
        <div className="flex-1" />
        <button type="button" onClick={onCancel} className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
        <button type="submit" disabled={saving} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: saving ? '#93C5FD' : '#2563EB' }}>{saving ? 'Sprema...' : '✓ Spremi'}</button>
      </div>
    </form>
  )
}
