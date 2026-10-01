'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'

type DokumentInfo = {
  dokument_naziv: string | null
  kategorija: 'osobni' | 'prateci' | null
  dokument_vrijedi_do: string | null
  datum_izdavanja: string | null
  file_index: number | null
}

type DetectedWorker = {
  ime: string | null
  prezime: string | null
  datum_rodjenja: string | null
  drzava_rodjenja: string | null
  oib: string | null
  ime_oca: string | null
  radno_mjesto: string | null
  dokumenti: DokumentInfo[]
}

const BATCH_SIZE = 10

export default function BulkUvoz() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [phase, setPhase] = useState<'upload' | 'processing' | 'review' | 'saving' | 'done'>('upload')
  const [batchCurrent, setBatchCurrent] = useState(0)
  const [batchTotal, setBatchTotal] = useState(0)
  const [batchProgress, setBatchProgress] = useState(0)
  const [workers, setWorkers] = useState<DetectedWorker[]>([])
  const [error, setError] = useState('')
  const [saveResults, setSaveResults] = useState<{ name: string; id: string }[]>([])
  const [failedCount, setFailedCount] = useState(0)

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf')
    setFiles(prev => [...prev, ...valid])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  const analyse = async () => {
    if (files.length === 0) return
    setPhase('processing')
    setError('')

    const batches: File[][] = []
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      batches.push(files.slice(i, i + BATCH_SIZE))
    }
    setBatchTotal(batches.length)

    const allWorkers: DetectedWorker[] = []
    setBatchProgress(0)

    for (let i = 0; i < batches.length; i++) {
      setBatchCurrent(i + 1)
      setBatchProgress(0)

      // Simulated progress within each batch
      const interval = setInterval(() => {
        setBatchProgress(prev => {
          const inc = prev < 30 ? 4 : prev < 60 ? 2 : prev < 80 ? 0.8 : prev < 90 ? 0.15 : prev < 95 ? 0.06 : 0.02
          return Math.min(prev + inc, 99)
        })
      }, 200)
      const batchOffset = i * BATCH_SIZE
      const fd = new FormData()
      batches[i].forEach(f => fd.append('files', f))

      try {
        const res = await fetch('/api/extract-document-bulk', { method: 'POST', body: fd })
        const text = await res.text()
        let json: any
        try { json = JSON.parse(text) } catch { throw new Error(`Greška servera: ${text.slice(0, 120)}`) }
        clearInterval(interval)
        if (!res.ok || json.error) throw new Error(json.error || 'Greška')

        setBatchProgress(100)
        await new Promise(r => setTimeout(r, 300))

        // Offset file_index values so they point to the global files array
        const batchWorkers: DetectedWorker[] = json.data || []
        for (const w of batchWorkers) {
          for (const doc of w.dokumenti || []) {
            if (doc.file_index != null) doc.file_index += batchOffset
          }
        }
        allWorkers.push(...batchWorkers)
      } catch (e: any) {
        clearInterval(interval)
        setError(e.message)
        setPhase('upload')
        return
      }
    }

    // Deduplicate across batches: merge workers with same ime+prezime+datum_rodjenja
    const merged: DetectedWorker[] = []
    for (const w of allWorkers) {
      const key = `${w.ime?.toLowerCase().trim()}_${w.prezime?.toLowerCase().trim()}_${w.datum_rodjenja}`
      const existing = w.ime && w.prezime
        ? merged.find(m => `${m.ime?.toLowerCase().trim()}_${m.prezime?.toLowerCase().trim()}_${m.datum_rodjenja}` === key)
        : null
      if (existing) {
        existing.dokumenti.push(...(w.dokumenti || []))
      } else {
        merged.push({ ...w, dokumenti: [...(w.dokumenti || [])] })
      }
    }

    setWorkers(merged)
    setPhase('review')
  }

  const removeWorker = (i: number) => setWorkers(prev => prev.filter((_, idx) => idx !== i))

  const save = async () => {
    setPhase('saving')
    const results: { name: string; id: string }[] = []
    let failed = 0

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

        // Upload the source file if Gemini gave us a valid file_index
        const srcFile = doc.file_index != null ? files[doc.file_index] : null
        if (srcFile) {
          try {
            const fd = new FormData()
            fd.append('file', srcFile)
            fd.append('path', `${empId}/doc_${Date.now()}_${srcFile.name}`)
            const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
            if (upRes.ok) {
              const { url } = await upRes.json()
              fileUrl = url
            }
          } catch { /* skip file upload on error, still save the record */ }
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
                ~{Math.ceil(files.length / BATCH_SIZE)} {Math.ceil(files.length / BATCH_SIZE) === 1 ? 'AI zahtjev' : 'AI zahtjeva'}
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

        <button onClick={analyse} disabled={files.length === 0}
          className="btn-primary w-full mt-5 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: files.length === 0 ? '#93C5FD' : 'linear-gradient(135deg, #2563EB, #1D4ED8)', cursor: files.length === 0 ? 'not-allowed' : 'pointer' }}>
          ✨ Analiziraj {files.length > 0 ? `${files.length} ${files.length === 1 ? 'dokument' : 'dokumenata'}` : 'dokumente'}
        </button>
      </div>
    </div>
  )

  // ── Processing ──
  if (phase === 'processing') return (
    <div className="p-4 md:p-8 flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <div className="text-center" style={{ maxWidth: 420 }}>
        <div className="text-5xl mb-6">🔍</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#0F172A' }}>Analiza u tijeku...</h2>
        <p className="text-sm mb-6" style={{ color: '#64748B' }}>
          {batchTotal > 1 ? `Grupa ${batchCurrent} od ${batchTotal} — ` : ''}
          {batchProgress < 30 ? '📤 Učitavanje dokumenata...' : batchProgress < 70 ? '🔍 Čitanje dokumenata...' : batchProgress < 100 ? '✍️ Grupiranje zaposlenika...' : '✅ Gotovo!'}
        </p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: '#94A3B8' }}>
            {batchTotal > 1 ? `${batchCurrent} / ${batchTotal} grupa` : ''}
          </span>
          <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{Math.round(batchProgress)}%</span>
        </div>
        <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: '#E2E8F0' }}>
          <div className="h-full rounded-full"
            style={{
              width: `${batchProgress}%`,
              background: batchProgress === 100 ? '#16A34A' : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              transition: 'width 0.2s ease, background 0.3s ease',
            }} />
        </div>
      </div>
    </div>
  )

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
