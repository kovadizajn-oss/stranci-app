'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

const DOC_TYPES = [
  { value: 'putovnica', label: 'Putovnica' },
  { value: 'dozvola_boravka', label: 'Dozvola boravka' },
  { value: 'radna_dozvola', label: 'Radna dozvola' },
  { value: 'oib', label: 'OIB' },
  { value: 'zdravstveno', label: 'Zdravstveno osiguranje' },
  { value: 'other', label: 'Ostalo' },
]

const ATTACHMENT_TYPES = [
  { value: 'ugovor_o_radu', label: 'Ugovor o radu' },
  { value: 'potvrda_o_zaposlenju', label: 'Potvrda o zaposlenju' },
  { value: 'potvrda_o_prijavi', label: 'Potvrda o prijavi boravišta' },
  { value: 'najamninski_ugovor', label: 'Najamninski ugovor' },
  { value: 'other', label: 'Ostalo' },
]

const inputCls = "w-full px-3 py-2.5 rounded-lg border text-sm transition-all"
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>{label}</label>
      {children}
    </div>
  )
}

function Section({ icon, title, desc, children }: { icon: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-6 mb-4" style={{ border: '1px solid #E2E8F0' }}>
      <div className="flex items-start gap-3 mb-5" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 16 }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
          <span>{icon}</span>
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>{title}</p>
          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{desc}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function fileNameFromUrl(url: string) {
  try {
    const parts = decodeURIComponent(url).split('/')
    const raw = parts[parts.length - 1]
    // Strip the timestamp prefix (e.g. "doc_1234567890_filename.pdf" → "filename.pdf")
    return raw.replace(/^(doc|att|photo)_\d+_/, '')
  } catch {
    return 'Datoteka'
  }
}

function formatDateHR(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getDate().toString().padStart(2,'0')}.${(dt.getMonth()+1).toString().padStart(2,'0')}.${dt.getFullYear()}.`
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    ime: '', prezime: '', datum_rodjenja: '', mjesto_rodjenja: '',
    drzava_rodjenja: '', drzava_drzavljanstva: '', adresa_prebivalista: '',
    email: '', telefon: '',
    datum_ulaska_egp: '', mjesto_ulaska_egp: '',
    datum_isteka_smjestaja: '',
    photo_url: '',
  })
  const [documents, setDocuments] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [addresses, setAddresses] = useState<any[]>([])
  const [vacations, setVacations] = useState<any[]>([])
  const [sickLeaves, setSickLeaves] = useState<any[]>([])

  // Track deleted IDs
  const [showAddressHistory, setShowAddressHistory] = useState(false)
  const [deletedAddressIds, setDeletedAddressIds] = useState<string[]>([])
  const [deletedVacationIds, setDeletedVacationIds] = useState<string[]>([])
  const [deletedSickIds, setDeletedSickIds] = useState<string[]>([])
  const [workHistory, setWorkHistory] = useState<any[]>([])
  const [showWorkHistory, setShowWorkHistory] = useState(false)
  const [deletedWorkHistoryIds, setDeletedWorkHistoryIds] = useState<string[]>([])

  function setF(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    async function load() {
      const { data: emp } = await supabase.from('employees').select('*').eq('id', id).single()
      if (!emp) { router.push('/zaposlenici'); return }
      setForm({
        ime: emp.ime || '', prezime: emp.prezime || '',
        datum_rodjenja: emp.datum_rodjenja || '', mjesto_rodjenja: emp.mjesto_rodjenja || '',
        drzava_rodjenja: emp.drzava_rodjenja || '', drzava_drzavljanstva: emp.drzava_drzavljanstva || '',
        adresa_prebivalista: emp.adresa_prebivalista || '',
        email: emp.email || '', telefon: emp.telefon || '',
        datum_ulaska_egp: emp.datum_ulaska_egp || '',
        mjesto_ulaska_egp: emp.mjesto_ulaska_egp || '',
        datum_isteka_smjestaja: emp.datum_isteka_smjestaja || '',
        photo_url: emp.photo_url || '',
      })

      const { data: docs } = await supabase.from('documents').select('*').eq('employee_id', id)
      const { data: atts } = await supabase.from('attachments').select('*').eq('employee_id', id)
      const { data: addrs } = await supabase.from('addresses').select('*').eq('employee_id', id).order('datum_od', { ascending: false })
      const { data: vacs } = await supabase.from('vacations').select('*').eq('employee_id', id).order('datum_od', { ascending: false })
      const { data: sick } = await supabase.from('sick_leaves').select('*').eq('employee_id', id).order('datum_od', { ascending: false })
      const { data: wh } = await supabase.from('work_history').select('*').eq('employee_id', id).order('datum_od', { ascending: false })

      setDocuments(docs?.length ? docs : [{ tip_dokumenta: '', broj_dokumenta: '', datum_izdavanja: '', datum_isteka: '', file_url: '', _new: true }])
      setAttachments(atts?.length ? atts : [{ tip_dokumenta: '', datum_izdavanja: '', datum_isteka: '', file_url: '', _new: true }])
      setAddresses(addrs?.length ? addrs : [{ adresa: '', datum_od: '', datum_do: '', is_current: true, _new: true }])
      setVacations(vacs || [])
      setSickLeaves(sick || [])
      setWorkHistory(wh?.length ? wh : [{ poslodavac: emp.poslodavac || '', radno_mjesto: emp.radno_mjesto || '', datum_od: '', datum_do: '', is_current: true, _new: true }])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const currentJob = workHistory.find((w: any) => w.is_current && !w.datum_do)
      await supabase.from('employees').update({
        ime: form.ime, prezime: form.prezime,
        datum_rodjenja: form.datum_rodjenja || null,
        mjesto_rodjenja: form.mjesto_rodjenja || null,
        drzava_rodjenja: form.drzava_rodjenja || null,
        drzava_drzavljanstva: form.drzava_drzavljanstva || null,
        adresa_prebivalista: form.adresa_prebivalista || null,
        email: form.email || null,
        telefon: form.telefon || null,
        datum_ulaska_egp: form.datum_ulaska_egp || null,
        mjesto_ulaska_egp: form.mjesto_ulaska_egp || null,
        datum_isteka_smjestaja: form.datum_isteka_smjestaja || null,
        poslodavac: currentJob?.poslodavac || null,
        radno_mjesto: currentJob?.radno_mjesto || null,
      }).eq('id', id)

      // Documents
      for (const doc of documents) {
        if (!doc.tip_dokumenta) continue
        let fileUrl = doc.file_url || null
        if (doc._newFile) {
          const { data: uploaded, error: uploadErr } = await supabase.storage
            .from('dokumenti')
            .upload(`${id}/doc_${Date.now()}_${doc._newFile.name}`, doc._newFile, { upsert: true })
          if (!uploadErr && uploaded) {
            const { data: urlData } = supabase.storage.from('dokumenti').getPublicUrl(uploaded.path)
            fileUrl = urlData.publicUrl
          }
        }
        if (doc._new || !doc.id) {
          await supabase.from('documents').insert({ employee_id: id, tip_dokumenta: doc.tip_dokumenta, broj_dokumenta: doc.broj_dokumenta || null, datum_izdavanja: doc.datum_izdavanja || null, datum_isteka: doc.datum_isteka || null, file_url: fileUrl })
        } else {
          await supabase.from('documents').update({ tip_dokumenta: doc.tip_dokumenta, broj_dokumenta: doc.broj_dokumenta || null, datum_izdavanja: doc.datum_izdavanja || null, datum_isteka: doc.datum_isteka || null, file_url: fileUrl }).eq('id', doc.id)
        }
      }

      // Attachments
      for (const att of attachments) {
        if (!att.tip_dokumenta) continue
        let fileUrl = att.file_url || null
        if (att._newFile) {
          const { data: uploaded, error: uploadErr } = await supabase.storage
            .from('dokumenti')
            .upload(`${id}/att_${Date.now()}_${att._newFile.name}`, att._newFile, { upsert: true })
          if (!uploadErr && uploaded) {
            const { data: urlData } = supabase.storage.from('dokumenti').getPublicUrl(uploaded.path)
            fileUrl = urlData.publicUrl
          }
        }
        if (att._new || !att.id) {
          await supabase.from('attachments').insert({ employee_id: id, tip_dokumenta: att.tip_dokumenta, datum_izdavanja: att.datum_izdavanja || null, datum_isteka: att.datum_isteka || null, file_url: fileUrl })
        } else {
          await supabase.from('attachments').update({ tip_dokumenta: att.tip_dokumenta, datum_izdavanja: att.datum_izdavanja || null, datum_isteka: att.datum_isteka || null, file_url: fileUrl }).eq('id', att.id)
        }
      }

      // Addresses - delete removed ones
      for (const addrId of deletedAddressIds) {
        await supabase.from('addresses').delete().eq('id', addrId)
      }
      for (const addr of addresses) {
        if (!addr.adresa) continue
        if (addr._new || !addr.id) {
          await supabase.from('addresses').insert({ employee_id: id, adresa: addr.adresa, datum_od: addr.datum_od || null, datum_do: addr.datum_do || null, is_current: addr.is_current || false })
        } else {
          await supabase.from('addresses').update({ adresa: addr.adresa, datum_od: addr.datum_od || null, datum_do: addr.datum_do || null, is_current: addr.is_current || false }).eq('id', addr.id)
        }
      }

      // Vacations
      for (const vacId of deletedVacationIds) {
        await supabase.from('vacations').delete().eq('id', vacId)
      }
      for (const vac of vacations) {
        if (!vac.datum_od || !vac.datum_do) continue
        if (vac._new || !vac.id) {
          await supabase.from('vacations').insert({ employee_id: id, datum_od: vac.datum_od, datum_do: vac.datum_do, napomena: vac.napomena || null })
        } else {
          await supabase.from('vacations').update({ datum_od: vac.datum_od, datum_do: vac.datum_do, napomena: vac.napomena || null }).eq('id', vac.id)
        }
      }

      // Sick leaves
      for (const sickId of deletedSickIds) {
        await supabase.from('sick_leaves').delete().eq('id', sickId)
      }
      for (const sick of sickLeaves) {
        if (!sick.datum_od || !sick.datum_do) continue
        if (sick._new || !sick.id) {
          await supabase.from('sick_leaves').insert({ employee_id: id, datum_od: sick.datum_od, datum_do: sick.datum_do, napomena: sick.napomena || null })
        } else {
          await supabase.from('sick_leaves').update({ datum_od: sick.datum_od, datum_do: sick.datum_do, napomena: sick.napomena || null }).eq('id', sick.id)
        }
      }

      // Work history
      for (const whId of deletedWorkHistoryIds) {
        await supabase.from('work_history').delete().eq('id', whId)
      }
      for (const wh of workHistory) {
        if (!wh.poslodavac) continue
        // If the "current" job has an end date filled, it's no longer current
        const isCurrent = wh.is_current && !wh.datum_do
        if (wh._new || !wh.id) {
          await supabase.from('work_history').insert({ employee_id: id, poslodavac: wh.poslodavac, radno_mjesto: wh.radno_mjesto || null, datum_od: wh.datum_od || null, datum_do: wh.datum_do || null, is_current: isCurrent })
        } else {
          await supabase.from('work_history').update({ poslodavac: wh.poslodavac, radno_mjesto: wh.radno_mjesto || null, datum_od: wh.datum_od || null, datum_do: wh.datum_do || null, is_current: isCurrent }).eq('id', wh.id)
        }
      }

      setDeletedAddressIds([])
      setDeletedVacationIds([])
      setDeletedSickIds([])
      setDeletedWorkHistoryIds([])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Greška pri spremanju.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/zaposlenici" className="text-sm" style={{ color: '#64748B' }}>← Zaposlenici</Link>
      <div className="flex items-center gap-4 mt-2 mb-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
          style={{ background: '#EFF6FF', color: '#2563EB' }}>
          {form.ime[0]}{form.prezime[0]}
        </div>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#1E293B' }}>{form.ime} {form.prezime}</h1>
          <p className="text-sm" style={{ color: '#64748B' }}>{form.drzava_drzavljanstva || 'Nepoznata država'} · {workHistory.find((w: any) => w.is_current)?.poslodavac || 'Bez poslodavca'}</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</div>}
      {success && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#F0FDF4', color: '#16A34A' }}>Podaci uspješno spremljeni.</div>}

      <form onSubmit={handleSave}>
        {/* Osobni podaci */}
        <Section icon="👤" title="Osobni podaci" desc="Osnovni identifikacijski podaci radnika.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ime"><input className={inputCls} style={inputStyle} value={form.ime} onChange={e => setF('ime', e.target.value)} required /></Field>
            <Field label="Prezime"><input className={inputCls} style={inputStyle} value={form.prezime} onChange={e => setF('prezime', e.target.value)} required /></Field>
            <Field label="Datum rođenja"><input type="date" className={inputCls} style={inputStyle} value={form.datum_rodjenja} onChange={e => setF('datum_rodjenja', e.target.value)} /></Field>
            <Field label="Mjesto rođenja"><input className={inputCls} style={inputStyle} value={form.mjesto_rodjenja} onChange={e => setF('mjesto_rodjenja', e.target.value)} /></Field>
            <Field label="Država rođenja">
              <select className={inputCls} style={inputStyle} value={form.drzava_rodjenja} onChange={e => setF('drzava_rodjenja', e.target.value)}>
                <option value="">Odaberite...</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Država državljanstva">
              <select className={inputCls} style={inputStyle} value={form.drzava_drzavljanstva} onChange={e => setF('drzava_drzavljanstva', e.target.value)}>
                <option value="">Odaberite...</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Adresa prebivališta"><input className={inputCls} style={inputStyle} value={form.adresa_prebivalista} onChange={e => setF('adresa_prebivalista', e.target.value)} /></Field>
            </div>
          </div>
        </Section>

        {/* Kontakt */}
        <Section icon="✉️" title="Kontakt podaci" desc="Kako kontaktirati radnika.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email"><input type="email" className={inputCls} style={inputStyle} value={form.email} onChange={e => setF('email', e.target.value)} /></Field>
            <Field label="Telefon"><input className={inputCls} style={inputStyle} value={form.telefon} onChange={e => setF('telefon', e.target.value)} /></Field>
          </div>
        </Section>

        {/* Osobni dokumenti */}
        <Section icon="🪪" title="Osobni dokumenti" desc="Podaci iz putovnice i dokumenta boravka.">
          {documents.map((doc, i) => (
            <div key={doc.id || i} className="mb-4 pb-4" style={{ borderBottom: i < documents.length - 1 ? '1px dashed #E2E8F0' : 'none' }}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-medium" style={{ color: '#374151' }}>Dokument {i + 1}</p>
                <div className="flex gap-2">
                  {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded" style={{ background: '#EFF6FF', color: '#2563EB' }}>Pogledaj ↗</a>}
                  {documents.length > 1 && <button type="button" onClick={() => setDocuments(prev => prev.filter((_, j) => j !== i))} className="text-xs" style={{ color: '#EF4444' }}>Ukloni</button>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tip dokumenta">
                  <select className={inputCls} style={inputStyle} value={doc.tip_dokumenta || ''} onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, tip_dokumenta: e.target.value } : d))}>
                    <option value="">Odaberite...</option>
                    {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Broj dokumenta"><input className={inputCls} style={inputStyle} value={doc.broj_dokumenta || ''} onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, broj_dokumenta: e.target.value } : d))} /></Field>
                <Field label="Datum izdavanja"><input type="date" className={inputCls} style={inputStyle} value={doc.datum_izdavanja || ''} onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, datum_izdavanja: e.target.value } : d))} /></Field>
                <Field label="Datum isteka"><input type="date" className={inputCls} style={inputStyle} value={doc.datum_isteka || ''} onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, datum_isteka: e.target.value } : d))} /></Field>
                <div className="col-span-2">
                  <p className="text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Preslika dokumenta <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcionalno)</span></p>
                  {doc._newFile ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                      <span className="text-xs" style={{ color: '#16A34A' }}>✓ {doc._newFile.name}</span>
                      <button type="button" onClick={() => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, _newFile: null } : d))} className="text-xs ml-auto" style={{ color: '#94A3B8' }}>✕</button>
                    </div>
                  ) : doc.file_url ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                        <span style={{ color: '#64748B', fontSize: 14 }}>📄</span>
                        <span className="text-xs truncate" style={{ color: '#374151' }}>{fileNameFromUrl(doc.file_url)}</span>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs ml-auto flex-shrink-0" style={{ color: '#2563EB' }}>↗</a>
                      </div>
                      <label className="cursor-pointer text-xs px-3 py-2 rounded-lg flex-shrink-0" style={{ background: '#F1F5F9', color: '#374151' }}>
                        Zamijeni
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                          onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, _newFile: e.target.files?.[0] || null } : d))} />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border text-sm"
                      style={{ borderColor: '#D1D5DB', background: 'white', color: '#374151' }}>
                      ↑ Učitaj (PDF, JPG, PNG do 10 MB)
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                        onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, _newFile: e.target.files?.[0] || null } : d))} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setDocuments(prev => [...prev, { tip_dokumenta: '', broj_dokumenta: '', datum_izdavanja: '', datum_isteka: '', _new: true }])} className="text-sm font-medium" style={{ color: '#2563EB' }}>+ Dodaj dokument</button>
        </Section>

        {/* Prateći dokumenti */}
        <Section icon="📎" title="Prateći dokumenti" desc="Ugovori, potvrde i ostali prateći dokumenti.">
          {attachments.map((att, i) => (
            <div key={att.id || i} className="mb-4 pb-4" style={{ borderBottom: i < attachments.length - 1 ? '1px dashed #E2E8F0' : 'none' }}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-medium" style={{ color: '#374151' }}>Prilog {i + 1}</p>
                <div className="flex gap-2">
                  {attachments.length > 1 && <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-xs" style={{ color: '#EF4444' }}>Ukloni</button>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tip dokumenta">
                  <select className={inputCls} style={inputStyle} value={att.tip_dokumenta || ''} onChange={e => setAttachments(prev => prev.map((a, j) => j === i ? { ...a, tip_dokumenta: e.target.value } : a))}>
                    <option value="">Odaberite...</option>
                    {ATTACHMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <div />
                <Field label="Datum izdavanja"><input type="date" className={inputCls} style={inputStyle} value={att.datum_izdavanja || ''} onChange={e => setAttachments(prev => prev.map((a, j) => j === i ? { ...a, datum_izdavanja: e.target.value } : a))} /></Field>
                <Field label="Datum isteka"><input type="date" className={inputCls} style={inputStyle} value={att.datum_isteka || ''} onChange={e => setAttachments(prev => prev.map((a, j) => j === i ? { ...a, datum_isteka: e.target.value } : a))} /></Field>
                <div className="col-span-2">
                  <p className="text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Preslika dokumenta <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcionalno)</span></p>
                  {att._newFile ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                      <span className="text-xs" style={{ color: '#16A34A' }}>✓ {att._newFile.name}</span>
                      <button type="button" onClick={() => setAttachments(prev => prev.map((a, j) => j === i ? { ...a, _newFile: null } : a))} className="text-xs ml-auto" style={{ color: '#94A3B8' }}>✕</button>
                    </div>
                  ) : att.file_url ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                        <span style={{ color: '#64748B', fontSize: 14 }}>📄</span>
                        <span className="text-xs truncate" style={{ color: '#374151' }}>{fileNameFromUrl(att.file_url)}</span>
                        <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-xs ml-auto flex-shrink-0" style={{ color: '#2563EB' }}>↗</a>
                      </div>
                      <label className="cursor-pointer text-xs px-3 py-2 rounded-lg flex-shrink-0" style={{ background: '#F1F5F9', color: '#374151' }}>
                        Zamijeni
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                          onChange={e => setAttachments(prev => prev.map((a, j) => j === i ? { ...a, _newFile: e.target.files?.[0] || null } : a))} />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border text-sm"
                      style={{ borderColor: '#D1D5DB', background: 'white', color: '#374151' }}>
                      ↑ Učitaj (PDF, JPG, PNG do 10 MB)
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                        onChange={e => setAttachments(prev => prev.map((a, j) => j === i ? { ...a, _newFile: e.target.files?.[0] || null } : a))} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setAttachments(prev => [...prev, { tip_dokumenta: '', datum_izdavanja: '', datum_isteka: '', _new: true }])} className="text-sm font-medium" style={{ color: '#2563EB' }}>+ Dodaj prilog</button>
        </Section>

        {/* Boravak */}
        <Section icon="🏠" title="Boravak stranca" desc="Podaci o boravištu u Republici Hrvatskoj.">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Current address — the is_current entry */}
            <div className="col-span-2">
              <Field label="Trenutna adresa boravišta">
                <input
                  className={inputCls} style={inputStyle}
                  placeholder="Ulica i broj, grad"
                  value={addresses.find((a: any) => a.is_current)?.adresa || ''}
                  onChange={e => {
                    const currentIdx = addresses.findIndex((a: any) => a.is_current)
                    if (currentIdx >= 0) {
                      setAddresses(prev => prev.map((a, j) => j === currentIdx ? { ...a, adresa: e.target.value } : a))
                    } else {
                      setAddresses(prev => [...prev, { adresa: e.target.value, datum_od: new Date().toISOString().split('T')[0], datum_do: '', is_current: true, _new: true }])
                    }
                  }}
                />
              </Field>
            </div>
            <Field label="Datum isteka smještaja">
              <input type="date" className={inputCls} style={inputStyle} value={form.datum_isteka_smjestaja} onChange={e => setF('datum_isteka_smjestaja', e.target.value)} />
            </Field>
            <div />
            <Field label="Datum ulaska u EGP"><input type="date" className={inputCls} style={inputStyle} value={form.datum_ulaska_egp} onChange={e => setF('datum_ulaska_egp', e.target.value)} /></Field>
            <Field label="Mjesto ulaska u EGP"><input className={inputCls} style={inputStyle} value={form.mjesto_ulaska_egp} onChange={e => setF('mjesto_ulaska_egp', e.target.value)} /></Field>
          </div>

          {/* Collapsible address history */}
          <button
            type="button"
            onClick={() => setShowAddressHistory(prev => !prev)}
            className="flex items-center gap-1.5 text-sm font-medium mb-3"
            style={{ color: '#2563EB' }}
          >
            <span style={{ fontSize: 12 }}>{showAddressHistory ? '▼' : '▶'}</span>
            Povijest adresa {addresses.filter((a: any) => !a.is_current).length > 0 && `(${addresses.filter((a: any) => !a.is_current).length})`}
          </button>

          {showAddressHistory && (
            <div>
              {addresses.filter((a: any) => !a.is_current).length === 0 && (
                <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>Nema starijih adresa.</p>
              )}
              {addresses.map((addr, i) => {
                if (addr.is_current) return null
                return (
                  <div key={addr.id || i} className="mb-3 p-3 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="flex justify-end mb-2">
                      <button type="button" onClick={() => {
                        if (addr.id) setDeletedAddressIds(prev => [...prev, addr.id])
                        setAddresses(prev => prev.filter((_, j) => j !== i))
                      }} className="text-xs" style={{ color: '#EF4444' }}>Ukloni</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-3">
                        <input className={inputCls} style={inputStyle} placeholder="Ulica i broj, grad" value={addr.adresa || ''}
                          onChange={e => setAddresses(prev => prev.map((a, j) => j === i ? { ...a, adresa: e.target.value } : a))} />
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#64748B' }}>Od</p>
                        <input type="date" className={inputCls} style={inputStyle} value={addr.datum_od || ''}
                          onChange={e => setAddresses(prev => prev.map((a, j) => j === i ? { ...a, datum_od: e.target.value } : a))} />
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#64748B' }}>Do</p>
                        <input type="date" className={inputCls} style={inputStyle} value={addr.datum_do || ''}
                          onChange={e => setAddresses(prev => prev.map((a, j) => j === i ? { ...a, datum_do: e.target.value } : a))} />
                      </div>
                    </div>
                  </div>
                )
              })}
              <button type="button"
                onClick={() => setAddresses(prev => [...prev, { adresa: '', datum_od: '', datum_do: '', is_current: false, _new: true }])}
                className="text-xs font-medium" style={{ color: '#2563EB' }}>
                + Dodaj stariju adresu
              </button>
            </div>
          )}
        </Section>

        {/* Rad */}
        <Section icon="💼" title="Rad stranca" desc="Zanimanje, poslodavac i dozvola za rad.">
          {(() => {
            const currentIdx = workHistory.findIndex((w: any) => w.is_current)
            const current = workHistory[currentIdx] || {}
            return (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="Poslodavac / firma">
                  <input className={inputCls} style={inputStyle} value={current.poslodavac || ''}
                    onChange={e => setWorkHistory(prev => prev.map((w, j) => j === currentIdx ? { ...w, poslodavac: e.target.value } : w))} />
                </Field>
                <Field label="Radno mjesto">
                  <input className={inputCls} style={inputStyle} value={current.radno_mjesto || ''}
                    onChange={e => setWorkHistory(prev => prev.map((w, j) => j === currentIdx ? { ...w, radno_mjesto: e.target.value } : w))} />
                </Field>
                <Field label="Datum početka">
                  <input type="date" className={inputCls} style={inputStyle} value={current.datum_od || ''}
                    onChange={e => setWorkHistory(prev => prev.map((w, j) => j === currentIdx ? { ...w, datum_od: e.target.value } : w))} />
                </Field>
                <Field label="Datum završetka">
                  <input type="date" className={inputCls} style={inputStyle} value={current.datum_do || ''}
                    placeholder="Prazno = još radi"
                    onChange={e => setWorkHistory(prev => prev.map((w, j) => j === currentIdx ? { ...w, datum_do: e.target.value } : w))} />
                </Field>
              </div>
            )
          })()}

          <button type="button"
            onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              setWorkHistory(prev => [
                { poslodavac: '', radno_mjesto: '', datum_od: today, datum_do: '', is_current: true, _new: true },
                ...prev.map((w: any) => w.is_current ? { ...w, is_current: false, datum_do: w.datum_do || today } : w),
              ])
            }}
            className="text-xs font-medium mb-4 block"
            style={{ color: '#2563EB' }}>
            + Promijeni poslodavca
          </button>

          <button type="button"
            onClick={() => setShowWorkHistory(prev => !prev)}
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: '#2563EB' }}>
            <span style={{ fontSize: 12 }}>{showWorkHistory ? '▼' : '▶'}</span>
            Radna povijest {workHistory.filter((w: any) => !w.is_current).length > 0 && `(${workHistory.filter((w: any) => !w.is_current).length})`}
          </button>

          {showWorkHistory && (
            <div className="mt-3">
              {workHistory.filter((w: any) => !w.is_current).length === 0 && (
                <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>Nema prethodnih poslodavaca.</p>
              )}
              {workHistory.map((work, i) => {
                if (work.is_current) return null
                return (
                  <div key={work.id || i} className="mb-3 p-3 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="flex justify-end mb-2">
                      <button type="button" onClick={() => {
                        if (work.id) setDeletedWorkHistoryIds(prev => [...prev, work.id])
                        setWorkHistory(prev => prev.filter((_, j) => j !== i))
                      }} className="text-xs" style={{ color: '#EF4444' }}>Ukloni</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#64748B' }}>Poslodavac</p>
                        <input className={inputCls} style={inputStyle} value={work.poslodavac || ''}
                          onChange={e => setWorkHistory(prev => prev.map((w, j) => j === i ? { ...w, poslodavac: e.target.value } : w))} />
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#64748B' }}>Radno mjesto</p>
                        <input className={inputCls} style={inputStyle} value={work.radno_mjesto || ''}
                          onChange={e => setWorkHistory(prev => prev.map((w, j) => j === i ? { ...w, radno_mjesto: e.target.value } : w))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#64748B' }}>Od</p>
                        <input type="date" className={inputCls} style={inputStyle} value={work.datum_od || ''}
                          onChange={e => setWorkHistory(prev => prev.map((w, j) => j === i ? { ...w, datum_od: e.target.value } : w))} />
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#64748B' }}>Do</p>
                        <input type="date" className={inputCls} style={inputStyle} value={work.datum_do || ''}
                          onChange={e => setWorkHistory(prev => prev.map((w, j) => j === i ? { ...w, datum_do: e.target.value } : w))} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* Godišnji odmor & Bolovanje */}
        <Section icon="📅" title="Godišnji odmor & Bolovanje" desc="Evidencija odsutnosti radnika.">
          {/* Godišnji odmor */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: '#374151' }}>Godišnji odmor</p>
              <button type="button" onClick={() => setVacations(prev => [...prev, { datum_od: '', datum_do: '', napomena: '', _new: true }])}
                className="text-xs font-medium" style={{ color: '#2563EB' }}>+ Dodaj</button>
            </div>
            {vacations.length === 0 && (
              <p className="text-xs" style={{ color: '#94A3B8' }}>Nema unesenih godišnjih odmora.</p>
            )}
            {vacations.map((vac, i) => (
              <div key={vac.id || i} className="flex items-center gap-3 mb-2 p-3 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <span className="text-sm">🌴</span>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#64748B' }}>Od</p>
                    <input type="date" className={inputCls} style={inputStyle} value={vac.datum_od || ''}
                      onChange={e => setVacations(prev => prev.map((v, j) => j === i ? { ...v, datum_od: e.target.value } : v))} />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#64748B' }}>Do</p>
                    <input type="date" className={inputCls} style={inputStyle} value={vac.datum_do || ''}
                      onChange={e => setVacations(prev => prev.map((v, j) => j === i ? { ...v, datum_do: e.target.value } : v))} />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#64748B' }}>Napomena</p>
                    <input className={inputCls} style={inputStyle} placeholder="Opcionalno" value={vac.napomena || ''}
                      onChange={e => setVacations(prev => prev.map((v, j) => j === i ? { ...v, napomena: e.target.value } : v))} />
                  </div>
                </div>
                <button type="button" onClick={() => {
                  if (vac.id) setDeletedVacationIds(prev => [...prev, vac.id])
                  setVacations(prev => prev.filter((_, j) => j !== i))
                }} className="text-xs flex-shrink-0" style={{ color: '#EF4444' }}>Ukloni</button>
              </div>
            ))}
          </div>

          {/* Bolovanje */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: '#374151' }}>Bolovanje</p>
              <button type="button" onClick={() => setSickLeaves(prev => [...prev, { datum_od: '', datum_do: '', napomena: '', _new: true }])}
                className="text-xs font-medium" style={{ color: '#2563EB' }}>+ Dodaj</button>
            </div>
            {sickLeaves.length === 0 && (
              <p className="text-xs" style={{ color: '#94A3B8' }}>Nema unesenih bolovanja.</p>
            )}
            {sickLeaves.map((sick, i) => (
              <div key={sick.id || i} className="flex items-center gap-3 mb-2 p-3 rounded-lg" style={{ background: '#FEFCE8', border: '1px solid #FEF08A' }}>
                <span className="text-sm">🏥</span>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#64748B' }}>Od</p>
                    <input type="date" className={inputCls} style={inputStyle} value={sick.datum_od || ''}
                      onChange={e => setSickLeaves(prev => prev.map((s, j) => j === i ? { ...s, datum_od: e.target.value } : s))} />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#64748B' }}>Do</p>
                    <input type="date" className={inputCls} style={inputStyle} value={sick.datum_do || ''}
                      onChange={e => setSickLeaves(prev => prev.map((s, j) => j === i ? { ...s, datum_do: e.target.value } : s))} />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#64748B' }}>Napomena</p>
                    <input className={inputCls} style={inputStyle} placeholder="Opcionalno" value={sick.napomena || ''}
                      onChange={e => setSickLeaves(prev => prev.map((s, j) => j === i ? { ...s, napomena: e.target.value } : s))} />
                  </div>
                </div>
                <button type="button" onClick={() => {
                  if (sick.id) setDeletedSickIds(prev => [...prev, sick.id])
                  setSickLeaves(prev => prev.filter((_, j) => j !== i))
                }} className="text-xs flex-shrink-0" style={{ color: '#EF4444' }}>Ukloni</button>
              </div>
            ))}
          </div>
        </Section>

        <div className="flex justify-end gap-3 pb-8">
          <Link href="/zaposlenici" className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</Link>
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: saving ? '#93C5FD' : '#2563EB', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Spremanje...' : '✓ Spremi promjene'}
          </button>
        </div>
      </form>
    </div>
  )
}
