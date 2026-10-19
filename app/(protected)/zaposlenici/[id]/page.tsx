'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AGENCIJA, VRSTA_BADGE, VRSTA_LABEL, type VrstaZaposlenja } from '@/lib/zaposlenje'
import StatusPicker, { STATUS_CONFIG } from '@/components/StatusPicker'
import RadnikDokumenti, { type DokumentNacrt } from '@/components/RadnikDokumenti'
import type { Dokument } from '@/lib/dokumenti'

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

const STATUSI = ['Aktivan', 'U postupku', 'Na čekanju', 'Otkazan']

const inputCls = "w-full px-4 py-3 rounded-xl border text-sm transition-all"
const inputStyle = { borderColor: '#E5E7EB', color: '#0F172A', background: 'white' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>{label}</label>
      {children}
    </div>
  )
}

type Pill = { label: string; color: string; bg: string }

function PillTag({ p }: { p: Pill | null | undefined }) {
  if (!p) return null
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: p.bg, color: p.color }}>{p.label}</span>
}

/** Sklopiva sekcija: zatvorena pokazuje kratak sažetak, klik otvara polja. */
function Section({ icon, title, desc, summary, open, onToggle, changed, children }: {
  icon: string; title: string; desc: string; summary: React.ReactNode
  open: boolean; onToggle: () => void; changed: boolean; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl mb-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: open ? '1px solid #BFDBFE' : '1px solid rgba(0,0,0,0.05)' }}>
      <button type="button" onClick={onToggle} aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-4 text-left rounded-2xl transition-colors hover:bg-slate-50">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
          <span>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>{title}</p>
            {changed && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>● izmijenjeno</span>
            )}
          </div>
          <div className="text-xs mt-1 flex items-center gap-1.5 flex-wrap min-w-0" style={{ color: '#64748B' }}>
            {open ? desc : summary}
          </div>
        </div>
        <span className="text-sm flex-shrink-0 transition-transform duration-200" style={{ color: '#94A3B8', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid #F1F5F9' }}>
          <div className="pt-5">{children}</div>
        </div>
      )}
    </div>
  )
}

