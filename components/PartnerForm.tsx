'use client'

import { useState } from 'react'

export type Partner = {
  id: string
  naziv: string
  drzava: string | null
  grad: string | null
  adresa: string | null
  oib: string | null
  web: string | null
  email: string | null
  telefon: string | null
  usluge: string | null
  napomena: string | null
}

export type PartnerDraft = Record<'naziv' | 'drzava' | 'grad' | 'adresa' | 'oib' | 'web' | 'email' | 'telefon' | 'usluge' | 'napomena', string>

export function draftFrom(p?: Partial<Partner> | null): PartnerDraft {
  return {
    naziv: p?.naziv || '', drzava: p?.drzava || '', grad: p?.grad || '', adresa: p?.adresa || '',
    oib: p?.oib || '', web: p?.web || '', email: p?.email || '', telefon: p?.telefon || '',
    usluge: p?.usluge || '', napomena: p?.napomena || '',
  }
}

const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm'
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }

function L({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{children}</label>
}

/** Obrazac za novu ili postojeću partnersku agenciju. */
export default function PartnerForm({ title, initial, saving, error, onSave, onCancel, extraLeft }: {
  title: string; initial: PartnerDraft; saving: boolean; error?: string
  onSave: (d: PartnerDraft) => void; onCancel: () => void; extraLeft?: React.ReactNode
}) {
  const [d, setD] = useState<PartnerDraft>(initial)
  const set = (k: keyof PartnerDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD(p => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={e => { e.preventDefault(); if (d.naziv.trim()) onSave(d) }}
      className="bg-white rounded-xl p-5 mb-5" style={{ border: '2px solid #2563EB' }}>
      <p className="text-sm font-semibold mb-4" style={{ color: '#1E293B' }}>{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="md:col-span-2">
          <L>Naziv agencije *</L>
          <input autoFocus required className={inputCls} style={inputStyle} placeholder="npr. Himalayan Manpower Pvt. Ltd."
            value={d.naziv} onChange={set('naziv')} />
        </div>
        <div><L>Država</L><input className={inputCls} style={inputStyle} placeholder="npr. Nepal" value={d.drzava} onChange={set('drzava')} /></div>
        <div><L>Grad</L><input className={inputCls} style={inputStyle} placeholder="npr. Kathmandu" value={d.grad} onChange={set('grad')} /></div>
        <div className="md:col-span-2"><L>Adresa</L><input className={inputCls} style={inputStyle} value={d.adresa} onChange={set('adresa')} /></div>
        <div><L>OIB / porezni broj / licenca</L><input className={inputCls} style={inputStyle} value={d.oib} onChange={set('oib')} /></div>
        <div><L>Web stranica</L><input className={inputCls} style={inputStyle} placeholder="npr. agencija.com" value={d.web} onChange={set('web')} /></div>
        <div><L>Email</L><input type="email" className={inputCls} style={inputStyle} value={d.email} onChange={set('email')} /></div>
        <div><L>Telefon</L><input className={inputCls} style={inputStyle} value={d.telefon} onChange={set('telefon')} /></div>
        <div className="md:col-span-2">
          <L>Usluge / suradnja</L>
          <textarea rows={2} className={inputCls} style={inputStyle}
            placeholder="npr. regrutacija radnika iz Nepala, skladištari i vozači; plaćanje po radniku"
            value={d.usluge} onChange={set('usluge')} />
        </div>
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
