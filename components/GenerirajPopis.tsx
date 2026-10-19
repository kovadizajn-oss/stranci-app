'use client'

import { useEffect, useState } from 'react'
import { POPISI, type IzvorObrasca, type ObrazacPopis, type Prefill } from '@/lib/obrasci'

// Popis više radnika (npr. za liječnički pregled): odabrani radnici → tablica za provjeru → Word.

type Red = { id: string; prefill: Prefill; v: Record<string, string> }

const vrijednosti = (p: Prefill) => Object.fromEntries(Object.entries(p).map(([k, x]) => [k, x.value]))

export default function GenerirajPopis({ employeeIds, onClose }: { employeeIds: string[]; onClose: () => void }) {
  const [popis, setPopis] = useState<ObrazacPopis | null>(POPISI.length === 1 ? POPISI[0] : null)
  const [izvori, setIzvori] = useState<{ id: string; izvor: IzvorObrasca }[] | null>(null)
  const [redovi, setRedovi] = useState<Red[]>([])
  const [zajPrefill, setZajPrefill] = useState<Prefill>({})
  const [zaj, setZaj] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Učitaj podatke svih odabranih radnika
  useEffect(() => {
    let prekid = false
    Promise.all(employeeIds.map(async id => {
      const res = await fetch(`/api/obrasci/podaci/${id}`)
      if (!res.ok) throw new Error('Podaci radnika se ne mogu učitati.')
      return { id, izvor: (await res.json()) as IzvorObrasca }
    }))
      .then(r => { if (!prekid) setIzvori(r) })
      .catch(e => { if (!prekid) setError(e instanceof Error ? e.message : 'Greška.') })
    return () => { prekid = true }
  }, [employeeIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Kad su podaci i popis spremni, pripremi retke
  useEffect(() => {
    if (!popis || !izvori) return
    const r = izvori.map(({ id, izvor }) => { const prefill = popis.redak(izvor); return { id, prefill, v: vrijednosti(prefill) } })
    r.sort((a, b) => (a.v.prezime || '').localeCompare(b.v.prezime || '', 'hr'))
    setRedovi(r)
    const zp = popis.zajednickoPopuni(izvori.map(x => x.izvor))
    setZajPrefill(zp)
    setZaj(vrijednosti(zp))
  }, [popis, izvori])

  const fali = (p: Prefill, v: Record<string, string>, k: string) => !!p[k]?.nedostaje && (v[k] || '') === (p[k].value || '')
  const brojNedostaje = redovi.reduce((s, r) => s + (popis?.stupci.filter(st => fali(r.prefill, r.v, st.key)).length || 0), 0)

  async function preuzmi() {
    if (!popis) return
    setBusy(true); setError('')
    try {
      const { generirajPopis } = await import('@/lib/obrasci/generiraj')
      const bytes = await generirajPopis(popis, redovi.map(r => r.v), zaj)
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${popis.nazivDatoteke}_${new Date().toISOString().slice(0, 10)}.docx`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generiranje nije uspjelo.')
    }
    setBusy(false)
  }

  const inputCls = 'w-full px-2 py-1.5 rounded-md border text-xs'

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 md:p-6" style={{ background: 'rgba(15,23,42,0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-6xl flex flex-col" style={{ maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>{popis ? `📘 ${popis.naziv}` : '📘 Popis za više radnika'} · {employeeIds.length} {employeeIds.length === 1 ? 'radnik' : 'radnika'}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
              {!izvori ? 'Učitavanje podataka...' : brojNedostaje > 0 ? `${brojNedostaje} ${brojNedostaje === 1 ? 'polje nedostaje' : 'polja nedostaju'} (žuto) — možeš ih upisati ovdje ili ostaviti prazno.` : 'Svi podaci su popunjeni.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-lg leading-none px-2" style={{ color: '#94A3B8' }} aria-label="Zatvori">✕</button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {!popis ? (
            <div className="flex flex-col gap-2">
              {POPISI.map(p => (
                <button key={p.id} type="button" onClick={() => setPopis(p)} className="text-left p-3.5 rounded-xl hover:bg-slate-50" style={{ border: '1px solid #E2E8F0' }}>
                  <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>{p.naziv}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{p.opis}</p>
                </button>
              ))}
            </div>
          ) : !izvori ? (
            <p className="text-sm py-8 text-center" style={{ color: '#94A3B8' }}>{error || 'Učitavanje...'}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {popis.zajednicka.map(p => {
                  const zuto = fali(zajPrefill, zaj, p.key)
                  return (
                    <div key={p.key}>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{p.label}</label>
                      <input className="w-full px-3 py-2 rounded-lg border text-sm" value={zaj[p.key] || ''} onChange={e => setZaj({ ...zaj, [p.key]: e.target.value })}
                        style={{ borderColor: zuto ? '#FACC15' : '#D1D5DB', background: zuto ? '#FEFCE8' : 'white', color: '#1E293B' }} />
                    </div>
                  )
                })}
              </div>
              <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #E2E8F0' }}>
                <table className="w-full" style={{ minWidth: 1050 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      {popis.stupci.map(s => (
                        <th key={s.key} className="text-left px-2 py-2 text-xs font-semibold" style={{ color: '#64748B', width: s.sirina }}>{s.label}</th>
                      ))}
                      <th style={{ width: 28 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {redovi.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: i < redovi.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                        {popis.stupci.map(s => {
                          const zuto = fali(r.prefill, r.v, s.key)
                          return (
                            <td key={s.key} className="px-1.5 py-1.5">
                              <input className={inputCls} value={r.v[s.key] || ''} placeholder={s.placeholder}
                                title={zuto ? `Nedostaje: ${r.prefill[s.key]?.nedostaje}` : undefined}
                                onChange={e => setRedovi(prev => prev.map(x => (x.id === r.id ? { ...x, v: { ...x.v, [s.key]: e.target.value } } : x)))}
                                style={{ borderColor: zuto ? '#FACC15' : '#E2E8F0', background: zuto ? '#FEFCE8' : 'white', color: '#1E293B' }} />
                            </td>
                          )
                        })}
                        <td className="px-1">
                          <button type="button" title="Makni s popisa" onClick={() => setRedovi(prev => prev.filter(x => x.id !== r.id))}
                            className="text-xs" style={{ color: '#94A3B8' }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs mt-3" style={{ color: '#94A3B8' }}>
                Izmjene ovdje vrijede samo za ovaj popis. Trajno ih ispravi na stranici Uredi radnika (npr. ime oca, mjesto rođenja, stručna sprema).
              </p>
            </>
          )}
          {error && izvori && <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</p>}
        </div>

        {popis && izvori && (
          <div className="flex items-center gap-2 px-5 py-3.5 flex-shrink-0" style={{ borderTop: '1px solid #F1F5F9' }}>
            <span className="text-xs flex-1" style={{ color: '#64748B' }}>{redovi.length} {redovi.length === 1 ? 'radnik' : 'radnika'} na popisu</span>
            <button type="button" onClick={onClose} className="btn-secondary px-3 py-2 rounded-lg text-xs font-medium" style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</button>
            <button type="button" onClick={preuzmi} disabled={busy || redovi.length === 0} className="btn-primary px-4 py-2 rounded-lg text-xs font-medium text-white"
              style={{ background: busy || redovi.length === 0 ? '#93C5FD' : '#2563EB' }}>{busy ? 'Priprema...' : '⬇ Preuzmi Word'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