function fmtDatum(d: string | null | undefined) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}.`
}

function Prazno({ children }: { children: React.ReactNode }) {
  return <span style={{ color: '#CBD5E1' }}>{children}</span>
}

/** Potpis stanja sekcije — za oznaku "izmijenjeno". */
function potpis(v: unknown) {
  return JSON.stringify(v, (_k, x) => (x instanceof File ? `file:${x.name}:${x.size}` : x))
}

const SEKCIJE = ['osobni', 'dodatno', 'rad', 'odsutnosti'] as const
type Sekcija = typeof SEKCIJE[number]

function fileNameFromUrl(url: string) {
  try {
    const parts = decodeURIComponent(url).split('/')
    return parts[parts.length - 1].replace(/^(doc|att|photo|godisnji|bolovanje)_\d+_/, '')
  } catch { return 'Datoteka' }
}

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_')
}

/** Jedna datoteka uz godišnji / bolovanje (npr. zahtjev za GO, doznaka liječnika). */
function AbsenceFile({ fileUrl, newFile, onPick, onClear, hint }: {
  fileUrl?: string | null; newFile?: File | null
  onPick: (f: File | null) => void; onClear: () => void; hint: string
}) {
  const input = (
    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
      onChange={e => onPick(e.target.files?.[0] || null)} />
  )
  if (newFile) return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
      <span className="text-xs truncate" style={{ color: '#16A34A' }}>✓ {newFile.name}</span>
      <button type="button" onClick={() => onPick(null)} className="text-xs ml-auto" style={{ color: '#94A3B8' }}>✕</button>
    </div>
  )
  if (fileUrl) return (
    <div className="flex items-center gap-2">
      <a href={fileUrl} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 min-w-0" style={{ background: 'white', border: '1px solid #E2E8F0' }}>
        <span style={{ fontSize: 13 }}>📄</span>
        <span className="text-xs truncate" style={{ color: '#2563EB' }}>{fileNameFromUrl(fileUrl)}</span>
      </a>
      <label className="cursor-pointer text-xs px-2.5 py-1.5 rounded-lg flex-shrink-0" style={{ background: '#F1F5F9', color: '#374151' }}>
        Zamijeni{input}
      </label>
      <button type="button" onClick={onClear} className="text-xs flex-shrink-0" style={{ color: '#94A3B8' }} title="Ukloni datoteku">✕</button>
    </div>
  )
  return (
    <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border text-xs"
      style={{ borderColor: '#D1D5DB', background: 'white', color: '#64748B' }}>
      📎 Priloži {hint} <span style={{ color: '#94A3B8' }}>(PDF, JPG, PNG — opcionalno)</span>
      {input}
    </label>
  )
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({ ime: '', prezime: '', drzava_rodjenja: '', datum_rodjenja: '', mjesto_rodjenja: '', drzavljanstvo: '', oib: '', status_zaposlenika: 'Aktivan', poslodavac: '', radno_mjesto: '' })
  const [extra, setExtra] = useState({ email: '', telefon: '', adresa_smjestaja: '', ime_oca: '', iban: '', adresa_domovina: '', strucna_sprema: '' })
  const [companies, setCompanies] = useState<{ id: string; naziv: string }[]>([])
  const [companyId, setCompanyId] = useState<string>('')
  const [poslodavacManual, setPoslodavacManual] = useState('')
  const [vrsta, setVrsta] = useState<VrstaZaposlenja | ''>('')
  const [ustupanjeOd, setUstupanjeOd] = useState('')
  const [ustupanjeDo, setUstupanjeDo] = useState('')
  const [ustupanjeOdredeno, setUstupanjeOdredeno] = useState(false) // zadano: neodređeno
  // Dokumenti se spremaju odmah (lista desno); AI nalazi čekaju potvrdu kao nacrti
  const [docs, setDocs] = useState<Dokument[]>([])
  const [docDrafts, setDocDrafts] = useState<DokumentNacrt[]>([])

  const [vacations, setVacations] = useState<any[]>([])
  const [sickLeaves, setSickLeaves] = useState<any[]>([])
  const [deletedVacationIds, setDeletedVacationIds] = useState<string[]>([])
  const [deletedSickIds, setDeletedSickIds] = useState<string[]>([])

  const [aiScanning, setAiScanning] = useState(false)
  const [aiError, setAiError] = useState('')
  const aiFileRef = useRef<HTMLInputElement>(null)

  const [otvorene, setOtvorene] = useState<Set<Sekcija>>(new Set())
  const [polazno, setPolazno] = useState<Record<string, string> | null>(null)
  const [trebaPolazno, setTrebaPolazno] = useState(false)
  function otvori(...k: Sekcija[]) { setOtvorene(prev => new Set([...prev, ...k])) }
  function prebaci(k: Sekcija) {
    setOtvorene(prev => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n })
  }

  async function handleAiScan(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || [])
    if (!selectedFiles.length) return
    e.target.value = ''

    const totalSize = selectedFiles.reduce((s, f) => s + f.size, 0)
    if (totalSize > 3.5 * 1024 * 1024) {
      setAiError(`Datoteke su prevelike (${(totalSize / 1024 / 1024).toFixed(1)} MB). Maksimalno 3.5 MB ukupno.`)
      return
    }

    setAiScanning(true)
    setAiError('')
    try {
      const fd = new FormData()
      selectedFiles.forEach(f => fd.append('files', f))
      const res = await fetch('/api/extract-document', { method: 'POST', body: fd })
      const text = await res.text()
      let json: any
      try { json = JSON.parse(text) } catch { throw new Error(`Greška servera: ${text.slice(0, 120)}`) }
      if (!res.ok || json.error) throw new Error(json.error || 'Greška')

      const d = json.data
      // Fill empty personal fields only
      if (d.ime)             setForm(p => ({ ...p, ime:            p.ime            || d.ime }))
      if (d.prezime)         setForm(p => ({ ...p, prezime:        p.prezime        || d.prezime }))
      if (d.mjesto_rodjenja) setForm(p => ({ ...p, mjesto_rodjenja: p.mjesto_rodjenja || d.mjesto_rodjenja }))
      if (d.datum_rodjenja)  setForm(p => ({ ...p, datum_rodjenja: p.datum_rodjenja || d.datum_rodjenja }))
      if (d.drzava_rodjenja) setForm(p => ({ ...p, drzava_rodjenja: p.drzava_rodjenja || d.drzava_rodjenja }))
      if (d.oib)             setForm(p => ({ ...p, oib:            p.oib            || d.oib }))
      if (d.radno_mjesto)    setForm(p => ({ ...p, radno_mjesto:   p.radno_mjesto   || d.radno_mjesto }))
      if (d.ime_oca)         setExtra(p => ({ ...p, ime_oca:       p.ime_oca        || d.ime_oca }))

      // Pronađeni dokumenti -> nacrti u listi desno, sa skeniranom datotekom kao preslikom
      const nacrti: DokumentNacrt[] = (d.dokumenti || []).map((doc: any, i: number) => ({
        key: `ai-${Date.now()}-${i}`,
        naziv: doc.dokument_naziv || '',
        kategorija: doc.kategorija === 'osobni' ? 'osobni' : 'prateci',
        datum_izdavanja: doc.datum_izdavanja || '',
        datum_isteka: doc.dokument_vrijedi_do || '',
        broj_dokumenta: doc.broj_dokumenta || '',
        mjesto_izdavanja: doc.mjesto_izdavanja || '',
        file: typeof doc.file_index === 'number' && selectedFiles[doc.file_index]
          ? selectedFiles[doc.file_index]
          : (selectedFiles.length === 1 ? selectedFiles[0] : null),
      }))
      if (nacrti.length) setDocDrafts(p => [...p, ...nacrti])
      otvori('osobni')
    } catch (e: any) {
      setAiError(e.message)
    } finally {
      setAiScanning(false)
    }
  }

  function setF(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })) }
  function setE(key: string, value: string) { setExtra(prev => ({ ...prev, [key]: value })) }

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(data => setCompanies((data || []).map((c: any) => ({ id: c.id, naziv: c.naziv }))))
  }, [])

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/employees/${id}`)
      if (!res.ok) { router.push('/zaposlenici'); return }
      const { employee: emp, documents: docs, vacations: vacs, sick_leaves: sick } = await res.json()

      setForm({ ime: emp.ime || '', prezime: emp.prezime || '', drzava_rodjenja: emp.drzava_rodjenja || '', datum_rodjenja: emp.datum_rodjenja || '', mjesto_rodjenja: emp.mjesto_rodjenja || '', drzavljanstvo: emp.drzavljanstvo || '', oib: emp.oib || '', status_zaposlenika: emp.status_zaposlenika || 'Aktivan', poslodavac: emp.poslodavac || '', radno_mjesto: emp.radno_mjesto || '' })
      setExtra({ email: emp.email || '', telefon: emp.telefon || '', adresa_smjestaja: emp.adresa_smjestaja || '', ime_oca: emp.ime_oca || '', iban: emp.iban || '', adresa_domovina: emp.adresa_domovina || '', strucna_sprema: emp.strucna_sprema || '' })
      setCompanyId(emp.company_id || '')
      setPoslodavacManual(emp.company_id ? '' : (emp.poslodavac || ''))
      setVrsta(emp.vrsta_zaposlenja || '')
      setUstupanjeOd(emp.ustupanje_od || '')
      setUstupanjeDo(emp.ustupanje_do || '')
      setUstupanjeOdredeno(!!(emp.ustupanje_od || emp.ustupanje_do))

      setDocs(docs || [])
      setVacations(vacs || [])
      setSickLeaves(sick || [])
      setLoading(false)
      setTrebaPolazno(true)
    }
    load()
  }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.ime.trim() || !form.prezime.trim()) {
      otvori('osobni')
      setError('Ime i prezime su obavezni.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const putRes = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ime: form.ime, prezime: form.prezime,
          drzava_rodjenja: form.drzava_rodjenja || null,
          datum_rodjenja: form.datum_rodjenja || null,
          mjesto_rodjenja: form.mjesto_rodjenja || null,
          oib: form.oib || null,
          status_zaposlenika: form.status_zaposlenika,
          email: extra.email || null,
          telefon: extra.telefon || null,
          adresa_smjestaja: extra.adresa_smjestaja || null,
          ime_oca: extra.ime_oca || null,
          adresa_domovina: extra.adresa_domovina || null,
          strucna_sprema: extra.strucna_sprema || null,
          drzavljanstvo: form.drzavljanstvo || null,
          iban: extra.iban || null,
          company_id: companyId || null,
          poslodavac: companyId
            ? (companies.find(c => c.id === companyId)?.naziv || null)
            : (poslodavacManual || null),
          radno_mjesto: form.radno_mjesto || null,
          vrsta_zaposlenja: vrsta || null,
          ustupanje_od: vrsta === 'ustupanje' && ustupanjeOdredeno ? (ustupanjeOd || null) : null,
          ustupanje_do: vrsta === 'ustupanje' && ustupanjeOdredeno ? (ustupanjeDo || null) : null,
        }),
      })
      if (!putRes.ok) {
        const j = await putRes.json().catch(() => ({}))
        throw new Error(j.error || 'Spremanje podataka radnika nije uspjelo.')
      }

      // Godišnji odmori i bolovanja (s pripadajućom datotekom)
      async function saveAbsences(list: any[], deletedIds: string[], endpoint: string, prefix: string) {
        for (const delId of deletedIds) await fetch(`${endpoint}/${delId}`, { method: 'DELETE' })
        for (const item of list) {
          if (!item.datum_od || !item.datum_do) continue
          const body: Record<string, unknown> = { datum_od: item.datum_od, datum_do: item.datum_do, napomena: item.napomena || null }
          if (item._newFile) {
            const fd = new FormData()
            fd.append('file', item._newFile)
            fd.append('path', `${id}/${prefix}_${Date.now()}_${safeFileName(item._newFile.name)}`)
            const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
            if (!upRes.ok) throw new Error(`Učitavanje datoteke "${item._newFile.name}" nije uspjelo.`)
            body.file_url = (await upRes.json()).url
          } else if (item._fileRemoved) {
            body.file_url = null
          }
          const res = item._new || !item.id
            ? await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: id, ...body }) })
            : await fetch(`${endpoint}/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          if (!res.ok) {
            const j = await res.json().catch(() => ({}))
            throw new Error(j.error || 'Greška pri spremanju godišnjeg/bolovanja.')
          }
        }
      }
      await saveAbsences(vacations, deletedVacationIds, '/api/vacations', 'godisnji')
      await saveAbsences(sickLeaves, deletedSickIds, '/api/sick-leaves', 'bolovanje')

      setDeletedVacationIds([])
      setDeletedSickIds([])
      const absRes = await fetch(`/api/employees/${id}`)
      if (absRes.ok) {
        const { vacations: vacs, sick_leaves: sick } = await absRes.json()
        setVacations(vacs || [])
        setSickLeaves(sick || [])
      }
      setTrebaPolazno(true)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Greška pri spremanju.')
    } finally {
      setSaving(false)
    }
  }

  const stanjeSekcija: Record<Sekcija, string> = {
    osobni: potpis([form.ime, form.prezime, form.datum_rodjenja, form.mjesto_rodjenja, form.drzavljanstvo, form.oib, form.drzava_rodjenja, form.status_zaposlenika]),
    dodatno: potpis(extra),
    rad: potpis([companyId, poslodavacManual, vrsta, ustupanjeOd, ustupanjeDo, ustupanjeOdredeno, form.radno_mjesto]),
    odsutnosti: potpis([vacations, sickLeaves]),
  }
  useEffect(() => {
    if (!trebaPolazno) return
    setPolazno(stanjeSekcija)
    setTrebaPolazno(false)
  }, [trebaPolazno]) // eslint-disable-line react-hooks/exhaustive-deps

  const izmijenjeno = (k: Sekcija) => !!polazno && polazno[k] !== stanjeSekcija[k]
  const imaPromjena = SEKCIJE.some(izmijenjeno) || docDrafts.length > 0
  const sek = (k: Sekcija) => ({ open: otvorene.has(k), onToggle: () => prebaci(k), changed: izmijenjeno(k) })
  const sveOtvoreno = SEKCIJE.every(k => otvorene.has(k))

  if (loading) return <div className="p-8 text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <Link href="/zaposlenici" className="text-sm" style={{ color: '#64748B' }}>← Zaposlenici</Link>
      <div className="flex items-center gap-4 mt-2 mb-4 flex-wrap">
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0" style={{ background: '#EFF6FF', color: '#2563EB' }}>
          {form.ime[0]}{form.prezime[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.3px' }}>{form.ime} {form.prezime}</h1>
          <p className="text-sm" style={{ color: '#64748B' }}>{form.drzava_rodjenja || 'Nepoznata država'} · {form.poslodavac || 'Bez poslodavca'}</p>
        </div>
        <label title="Skeniraj putovnicu, DBR ili drugi dokument — AI popunjava prazna polja i dodaje dokumente u listu."
          className={`cursor-pointer text-sm font-medium px-3.5 py-2 rounded-xl flex items-center gap-2 flex-shrink-0 ${aiScanning ? 'opacity-50 pointer-events-none' : ''}`}
          style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
          {aiScanning ? '⏳ Skeniranje...' : '🤖 AI skeniranje'}
          <input ref={aiFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden" onChange={handleAiScan} />
        </label>
      </div>
      {aiError && <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626' }}>{aiError}</p>}

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] items-start">
      <div className="min-w-0">
      <div className="flex justify-end mb-2">
        <button type="button" onClick={() => setOtvorene(sveOtvoreno ? new Set() : new Set(SEKCIJE))}
          className="btn-link text-xs font-medium" style={{ color: '#2563EB' }}>
          {sveOtvoreno ? 'Zatvori sve' : 'Otvori sve'}
        </button>
      </div>

      <form onSubmit={handleSave}>
        {/* Osobni podaci */}
        <Section {...sek('osobni')} icon="👤" title="Osobni podaci" desc="Osnovni podaci radnika."
          summary={<>
            <PillTag p={STATUS_CONFIG[form.status_zaposlenika] ? { label: form.status_zaposlenika, ...STATUS_CONFIG[form.status_zaposlenika] } : null} />
            <span className="truncate">{[form.oib && `OIB ${form.oib}`, form.datum_rodjenja && `rođen ${fmtDatum(form.datum_rodjenja)}`, form.mjesto_rodjenja, form.drzava_rodjenja].filter(Boolean).join(' · ')}</span>
          </>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ime"><input className={inputCls} style={inputStyle} value={form.ime} onChange={e => setF('ime', e.target.value)} required /></Field>
            <Field label="Prezime"><input className={inputCls} style={inputStyle} value={form.prezime} onChange={e => setF('prezime', e.target.value)} required /></Field>
            <Field label="Datum rođenja"><input type="date" className={inputCls} style={inputStyle} value={form.datum_rodjenja} onChange={e => setF('datum_rodjenja', e.target.value)} /></Field>
            <Field label="OIB"><input className={inputCls} style={inputStyle} value={form.oib} onChange={e => setF('oib', e.target.value)} maxLength={11} placeholder="11 znamenki" /></Field>
            <Field label="Mjesto rođenja"><input className={inputCls} style={inputStyle} value={form.mjesto_rodjenja} onChange={e => setF('mjesto_rodjenja', e.target.value)} placeholder="npr. Dhaka" /></Field>
            <div>
              <Field label="Država rođenja">
                <select className={inputCls} style={inputStyle} value={form.drzava_rodjenja} onChange={e => setF('drzava_rodjenja', e.target.value)}>
                  <option value="">Odaberite...</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <div className="col-span-1 md:col-span-2">
              <Field label="Državljanstvo">
                <select className={inputCls} style={inputStyle} value={form.drzavljanstvo} onChange={e => setF('drzavljanstvo', e.target.value)}>
                  <option value="">Isto kao država rođenja{form.drzava_rodjenja ? ` (${form.drzava_rodjenja})` : ''}</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <div className="col-span-1 md:col-span-2">
              <Field label="Status zaposlenika">
                <StatusPicker value={form.status_zaposlenika} onChange={v => setF('status_zaposlenika', v)} />
              </Field>
            </div>
          </div>
        </Section>

        {/* Dodatne informacije */}
        <Section {...sek('dodatno')} icon="ℹ️" title="Dodatne informacije" desc="Kontakt, smještaj i ostali podaci (opcionalno)."
          summary={[extra.telefon, extra.email, extra.adresa_smjestaja].some(Boolean)
            ? <span className="truncate">{[extra.telefon, extra.email, extra.adresa_smjestaja].filter(Boolean).join(' · ')}</span>
            : <Prazno>Nije uneseno</Prazno>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email"><input type="email" className={inputCls} style={inputStyle} value={extra.email} onChange={e => setE('email', e.target.value)} placeholder="email@primjer.com" /></Field>
            <Field label="Telefon"><input className={inputCls} style={inputStyle} value={extra.telefon} onChange={e => setE('telefon', e.target.value)} placeholder="+385..." /></Field>
            <Field label="Ime oca"><input className={inputCls} style={inputStyle} value={extra.ime_oca} onChange={e => setE('ime_oca', e.target.value)} /></Field>
            <Field label="IBAN"><input className={inputCls} style={inputStyle} value={extra.iban} onChange={e => setE('iban', e.target.value)} placeholder="HR..." /></Field>
            <div className="col-span-1 md:col-span-2">
              <Field label="Adresa smještaja (HR)"><input className={inputCls} style={inputStyle} value={extra.adresa_smjestaja} onChange={e => setE('adresa_smjestaja', e.target.value)} placeholder="Ulica i broj, Grad" /></Field>
            </div>
            <div className="col-span-1 md:col-span-2">
              <Field label="Adresa u matičnoj zemlji"><input className={inputCls} style={inputStyle} value={extra.adresa_domovina} onChange={e => setE('adresa_domovina', e.target.value)} placeholder="npr. House 12, Road 5, Mirpur, Dhaka 1216, Bangladesh" /></Field>
            </div>
            <Field label="Stručna sprema"><input className={inputCls} style={inputStyle} value={extra.strucna_sprema} onChange={e => setE('strucna_sprema', e.target.value)} placeholder="npr. SSS" /></Field>
          </div>
        </Section>

        {/* Rad stranca */}
        <Section {...sek('rad')} icon="💼" title="Rad stranca" desc="Vrsta zaposlenja, tvrtka i radno mjesto."
          summary={(() => {
            const tvrtka = companyId ? companies.find(c => c.id === companyId)?.naziv : poslodavacManual
            if (!vrsta && !tvrtka && !form.radno_mjesto) return <Prazno>Nema podataka o zaposlenju</Prazno>
            return <>
              <PillTag p={vrsta ? VRSTA_BADGE[vrsta] : null} />
              <span className="truncate">{[tvrtka, form.radno_mjesto].filter(Boolean).join(' · ')}</span>
            </>
          })()}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Vrsta zaposlenja">
                <select className={inputCls} style={inputStyle} value={vrsta}
                  onChange={e => setVrsta(e.target.value as VrstaZaposlenja | '')}>
                  <option value="">— Odaberi —</option>
                  {(Object.keys(VRSTA_LABEL) as VrstaZaposlenja[]).map(v => <option key={v} value={v}>{VRSTA_LABEL[v]}</option>)}
                </select>
              </Field>
              {vrsta === 'ustupanje' && (
                <p className="text-xs mt-1.5" style={{ color: '#64748B' }}>
                  Poslodavac je <b>{AGENCIJA}</b> — radnik je ustupljen tvrtki odabranoj ispod.
                </p>
              )}
              {vrsta === 'izravno' && (
                <p className="text-xs mt-1.5" style={{ color: '#64748B' }}>
                  Radnik je zaposlen izravno kod tvrtke odabrane ispod.
                </p>
              )}
            </div>
            <div className="col-span-2 md:col-span-1">
              <Field label={vrsta === 'ustupanje' ? 'Ustupljen tvrtki (korisnik)' : vrsta === 'izravno' ? 'Poslodavac (tvrtka)' : 'Tvrtka'}>
                <select className={inputCls} style={inputStyle}
                  value={companyId}
                  onChange={e => setCompanyId(e.target.value)}>
                  <option value="">— Ručni unos —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.naziv}</option>)}
                </select>
                {!companyId && (
                  <input className={inputCls + ' mt-2'} style={inputStyle}
                    placeholder="Upiši naziv poslodavca..."
                    value={poslodavacManual}
                    onChange={e => setPoslodavacManual(e.target.value)} />
                )}
              </Field>
            </div>
            <Field label="Radno mjesto"><input className={inputCls} style={inputStyle} value={form.radno_mjesto} onChange={e => setF('radno_mjesto', e.target.value)} /></Field>
            {vrsta === 'ustupanje' && (
              <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#374151' }}>
                  <input type="checkbox" checked={ustupanjeOdredeno} onChange={e => setUstupanjeOdredeno(e.target.checked)} />
                  Ustupanje na određeno vrijeme <span style={{ color: '#94A3B8' }}>(inače neodređeno)</span>
                </label>
              </div>
            )}
            {vrsta === 'ustupanje' && ustupanjeOdredeno && (
              <>
                <Field label="Ustupljen od">
                  <input type="date" className={inputCls} style={inputStyle} value={ustupanjeOd} onChange={e => setUstupanjeOd(e.target.value)} />
                </Field>
                <Field label="Ustupljen do">
                  <input type="date" className={inputCls} style={inputStyle} value={ustupanjeDo} onChange={e => setUstupanjeDo(e.target.value)} />
                </Field>
              </>
            )}
          </div>
        </Section>

        {/* Godišnji odmor & Bolovanje */}
        <Section {...sek('odsutnosti')} icon="📅" title="Godišnji odmor & Bolovanje" desc="Evidencija odsutnosti radnika."
          summary={(() => {
            const danas = new Date().toISOString().slice(0, 10)
            const aktivno = (l: any[]) => l.some(x => x.datum_od && x.datum_do && x.datum_od <= danas && x.datum_do >= danas)
            if (vacations.length === 0 && sickLeaves.length === 0) return <Prazno>Nema unesenih odsutnosti</Prazno>
            return <>
              <span>{vacations.length} {vacations.length === 1 ? 'godišnji' : 'godišnjih'} · {sickLeaves.length} {sickLeaves.length === 1 ? 'bolovanje' : 'bolovanja'}</span>
              {aktivno(vacations) && <PillTag p={{ label: 'Na godišnjem', color: '#16A34A', bg: '#DCFCE7' }} />}
              {aktivno(sickLeaves) && <PillTag p={{ label: 'Na bolovanju', color: '#CA8A04', bg: '#FEF9C3' }} />}
            </>
          })()}>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: '#374151' }}>Godišnji odmor</p>
              <button type="button" onClick={() => setVacations(prev => [...prev, { datum_od: '', datum_do: '', napomena: '', _new: true }])}
                className="btn-link text-xs font-medium" style={{ color: '#2563EB' }}>+ Dodaj</button>
            </div>
            {vacations.length === 0 && <p className="text-xs" style={{ color: '#94A3B8' }}>Nema unesenih godišnjih odmora.</p>}
            {vacations.map((vac, i) => (
              <div key={vac.id || i} className="flex items-center gap-3 mb-2 p-3 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <span className="text-sm">🌴</span>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div><p className="text-xs mb-1" style={{ color: '#64748B' }}>Od</p>
                    <input type="date" className={inputCls} style={inputStyle} value={vac.datum_od || ''} onChange={e => setVacations(prev => prev.map((v, j) => j === i ? { ...v, datum_od: e.target.value } : v))} /></div>
                  <div><p className="text-xs mb-1" style={{ color: '#64748B' }}>Do</p>
                    <input type="date" className={inputCls} style={inputStyle} value={vac.datum_do || ''} onChange={e => setVacations(prev => prev.map((v, j) => j === i ? { ...v, datum_do: e.target.value } : v))} /></div>
                  <div className="col-span-2">
                    <AbsenceFile hint="zahtjev / odluku"
                      fileUrl={vac._fileRemoved ? null : vac.file_url} newFile={vac._newFile}
                      onPick={f => setVacations(prev => prev.map((v, j) => j === i ? { ...v, _newFile: f } : v))}
                      onClear={() => setVacations(prev => prev.map((v, j) => j === i ? { ...v, _fileRemoved: true, _newFile: null } : v))} />
                  </div>
                </div>
                <button type="button" onClick={() => { if (vac.id) setDeletedVacationIds(prev => [...prev, vac.id]); setVacations(prev => prev.filter((_, j) => j !== i)) }}
                  className="btn-text-danger text-xs flex-shrink-0" style={{ color: '#EF4444' }}>Ukloni</button>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: '#374151' }}>Bolovanje</p>
              <button type="button" onClick={() => setSickLeaves(prev => [...prev, { datum_od: '', datum_do: '', napomena: '', _new: true }])}
                className="btn-link text-xs font-medium" style={{ color: '#2563EB' }}>+ Dodaj</button>
            </div>
            {sickLeaves.length === 0 && <p className="text-xs" style={{ color: '#94A3B8' }}>Nema unesenih bolovanja.</p>}
            {sickLeaves.map((sick, i) => (
              <div key={sick.id || i} className="flex items-center gap-3 mb-2 p-3 rounded-lg" style={{ background: '#FEFCE8', border: '1px solid #FEF08A' }}>
                <span className="text-sm">🏥</span>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div><p className="text-xs mb-1" style={{ color: '#64748B' }}>Od</p>
                    <input type="date" className={inputCls} style={inputStyle} value={sick.datum_od || ''} onChange={e => setSickLeaves(prev => prev.map((s, j) => j === i ? { ...s, datum_od: e.target.value } : s))} /></div>
                  <div><p className="text-xs mb-1" style={{ color: '#64748B' }}>Do</p>
                    <input type="date" className={inputCls} style={inputStyle} value={sick.datum_do || ''} onChange={e => setSickLeaves(prev => prev.map((s, j) => j === i ? { ...s, datum_do: e.target.value } : s))} /></div>
                  <div className="col-span-2">
                    <AbsenceFile hint="doznaku / potvrdu liječnika"
                      fileUrl={sick._fileRemoved ? null : sick.file_url} newFile={sick._newFile}
                      onPick={f => setSickLeaves(prev => prev.map((s, j) => j === i ? { ...s, _newFile: f } : s))}
                      onClear={() => setSickLeaves(prev => prev.map((s, j) => j === i ? { ...s, _fileRemoved: true, _newFile: null } : s))} />
                  </div>
                </div>
                <button type="button" onClick={() => { if (sick.id) setDeletedSickIds(prev => [...prev, sick.id]); setSickLeaves(prev => prev.filter((_, j) => j !== i)) }}
                  className="btn-text-danger text-xs flex-shrink-0" style={{ color: '#EF4444' }}>Ukloni</button>
              </div>
            ))}
          </div>
        </Section>

        <div className="sticky bottom-[68px] md:bottom-4 z-10 mt-4 mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div className="flex-1 min-w-0 text-xs">
            {error ? <span style={{ color: '#DC2626' }}>⚠️ {error}</span>
              : success ? <span style={{ color: '#16A34A' }}>✓ Podaci uspješno spremljeni.</span>
              : imaPromjena ? <span style={{ color: '#2563EB' }}>● Imaš nespremljene promjene</span>
              : <span style={{ color: '#94A3B8' }}>Sve je spremljeno</span>}
          </div>
          <Link href="/zaposlenici"
            onClick={e => { if (imaPromjena && !confirm('Odbaciti nespremljene promjene?')) e.preventDefault() }}
            className="btn-secondary px-4 py-2.5 rounded-lg text-sm font-medium flex-shrink-0" style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</Link>
          <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 rounded-lg text-sm font-medium text-white flex-shrink-0"
            style={{ background: saving ? '#93C5FD' : 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: saving ? 'none' : '0 4px 14px rgba(37,99,235,0.3)', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Spremanje...' : '✓ Spremi promjene'}
          </button>
        </div>
      </form>
      </div>

      {/* Dokumenti: svi na jednom mjestu, spremaju se odmah */}
      <RadnikDokumenti sticky employeeId={id} docs={docs} onDocsChange={setDocs} drafts={docDrafts} onDraftsChange={setDocDrafts} />
      </div>
    </div>
  )
}
