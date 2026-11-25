'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  MAX_DATOTEKA_BAJTOVA, PRIVREMENA_MAPA, VELIKA_DATOTEKA,
  napraviGrupe, sigurnoIme, smanjiSliku, spojiRadnike, uploadIzravno,
  type RadnikIzAnalize,
} from '@/lib/bulk-uvoz'

type DetectedWorker = RadnikIzAnalize

/** Koliko grupa AI analizira istovremeno. */
const PARALELNO = 2

type Neuspjeh = { indeksi: number[]; poruka: string }

export default function BulkUvoz() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [phase, setPhase] = useState<'upload' | 'processing' | 'review' | 'saving' | 'done'>('upload')
  const [workers, setWorkers] = useState<DetectedWorker[]>([])
  const [error, setError] = useState('')
  const [saveResults, setSaveResults] = useState<{ name: string; id: string }[]>([])
  const [failedCount, setFailedCount] = useState(0)
  const [failedUploads, setFailedUploads] = useState(0)

  // Napredak analize: stvarno obrađene datoteke + glatko kretanje trake dok AI radi
  const [korak, setKorak] = useState<'priprema' | 'analiza'>('priprema')
  const [ukupno, setUkupno] = useState(0)
  const [obradeno, setObradeno] = useState(0)
  const [uTijeku, setUTijeku] = useState(0)
  const [prikaz, setPrikaz] = useState(0)
  const [neuspjeli, setNeuspjeli] = useState<Neuspjeh[]>([])

  // Smanjene verzije datoteka (isti redoslijed kao `files`); brišu se kad se popis datoteka promijeni
  const pripremljene = useRef<Map<number, File>>(new Map())
  useEffect(() => { pripremljene.current = new Map() }, [files])

  useEffect(() => {
    if (phase !== 'processing' || ukupno === 0) return
    const t = setInterval(() => {
      const stvarno = obradeno / ukupno
      const cilj = Math.min(0.99, (obradeno + 0.9 * uTijeku) / ukupno)
      setPrikaz(p => {
        const od = Math.max(p, stvarno)
        return od >= cilj ? od : od + (cilj - od) * 0.04
      })
    }, 200)
    return () => clearInterval(t)
  }, [phase, ukupno, obradeno, uTijeku])

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf')
    setFiles(prev => [...prev, ...valid])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  /** Vraća smanjenu verziju datoteke (fotografije), ili izvornik. */
  const pripremi = async (i: number): Promise<File> => {
    const gotova = pripremljene.current.get(i)
    if (gotova) return gotova
    const f = await smanjiSliku(files[i])
    pripremljene.current.set(i, f)
    return f
  }

  /**
   * Analizira sve datoteke (ili samo `samoIndeksi` kod ponovnog pokušaja).
   * Datoteke idu u grupe do 10 datoteka i ~3,4 MB (Vercel prima najviše 4,5 MB po zahtjevu);
   * velike datoteke idu izravno u spremište. Neuspjela grupa ne zaustavlja ostale.
   */
  const analyse = async (samoIndeksi?: number[]) => {
    const indeksi = samoIndeksi ?? files.map((_, i) => i)
    if (indeksi.length === 0) return
    const ponovno = !!samoIndeksi

    setPhase('processing')
    setError('')
    setKorak('priprema')
    setUkupno(indeksi.length)
    setObradeno(0)
    setUTijeku(0)
    setPrikaz(0)

    const noviNeuspjeli: Neuspjeh[] = []
    const prethodni = ponovno ? workers : []

    // 1. Smanji fotografije
    const stavke: { indeks: number; ime: string; velicina: number }[] = []
    for (const i of indeksi) {
      const f = await pripremi(i)
      if (f.size > MAX_DATOTEKA_BAJTOVA) {
        noviNeuspjeli.push({ indeksi: [i], poruka: 'veća od 20 MB — podijelite PDF ili ga spremite u manjoj rezoluciji' })
        continue
      }
      stavke.push({ indeks: i, ime: files[i].name, velicina: f.size })
    }
    setObradeno(noviNeuspjeli.length)

    // 2. Grupe i analiza
    const grupe = napraviGrupe(stavke)
    const noviRadnici: DetectedWorker[] = []
    setKorak('analiza')

    const analizirajGrupu = async (grupa: number[]) => {
      setUTijeku(n => n + grupa.length)
      try {
        const fd = new FormData()
        const datoteke = await Promise.all(grupa.map(pripremi))
        if (grupa.length === 1 && datoteke[0].size > VELIKA_DATOTEKA) {
          // Velika datoteka: izravno u spremište, analizi šaljemo samo putanju
          const putanja = `${PRIVREMENA_MAPA}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${sigurnoIme(datoteke[0].name)}`
          await uploadIzravno(datoteke[0], putanja)
          fd.append('paths', putanja)
        } else {
          datoteke.forEach(f => fd.append('files', f))
        }

        const res = await fetch('/api/extract-document-bulk', { method: 'POST', body: fd })
        const text = await res.text()
        let json: { data?: DetectedWorker[]; error?: string }
        try { json = JSON.parse(text) } catch { throw new Error(`Greška servera: ${text.slice(0, 120)}`) }
        if (!res.ok || json.error) throw new Error(json.error || 'Greška')

        // file_index iz odgovora je redni broj unutar grupe → pretvori u indeks u popisu svih datoteka
        for (const w of json.data || []) {
          for (const doc of w.dokumenti || []) {
            doc.file_index = doc.file_index != null && grupa[doc.file_index] != null ? grupa[doc.file_index] : null
          }
          noviRadnici.push(w)
        }
      } catch (e: unknown) {
        noviNeuspjeli.push({ indeksi: grupa, poruka: e instanceof Error ? e.message : 'Greška' })
      } finally {
        setUTijeku(n => n - grupa.length)
        setObradeno(n => n + grupa.length)
      }
    }

    // Najviše PARALELNO grupa istovremeno
    let sljedeca = 0
    const radnik = async () => {
      while (sljedeca < grupe.length) {
        const g = grupe[sljedeca++]
        await analizirajGrupu(g)
      }
    }
    await Promise.all(Array.from({ length: Math.min(PARALELNO, grupe.length) }, radnik))

    // 3. Spoji istu osobu iz različitih grupa
    const svi = spojiRadnike([...prethodni.map(w => ({ ...w, dokumenti: [...w.dokumenti] })), ...noviRadnici])
    setPrikaz(1)
    await new Promise(r => setTimeout(r, 300))

    if (svi.length === 0 && noviNeuspjeli.length > 0) {
      setNeuspjeli([])
      setError(noviNeuspjeli[0].poruka + (noviNeuspjeli.length > 1 ? ` (i još ${noviNeuspjeli.length - 1} grupa)` : ''))
      setPhase('upload')
      return
    }

    setWorkers(svi)
    setNeuspjeli(noviNeuspjeli)
    setPhase('review')
  }

  const removeWorker = (i: number) => setWorkers(prev => prev.filter((_, idx) => idx !== i))

  const save = async () => {
    setPhase('saving')
    const results: { name: string; id: string }[] = []
    let failed = 0
    let uploadGreske = 0
    const urlPoDatoteci = new Map<number, string>()

    for (const w of workers) {
      if (!w.ime || !w.prezime) { failed++; continue }

      const empRes = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ime: w.ime,
          prezime: w.prezime,
          datum_rodjenja: w.datum_rodjenja || null,
          drzava_rodjenja: w.drzava_rodjenja || null,
          oib: w.oib || null,
          ime_oca: w.ime_oca || null,
          radno_mjesto: w.radno_mjesto || null,
          status_zaposlenika: 'Novi uvoz',
        }),
      })
      if (!empRes.ok) { failed++; continue }
      const { id: empId } = await empRes.json()

      for (const doc of (w.dokumenti || []).filter(d => d.dokument_naziv && d.kategorija)) {
        let fileUrl: string | null = null

        // Datoteka ide izravno u spremište (bez Vercelovog ograničenja od 4,5 MB); ista datoteka se šalje samo jednom
        const idx = doc.file_index
        if (idx != null && files[idx]) {
          if (urlPoDatoteci.has(idx)) {
            fileUrl = urlPoDatoteci.get(idx)!
          } else {
            try {
              const f = await pripremi(idx)
              const { url } = await uploadIzravno(f, `${empId}/doc_${Date.now()}_${sigurnoIme(f.name)}`)
              fileUrl = url
              urlPoDatoteci.set(idx, url)
            } catch {
              uploadGreske++ // zapis dokumenta se svejedno sprema, samo bez priložene datoteke
            }
          }
        }

        await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: empId,
            naziv: doc.dokument_naziv,
            kategorija: doc.kategorija,
            datum_izdavanja: doc.datum_izdavanja || null,
            datum_isteka: doc.dokument_vrijedi_do || null,
            file_url: fileUrl,
          }),
        })
      }

      results.push({ name: `${w.ime} ${w.prezime}`, id: empId })
    }

    setSaveResults(results)
    setFailedCount(failed)
    setFailedUploads(uploadGreske)
    setPhase('done')
  }

  const cardStyle = { boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }

  // ── Upload ──
  if (phase === 'upload') return (
    <div className="p-4 md:p-8" style={{ maxWidth: 700, margin: '0 auto' }}>
      <Link href="/zaposlenici/dodaj" className="text-sm mb-6 inline-block" style={{ color: '#64748B' }}>← Natrag</Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>Grupni uvoz</h1>
        <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: '#DCFCE7', color: '#16A34A' }}>AI</span>
      </div>

      <div className="bg-white rounded-2xl p-6" style={cardStyle}>
        <p className="text-sm font-medium mb-1" style={{ color: '#1E293B' }}>Dokumenti više zaposlenika</p>
        <p className="text-xs mb-4" style={{ color: '#64748B' }}>
          Dodajte dokumente više zaposlenika odjednom. AI će prepoznati tko je tko, grupirati njihove dokumente i kreirati profile.
        </p>

        <div
          className="rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
          style={{ border: `2px dashed ${dragging ? '#2563EB' : '#D1D5DB'}`, background: dragging ? '#EFF6FF' : '#F8FAFC', padding: '40px 20px' }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="text-4xl">📂</span>
          <p className="text-sm font-medium" style={{ color: '#475569' }}>Povucite ovdje ili kliknite za odabir</p>
          <p className="text-xs" style={{ color: '#94A3B8' }}>JPG, PNG, WEBP, PDF — neograničen broj datoteka</p>
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
            onChange={e => addFiles(Array.from(e.target.files || []))} />
        </div>

        {files.length > 0 && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: '#1E293B' }}>{files.length} datoteka odabrano</span>
                <button onClick={() => setFiles([])} className="text-xs" style={{ color: '#94A3B8' }}>Ukloni sve</button>
              </div>
              <span className="text-xs" style={{ color: '#64748B' }}>
                {(files.reduce((z, f) => z + f.size, 0) / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                  style={{ background: '#F1F5F9', color: '#475569' }}>
                  <span>{f.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                  <span className="truncate" style={{ maxWidth: 120 }}>{f.name}</span>
                  <button onClick={e => { e.stopPropagation(); setFiles(prev => prev.filter((_, idx) => idx !== i)) }}
                    className="ml-1 font-bold" style={{ color: '#94A3B8' }}>×</button>
                </div>
              ))}
            </div>
          </>
        )}

        {error && <p className="mt-3 text-sm" style={{ color: '#DC2626' }}>Greška: {error}</p>}

        <button onClick={() => analyse()} disabled={files.length === 0}
          className="btn-primary w-full mt-5 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: files.length === 0 ? '#93C5FD' : 'linear-gradient(135deg, #2563EB, #1D4ED8)', cursor: files.length === 0 ? 'not-allowed' : 'pointer' }}>
          ✨ Analiziraj {files.length > 0 ? `${files.length} ${files.length === 1 ? 'dokument' : 'dokumenata'}` : 'dokumente'}
        </button>
      </div>
    </div>
  )

  // ── Processing ──
  if (phase === 'processing') {
    const posto = Math.round(prikaz * 100)
    return (
      <div className="p-4 md:p-8 flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-center" style={{ maxWidth: 420, width: '100%' }}>
          <div className="text-5xl mb-6">🔍</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#0F172A' }}>Analiza u tijeku...</h2>
          <p className="text-sm mb-6" style={{ color: '#64748B' }}>
            {korak === 'priprema'
              ? '📤 Priprema dokumenata...'
              : posto < 100 ? `🔍 Analizirano ${obradeno} od ${ukupno} ${ukupno === 1 ? 'dokumenta' : 'dokumenata'}` : '✅ Gotovo!'}
          </p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: '#94A3B8' }}>{obradeno} / {ukupno}</span>
            <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{posto}%</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: '#E2E8F0' }}>
            <div className="h-full rounded-full"
              style={{
                width: `${posto}%`,
                background: posto === 100 ? '#16A34A' : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                transition: 'width 0.2s ease, background 0.3s ease',
              }} />
          </div>
          <p className="text-xs mt-4" style={{ color: '#94A3B8' }}>Ne zatvarajte ovu karticu dok analiza ne završi.</p>
        </div>
      </div>
    )
  }

  // ── Review ──
  if (phase === 'review') return (
    <div className="p-4 md:p-8" style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>Pregled zaposlenika</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Pronađeno <strong>{workers.length}</strong> zaposlenika — pregledajte i uklonite pogrešne prije spremanja
          </p>
        </div>
        <button onClick={save} disabled={workers.length === 0}
          className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0"
          style={{ background: workers.length === 0 ? '#93C5FD' : 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
          💾 Spremi {workers.length} zaposlenika
        </button>
      </div>

      {neuspjeli.length > 0 && (
        <div className="rounded-2xl p-4 mb-6" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#92400E' }}>
            {neuspjeli.reduce((z, n) => z + n.indeksi.length, 0)} {neuspjeli.reduce((z, n) => z + n.indeksi.length, 0) === 1 ? 'datoteka nije analizirana' : 'datoteka nije analizirano'}
          </p>
          <ul className="text-xs mb-3" style={{ color: '#92400E' }}>
            {neuspjeli.map((n, i) => (
              <li key={i}>
                {n.indeksi.map(x => files[x]?.name).filter(Boolean).join(', ')} — {n.poruka}
              </li>
            ))}
          </ul>
          <button onClick={() => analyse(neuspjeli.flatMap(n => n.indeksi))}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: '#F59E0B', color: '#fff' }}>
            Pokušaj ponovno
          </button>
          <span className="text-xs ml-3" style={{ color: '#B45309' }}>ili spremite ove zaposlenike, a ostale dodajte kasnije</span>
        </div>
      )}

      {workers.length === 0 && (
        <p className="text-sm text-center py-12" style={{ color: '#94A3B8' }}>Nema zaposlenika za prikaz.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {workers.map((w, i) => (
          <div key={i} className="bg-white rounded-2xl p-4" style={cardStyle}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  {[w.ime?.[0], w.prezime?.[0]].filter(Boolean).join('')}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>{w.ime} {w.prezime}</p>
                  <p className="text-xs" style={{ color: '#64748B' }}>
                    {[w.datum_rodjenja, w.drzava_rodjenja].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <button onClick={() => removeWorker(i)}
                className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
                style={{ color: '#EF4444', background: '#FEF2F2' }}>
                Ukloni
              </button>
            </div>

            {w.oib && (
              <p className="text-xs mb-2 ml-12" style={{ color: '#94A3B8' }}>OIB: {w.oib}</p>
            )}

            {w.dokumenti.filter(d => d.dokument_naziv).length > 0 && (
              <div className="flex flex-wrap gap-1.5 ml-12">
                {w.dokumenti.filter(d => d.dokument_naziv).map((d, j) => (
                  <span key={j} className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: d.kategorija === 'osobni' ? '#EFF6FF' : '#FAF5FF',
                      color: d.kategorija === 'osobni' ? '#1D4ED8' : '#7C3AED'
                    }}>
                    {d.dokument_naziv}
                    {d.dokument_vrijedi_do ? ` · ${d.dokument_vrijedi_do}` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  )

  // ── Saving ──
  if (phase === 'saving') return (
    <div className="p-4 md:p-8 flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <div className="text-center">
        <div className="text-5xl mb-6">💾</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#0F172A' }}>Spremanje u tijeku...</h2>
        <p className="text-sm" style={{ color: '#64748B' }}>Kreiranje profila i dokumenata</p>
      </div>
    </div>
  )

  // ── Done ──
  return (
    <div className="p-4 md:p-8" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="bg-white rounded-2xl p-6 text-center mb-6" style={cardStyle}>
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold mb-1" style={{ color: '#0F172A' }}>Uvoz završen</h2>
        <p className="text-sm" style={{ color: '#64748B' }}>
          {saveResults.length} {saveResults.length === 1 ? 'zaposlenik dodan' : 'zaposlenika dodano'}
          {failedCount > 0 ? `, ${failedCount} neuspješno` : ''}
        </p>
        {failedUploads > 0 && (
          <p className="text-xs mt-2" style={{ color: '#B45309' }}>
            {failedUploads} {failedUploads === 1 ? 'datoteka nije priložena' : 'datoteka nije priloženo'} — dokument je evidentiran, datoteku dodajte ručno u profilu zaposlenika.
          </p>
        )}
        {saveResults.length > 0 && (
          <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>
            Dokumenti su evidentirani s priloženim datotekama. Kliknite na zaposlenika za pregled.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {saveResults.map((r, i) => (
          <Link key={i} href={`/zaposlenici/${r.id}`}
            className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 transition-all"
            style={{ ...cardStyle, textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = cardStyle.boxShadow }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: '#EFF6FF', color: '#2563EB' }}>
              {r.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <span className="text-sm font-medium flex-1" style={{ color: '#1E293B' }}>{r.name}</span>
            <span className="text-xs" style={{ color: '#94A3B8' }}>→</span>
          </Link>
        ))}
      </div>

      <Link href="/zaposlenici"
        className="btn-primary block w-full py-2.5 rounded-xl text-sm font-semibold text-white text-center"
        style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', textDecoration: 'none' }}>
        Idi na zaposlenike
      </Link>
    </div>
  )
}
