'use client'

import { useState } from 'react'

export type Smjestaj = {
  id: string
  naziv: string
  adresa: string | null
  grad: string | null
  povrsina_m2: number | null
  broj_soba: number | null
  kapacitet: number | null
  najmodavac: string | null
  najmodavac_kontakt: string | null
  napomena: string | null
}

export type SmjestajDraft = Record<'naziv' | 'adresa' | 'grad' | 'povrsina_m2' | 'broj_soba' | 'kapacitet' | 'najmodavac' | 'najmodavac_kontakt' | 'napomena', string>

export function smjestajDraft(s?: Partial<Smjestaj> | null): SmjestajDraft {
  const t = (v: unknown) => (v === null || v === undefined ? '' : String(v))
  return {
    naziv: t(s?.naziv), adresa: t(s?.adresa), grad: t(s?.grad), povrsina_m2: t(s?.povrsina_m2),
    broj_soba: t(s?.broj_soba), kapacitet: t(s?.kapacitet), najmodavac: t(s?.najmodavac),
    najmodavac_kontakt: t(s?.najmodavac_kontakt), napomena: t(s?.napomena),
  }
}

const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm'
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }

function L({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{children}</label>
}

export default function SmjestajForm({ title, initial, saving, error, onSave, onCancel, extraLeft }: {
  title: string; initial: SmjestajDraft; saving: boolean; error?: string
  onSave: (d: SmjestajDraft) => void; onCancel: () => void; extraLeft?: React.ReactNode
}) {
  const [d, setD] = useState<SmjestajDraft>(initial)
  const set = (k: keyof SmjestajDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD(p => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={e => { e.preventDefault(); if (d.naziv.trim()) onSave(d) }}
      className="bg-white rounded-xl p-5 mb-5" style={{ border: '2px solid #2563EB' }}>
      <p className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="md:col-span-2">
          <L>Naziv smještaja *</L>
          <input autoFocus required className={inputCls} style={inputStyle} placeholder="npr. Kuća Vukovina — Stara cesta 26"
            value={d.naziv} onChange={set('naziv')} />
        </div>
        <div><L>Adresa</L><input className={inputCls} style={inputStyle} placeholder="npr. Stara cesta 26" value={d.adresa} onChange={set('adresa')} /></div>
        <div><L>Grad / mjesto</L><input className={inputCls} style={inputStyle} placeholder="npr. 10419 Vukovina" value={d.grad} onChange={set('grad')} /></div>
        <div className="grid grid-cols-3 gap-3 md:col-span-2">
          <div><L>Površina (m²)</L><input inputMode="decimal" className={inputCls} style={inputStyle} value={d.povrsina_m2} onChange={set('povrsina_m2')} /></div>
          <div><L>Broj soba</L><input inputMode="numeric" className={inputCls} style={inputStyle} value={d.broj_soba} onChange={set('broj_soba')} /></div>
          <div><L>Kapacitet (radnika)</L><input inputMode="numeric" className={inputCls} style={inputStyle} value={d.kapacitet} onChange={set('kapacitet')} /></div>
        </div>
        <div><L>Najmodavac / vlasnik</L><input className={inputCls} style={inputStyle} value={d.najmodavac} onChange={set('najmodavac')} /></div>
        <div><L>Kontakt najmodavca</L><input className={inputCls} style={inputStyle} placeholder="telefon ili email" value={d.najmodavac_kontakt} onChange={set('najmodavac_kontakt')} /></div>
        <div className="md:col-span-2">
          <L>Napomena</L>
          <textarea rows={2} className={inputCls} style={inputStyle} value={d.napomena} onChange={set('napomena')} />
        </div>
      </div>
      {error && <p className="text-xs mb-2" style={{ color: '#DC2626' }}>{error}</p>}
      <div className="flex items-center justify-between pt-2">
        <div>{extraLeft}</div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
          <button type="submit" disabled={saving} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: saving ? '#93C5FD' : '#2563EB' }}>{saving ? 'Sprema...' : '✓ Spremi'}</button>
        </div>
      </div>
    </form>
  )
}
