'use client'

import { useState } from 'react'
import { OBRASCI, POSLODAVAC_KLJUCEVI, type IzvorObrasca, type Obrazac, type Prefill, type SekcijaPolja } from '@/lib/obrasci'
import type { Dokument } from '@/lib/dokumenti'

// "📄 Generiraj dokument": odabir obrasca → provjera podataka (prazno = žuto) → PDF.

const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm'
const SEKCIJE: SekcijaPolja[] = ['Poslodavac', 'Radnik', 'Ostalo']

function nazivDatoteke(obrazac: Obrazac, ime: string) {
  const cisto = (ime || 'radnik').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_')
  return `${obrazac.id}_${cisto}.${obrazac.format}`
}

export default function GenerirajDokument({ employeeId, onSpremljeno }: {
  employeeId: string
  onSpremljeno?: (d: Dokument) => void
}) {
  const [open, setOpen] = useState(false)
  const [obrazac, setObrazac] = useState<Obrazac | null>(null)
  const [izvor, setIzvor] = useState<IzvorObrasca | null>(null)
  const [prefill, setPrefill] = useState<Prefill>({})
  const [v, setV] = useState<Record<string, string>>({})
  const [zapamti, setZapamti] = useState(true)
  const [busy, setBusy] = useState<'' | 'ucitavanje' | 'otvori' | 'preuzmi' | 'spremi'>('')
  const [error, setError] = useState('')
  const [poruka, setPoruka] = useState('')

  function zatvori() { setOpen(false); setObrazac(null); setError(''); setPoruka('') }

  async function odaberi(o: Obrazac) {
    setBusy('ucitavanje'); setError(''); setPoruka('')
    try {
      let iz = izvor
      if (!iz) {
        const res = await fetch(`/api/obrasci/podaci/${employeeId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Podaci radnika se ne mogu učitati.')
        iz = data as IzvorObrasca
        setIzvor(iz)
      }
      const p = o.popuni(iz)
      setPrefill(p)
      setV(Object.fromEntries(Object.entries(p).map(([k, x]) => [k, x.value])))
      setObrazac(o)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška.')
    }
    setBusy('')
  }

  const poslodavacPromijenjen = !!obrazac && POSLODAVAC_KLJUCEVI.some(k => k in v && v[k] !== (prefill[k]?.value || ''))

  async function pripremi() {
    if (!obrazac || !izvor) throw new Error('Obrazac nije odabran.')
    // Zapamti izmijenjene podatke poslodavca (agencija ili tvrtka) za sljedeći put
    if (zapamti && poslodavacPromijenjen) {
      // Šalju se samo polja koja ovaj obrazac ima (ostala ostaju kako jesu)
      const promjene: Record<string, string> = {}
      for (const k of POSLODAVAC_KLJUCEVI) if (k in v) promjene[k.replace('poslodavac_', '')] = v[k] || ''
      const res = await fetch('/api/obrasci/poslodavac', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tip: izvor.poslodavac.tip, company_id: izvor.poslodavac.company_id, ...promjene }),
      })
      if (res.ok) {
        const novo = Object.fromEntries(Object.entries(promjene).map(([k, x]) => [k, x || null]))
        setIzvor({
          ...izvor,
          poslodavac: { ...izvor.poslodavac, ...novo },
          agencija: izvor.poslodavac.tip === 'agencija' ? { ...izvor.agencija, ...novo } : izvor.agencija,
        })
        setPrefill(p => ({ ...p, ...Object.fromEntries(POSLODAVAC_KLJUCEVI.filter(k => k in v).map(k => [k, { value: v[k] || '' }])) }))
      }
    }
    const { generiraj } = await import('@/lib/obrasci/generiraj')
    return generiraj(obrazac, v)
  }

  const imeRadnika = () => [izvor?.radnik.ime, izvor?.radnik.prezime].filter(Boolean).join(' ')

  async function otvori() {
    // Prozor se otvara odmah (inače ga preglednik blokira), PDF se učita kad je gotov
    const prozor = window.open('', '_blank')
    setBusy('otvori'); setError('')
    try {
      const { bytes, tip } = await pripremi()
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: tip }))
      if (prozor) prozor.location.href = url
      else window.location.href = url
    } catch (e) {
      prozor?.close()
      setError(e instanceof Error ? e.message : 'Generiranje nije uspjelo.')
    }
    setBusy('')
  }

  async function preuzmi() {
    setBusy('preuzmi'); setError('')
    try {
      const { bytes, tip } = await pripremi()
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: tip }))
      const a = document.createElement('a')
      a.href = url
      a.download = nazivDatoteke(obrazac!, imeRadnika())
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generiranje nije uspjelo.')
    }
    setBusy('')
  }

  async function spremi() {
    if (!obrazac) return
    setBusy('spremi'); setError(''); setPoruka('')
    try {
      const { bytes, tip } = await pripremi()
      const ime = nazivDatoteke(obrazac, imeRadnika())
      const fd = new FormData()
      fd.append('file', new File([new Uint8Array(bytes)], ime, { type: tip }))
      fd.append('path', `${employeeId}/doc_${Date.now()}_${ime}`)
      const up = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!up.ok) throw new Error('Učitavanje dokumenta nije uspjelo.')
      const { url } = await up.json()
      const danas = new Date().toISOString().slice(0, 10)
      const payload = { employee_id: employeeId, naziv: obrazac.nazivDokumenta, kategorija: 'prateci' as const, datum_izdavanja: danas, datum_isteka: null, file_url: url }
      const res = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Spremanje u dokumente nije uspjelo.')
      onSpremljeno?.({ ...payload, id: data.id })
      setPoruka('✓ Spremljeno u dokumente radnika')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška.')
    }
    setBusy('')
  }

  const fali = (k: string) => {
    const p = prefill[k]
    const polje = obrazac?.polja.find(x => x.key === k)
    if (polje?.vrsta === 'izbor') return !v[k]
    return !!p?.nedostaje && (v[k] || '') === (p.value || '')
  }
  const brojNedostaje = obrazac ? obrazac.polja.filter(p => fali(p.key)).length : 0

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium flex-shrink-0"
        style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
        📄 Generiraj dokument
      </button>

      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 md:p-6" style={{ background: 'rgba(15,23,42,0.45)' }} onClick={zatvori}>
          <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            {/* Zaglavlje */}
            <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>{obrazac ? obrazac.naziv : '📄 Generiraj dokument'}</p>
                <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                  {obrazac
                    ? (brojNedostaje > 0 ? `Provjeri podatke — ${brojNedostaje} ${brojNedostaje === 1 ? 'polje treba' : 'polja trebaju'} dopunu (žuto).` : 'Svi podaci su popunjeni.')
                    : 'Odaberi obrazac — podaci radnika upisuju se automatski.'}
                </p>
              </div>
              <button type="button" onClick={zatvori} className="text-lg leading-none px-2" style={{ color: '#94A3B8' }} aria-label="Zatvori">✕</button>
            </div>

            {/* Sadržaj */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!obrazac ? (
                <div className="flex flex-col gap-2">
                  {OBRASCI.map(o => (
                    <button key={o.id} type="button" onClick={() => odaberi(o)} disabled={busy === 'ucitavanje'}
                      className="text-left flex items-center gap-3 p-3.5 rounded-xl transition-colors hover:bg-slate-50"
                      style={{ border: '1px solid #E2E8F0' }}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: o.format === 'pdf' ? '#FEF2F2' : '#EFF6FF' }}>{o.format === 'pdf' ? '📕' : '📘'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>{o.naziv} <span className="text-xs font-medium ml-1 px-1.5 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#64748B' }}>{o.format === 'pdf' ? 'PDF' : 'Word'}</span></p>
                        <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{o.opis}</p>
                      </div>
                      <span className="text-xs font-medium" style={{ color: '#2563EB' }}>{busy === 'ucitavanje' ? 'Učitavanje...' : 'Odaberi →'}</span>
                    </button>
                  ))}
                  <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>📕 PDF obrasci otvaraju se odmah u pregledniku, 📘 Word dokumenti preuzimaju se kao .docx (možeš ih još urediti prije ispisa).</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <button type="button" onClick={() => { setObrazac(null); setError(''); setPoruka('') }} className="text-xs w-fit" style={{ color: '#64748B' }}>← Drugi obrazac</button>
                  {SEKCIJE.map(sek => {
                    const polja = obrazac.polja.filter(p => p.sekcija === sek)
                    if (polja.length === 0) return null
                    return (
                      <div key={sek}>
                        <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#94A3B8', letterSpacing: '0.04em' }}>
                          {sek === 'Poslodavac' && izvor ? `Poslodavac · ${izvor.poslodavac.tip === 'agencija' ? 'agencija (ustupanje)' : 'tvrtka (izravno zaposlenje)'}` : sek}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {polja.map(p => {
                            const zuto = fali(p.key)
                            const stil = { borderColor: zuto ? '#FACC15' : '#D1D5DB', background: zuto ? '#FEFCE8' : 'white', color: '#1E293B' }
                            const siroko = p.siroko || p.vrsta === 'dugi' || p.vrsta === 'izbor'
                            return (
                              <div key={p.key} className={siroko ? 'sm:col-span-2' : ''}>
                                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{p.label}</label>
                                {p.vrsta === 'izbor' ? (
                                  <div className="flex flex-wrap gap-1.5 p-1 rounded-lg" style={zuto ? { background: '#FEFCE8', border: '1px solid #FACC15' } : {}}>
                                    {p.opcije!.map(o => {
                                      const on = v[p.key] === o.value
                                      return (
                                        <button key={o.value} type="button" onClick={() => setV({ ...v, [p.key]: on ? '' : o.value })}
                                          className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
                                          style={on ? { background: '#EFF6FF', color: '#2563EB', boxShadow: '0 0 0 1.5px #2563EB' } : { background: 'white', color: '#64748B', border: '1px solid #E2E8F0' }}>
                                          {o.label}
                                        </button>
                                      )
                                    })}
                                  </div>
                                ) : p.vrsta === 'dugi' ? (
                                  <textarea rows={2} className={inputCls} style={stil} placeholder={p.placeholder} value={v[p.key] || ''} onChange={e => setV({ ...v, [p.key]: e.target.value })} />
                                ) : (
                                  <input className={inputCls} style={stil} placeholder={p.placeholder} value={v[p.key] || ''} onChange={e => setV({ ...v, [p.key]: e.target.value })} />
                                )}
                                {zuto && prefill[p.key]?.nedostaje && (
                                  <p className="text-xs mt-1" style={{ color: '#A16207' }}>Nedostaje: {prefill[p.key]!.nedostaje}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {sek === 'Poslodavac' && poslodavacPromijenjen && (
                          <label className="flex items-center gap-2 text-xs mt-2 cursor-pointer" style={{ color: '#475569' }}>
                            <input type="checkbox" checked={zapamti} onChange={e => setZapamti(e.target.checked)} />
                            Zapamti ove podatke {izvor?.poslodavac.tip === 'agencija' ? 'agencije' : 'tvrtke'} za sljedeće obrasce
                          </label>
                        )}
                      </div>
                    )
                  })}
                  <p className="text-xs" style={{ color: '#94A3B8' }}>
                    Izmjene ovdje vrijede samo za ovaj obrazac. Trajno ih ispravi na stranici Uredi radnika (npr. mjesto rođenja, broj putovnice).
                  </p>
                </div>
              )}
              {error && <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</p>}
            </div>

            {/* Akcije */}
            {obrazac && (
              <div className="flex items-center gap-2 px-5 py-3.5 flex-shrink-0 flex-wrap" style={{ borderTop: '1px solid #F1F5F9' }}>
                <span className="text-xs flex-1 min-w-0" style={{ color: '#16A34A' }}>{poruka}</span>
                <button type="button" onClick={spremi} disabled={!!busy} className="btn-secondary px-3 py-2 rounded-lg text-xs font-medium"
                  style={{ background: '#F1F5F9', color: '#374151' }}>{busy === 'spremi' ? 'Sprema...' : '💾 Spremi u dokumente'}</button>
                <button type="button" onClick={preuzmi} disabled={!!busy} className="btn-secondary px-3 py-2 rounded-lg text-xs font-medium"
                  style={obrazac.format === 'pdf' ? { background: '#EFF6FF', color: '#2563EB' } : { background: busy ? '#93C5FD' : '#2563EB', color: 'white' }}>
                  {busy === 'preuzmi' ? 'Priprema...' : obrazac.format === 'pdf' ? '⬇ Preuzmi PDF' : '⬇ Preuzmi Word'}
                </button>
                {obrazac.format === 'pdf' && (
                  <button type="button" onClick={otvori} disabled={!!busy} className="btn-primary px-4 py-2 rounded-lg text-xs font-medium text-white"
                    style={{ background: busy ? '#93C5FD' : '#2563EB' }}>{busy === 'otvori' ? 'Priprema...' : '↗ Otvori PDF'}</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
