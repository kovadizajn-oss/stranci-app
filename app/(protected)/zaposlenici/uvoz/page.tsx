'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const COUNTRIES = [
  'Afganistan','Albanija','Alžir','Angola','Argentina','Armenija','Australija','Austrija',
  'Azerbajdžan','Bangladeš','Belgija','Bjelarus','Bolivija','Bosna i Hercegovina','Brazil',
  'Bugarska','Burkina Faso','Čad','Češka','Čile','Crna Gora','Demokratska Republika Kongo',
  'Danska','Egipat','Ekvador','Eritreja','Estonija','Etiopija','Filipini','Finska','Francuska',
  'Gana','Grčka','Gruzija','Gvatemala','Honduras','Hrvatska','Indija','Indonezija','Irak',
  'Iran','Irska','Italija','Izrael','Jamajka','Japan','Jemen','Jordan','Južna Afrika',
  'Južna Koreja','Kamerun','Kanada','Kazahstan','Kenija','Kina','Kolumbija','Kosovo',
  'Kuba','Kuvajt','Laos','Latvija','Libanon','Liberija','Libija','Litva','Madagaskar',
  'Mađarska','Makedonija','Malezija','Mali','Maroko','Meksiko','Moldova','Mozambik',
  'Mjanmar','Nepal','Niger','Nigerija','Nikaragva','Nizozemska','Norveška','Novi Zeland',
  'Pakistan','Panama','Paragvaj','Peru','Poljska','Portugal','Rumunjska','Rusija',
  'Ruanda','Saudijska Arabija','Senegal','Sijera Leone','Sirija','Slovačka','Slovenija',
  'Somalija','Srbija','Šri Lanka','Španjolska','Sudan','Švedska','Švicarska',
  'Tajland','Tajvan','Tanzanija','Tunis','Turska','Uganda','Ujedinjeni Arapski Emirati',
  'Ujedinjeno Kraljevstvo','Ukrajina','Urugvaj','Uzbekistan','Venezuela','Vijetnam',
  'Zambija','Zimbabve',
]

const inputCls = "w-full px-3 py-2.5 rounded-lg border text-sm"
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }

type Extracted = {
  ime: string | null
  prezime: string | null
  datum_rodjenja: string | null
  drzava_rodjenja: string | null
  oib: string | null
  ime_oca: string | null
  poslodavac: string | null
  radno_mjesto: string | null
  dokument_broj: string | null
  dokument_vrijedi_do: string | null
}

function Field({ label, aiField, children }: { label: string; aiField?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="block text-sm font-medium" style={{ color: '#374151' }}>{label}</label>
        {aiField && (
          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#DCFCE7', color: '#16A34A' }}>AI</span>
        )}
      </div>
      {children}
    </div>
  )
}

export default function UvozZaposlenika() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [extracted, setExtracted] = useState<Extracted | null>(null)
  const [aiFields, setAiFields] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [companies, setCompanies] = useState<{ id: string; naziv: string }[]>([])
  const [dragging, setDragging] = useState(false)

  // Form fields
  const [ime, setIme] = useState('')
  const [prezime, setPrezime] = useState('')
  const [datumRodjenja, setDatumRodjenja] = useState('')
  const [drzavaRodjenja, setDrzavaRodjenja] = useState('')
  const [oib, setOib] = useState('')
  const [imeOca, setImeOca] = useState('')
  const [poslodavac, setPoslodavac] = useState('')
  const [radnoMjesto, setRadnoMjesto] = useState('')
  const [companyId, setCompanyId] = useState('')

  useEffect(() => {
    supabase.from('companies').select('id, naziv').order('naziv').then(({ data }) => {
      setCompanies(data || [])
    })
  }, [])

  const addFiles = useCallback((newFiles: File[]) => {
    const imageFiles = newFiles.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf')
    setFiles(prev => [...prev, ...imageFiles])
    imageFiles.forEach(f => {
      const url = f.type === 'application/pdf' ? '__pdf__' : URL.createObjectURL(f)
      setPreviews(prev => [...prev, url])
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  const removeFile = (i: number) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const analyse = async () => {
    if (files.length === 0) return
    setLoading(true)
    setProgress(0)
    setError('')
    setExtracted(null)

    // Simulate progress: ramp quickly to 30%, then slow down toward 85%
    let current = 0
    const interval = setInterval(() => {
      setProgress(prev => {
        const increment = prev < 30 ? 4 : prev < 60 ? 2 : prev < 80 ? 0.8 : prev < 90 ? 0.15 : prev < 95 ? 0.06 : 0.02
        const next = Math.min(prev + increment, 99)
        current = next
        return next
      })
    }, 200)

    const fd = new FormData()
    files.forEach(f => fd.append('files', f))

    try {
      const res = await fetch('/api/extract-document', { method: 'POST', body: fd })
      const json = await res.json()
      clearInterval(interval)
      if (!res.ok || json.error) throw new Error(json.error || 'Greška')

      setProgress(100)
      await new Promise(r => setTimeout(r, 400))

      const d: Extracted = json.data
      setExtracted(d)

      const filled = new Set<string>()
      const set = (setter: (v: string) => void, val: string | null, key: string) => {
        if (val) { setter(val); filled.add(key) }
      }
      set(setIme, d.ime, 'ime')
      set(setPrezime, d.prezime, 'prezime')
      set(setDatumRodjenja, d.datum_rodjenja, 'datum_rodjenja')
      set(setDrzavaRodjenja, d.drzava_rodjenja, 'drzava_rodjenja')
      set(setOib, d.oib, 'oib')
      set(setImeOca, d.ime_oca, 'ime_oca')
      set(setPoslodavac, d.poslodavac, 'poslodavac')
      set(setRadnoMjesto, d.radno_mjesto, 'radno_mjesto')
      setAiFields(filled)
    } catch (e: any) {
      clearInterval(interval)
      setProgress(0)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    if (!ime || !prezime) return
    setSaving(true)

    const { data: emp, error: empErr } = await supabase.from('employees').insert({
      ime, prezime,
      datum_rodjenja: datumRodjenja || null,
      drzava_rodjenja: drzavaRodjenja || null,
      oib: oib || null,
      ime_oca: imeOca || null,
      poslodavac: companies.find(c => c.id === companyId)?.naziv || null,
      radno_mjesto: radnoMjesto || null,
      company_id: companyId || null,
      status_zaposlenika: 'U postupku',
    }).select().single()

    if (empErr || !emp) { setSaving(false); setError('Greška pri spremanju'); return }
    router.push(`/zaposlenici/${emp.id}`)
  }

  return (
    <div className="p-4 md:p-8" style={{ maxWidth: 700, margin: '0 auto' }}>
      <Link href="/zaposlenici/dodaj" className="text-sm mb-6 inline-block" style={{ color: '#64748B' }}>
        ← Natrag
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: '#1E293B' }}>Učitaj dokument</h1>
        <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: '#DCFCE7', color: '#16A34A' }}>AI</span>
      </div>

      {/* Upload zone */}
      <div className="bg-white rounded-xl p-6 mb-4" style={{ border: '1px solid #E2E8F0' }}>
        <p className="text-sm font-medium mb-3" style={{ color: '#1E293B' }}>Dokumenti</p>
        <p className="text-xs mb-4" style={{ color: '#64748B' }}>Dodajte fotografije putovnice, osobne iskaznice ili radne dozvole. Možete dodati više dokumenata odjednom.</p>

        <div
          className="rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
          style={{
            border: `2px dashed ${dragging ? '#2563EB' : '#D1D5DB'}`,
            background: dragging ? '#EFF6FF' : '#F8FAFC',
            padding: '32px 20px',
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="text-3xl">📄</span>
          <p className="text-sm font-medium" style={{ color: '#475569' }}>Povucite ovdje ili kliknite za odabir</p>
          <p className="text-xs" style={{ color: '#94A3B8' }}>JPG, PNG, WEBP, PDF</p>
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
            onChange={e => addFiles(Array.from(e.target.files || []))} />
        </div>

        {previews.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                {src === '__pdf__' ? (
                  <div className="rounded-lg flex flex-col items-center justify-center gap-1"
                    style={{ width: 100, height: 100, border: '1px solid #E2E8F0', background: '#FEF2F2' }}>
                    <span style={{ fontSize: 28 }}>📄</span>
                    <span className="text-xs font-medium" style={{ color: '#DC2626' }}>PDF</span>
                    <span className="text-xs truncate px-1 text-center" style={{ color: '#94A3B8', maxWidth: 90, fontSize: 10 }}>
                      {files[i]?.name}
                    </span>
                  </div>
                ) : (
                  <img src={src} alt={`Dokument ${i + 1}`} className="rounded-lg object-cover"
                    style={{ width: 100, height: 100, border: '1px solid #E2E8F0' }} />
                )}
                <button onClick={() => removeFile(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: '#EF4444', color: 'white' }}>×</button>
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && !extracted && (
          <div className="mt-4">
            {loading ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: '#2563EB' }}>
                    {progress < 30 ? '📤 Učitavanje dokumenta...' : progress < 70 ? '🔍 Čitanje dokumenta...' : progress < 100 ? '✍️ Izvlačenje podataka...' : '✅ Gotovo!'}
                  </span>
                  <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{Math.round(progress)}%</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: '#E2E8F0' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      background: progress === 100 ? '#16A34A' : '#2563EB',
                      transition: 'width 0.2s ease, background 0.3s ease',
                    }} />
                </div>
              </div>
            ) : (
              <button onClick={analyse}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ background: '#2563EB' }}>
                ✨ Analiziraj {files.length > 1 ? `${files.length} dokumenta` : 'dokument'}
              </button>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm" style={{ color: '#DC2626' }}>Greška: {error}</p>}
      </div>

      {/* Pre-filled form */}
      {extracted && (
        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-2 mb-1" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 16, marginBottom: 20 }}>
            <span className="text-green-600">✅</span>
            <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>Podaci su izvučeni — provjerite i ispravite po potrebi</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Field label="Ime" aiField={aiFields.has('ime')}>
              <input className={inputCls} style={inputStyle} value={ime} onChange={e => setIme(e.target.value)} placeholder="Ime" />
            </Field>
            <Field label="Prezime" aiField={aiFields.has('prezime')}>
              <input className={inputCls} style={inputStyle} value={prezime} onChange={e => setPrezime(e.target.value)} placeholder="Prezime" />
            </Field>
            <Field label="Datum rođenja" aiField={aiFields.has('datum_rodjenja')}>
              <input type="date" className={inputCls} style={inputStyle} value={datumRodjenja} onChange={e => setDatumRodjenja(e.target.value)} />
            </Field>
            <Field label="Država rođenja" aiField={aiFields.has('drzava_rodjenja')}>
              <select className={inputCls} style={inputStyle} value={drzavaRodjenja} onChange={e => setDrzavaRodjenja(e.target.value)}>
                <option value="">Odaberite državu</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="OIB" aiField={aiFields.has('oib')}>
              <input className={inputCls} style={inputStyle} value={oib} onChange={e => setOib(e.target.value)} placeholder="OIB" />
            </Field>
            <Field label="Ime oca" aiField={aiFields.has('ime_oca')}>
              <input className={inputCls} style={inputStyle} value={imeOca} onChange={e => setImeOca(e.target.value)} placeholder="Ime oca" />
            </Field>
          </div>

          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6" style={{ borderTop: '1px solid #F1F5F9' }}>
            <Field label="Tvrtka / Poslodavac">
              <select className={inputCls} style={inputStyle} value={companyId} onChange={e => setCompanyId(e.target.value)}>
                <option value="">— Odaberi tvrtku —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.naziv}</option>)}
              </select>
            </Field>
            <Field label="Radno mjesto" aiField={aiFields.has('radno_mjesto')}>
              <input className={inputCls} style={inputStyle} value={radnoMjesto} onChange={e => setRadnoMjesto(e.target.value)} placeholder="Npr. Zidar, Konobar..." />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={!ime || !prezime || saving}
              className="btn-primary flex-1 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: (!ime || !prezime || saving) ? '#93C5FD' : '#2563EB' }}>
              {saving ? 'Spremanje...' : '💾 Spremi zaposlenika'}
            </button>
            <Link href="/zaposlenici/novi"
              className="text-sm px-4 py-2.5 rounded-lg font-medium"
              style={{ background: '#F1F5F9', color: '#475569', textDecoration: 'none' }}>
              Uredi više podataka
            </Link>
          </div>
          <p className="text-xs mt-3" style={{ color: '#94A3B8' }}>
            Zelena oznaka <span className="px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#DCFCE7', color: '#16A34A', fontSize: 11 }}>AI</span> označava polja automatski popunjena iz dokumenta.
          </p>
        </div>
      )}
    </div>
  )
}
