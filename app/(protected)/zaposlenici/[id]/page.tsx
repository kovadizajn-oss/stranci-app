'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const COUNTRIES = [
  'Albanija','Austrija','Belgija','Bosna i Hercegovina','Bugarska','Češka','Crna Gora',
  'Danska','Estonija','Finska','Francuska','Grčka','Hrvatska','Irska','Italija','Kosovo',
  'Latvija','Litva','Mađarska','Makedonija','Moldova','Njemačka','Nizozemska','Norveška',
  'Poljska','Portugal','Rumunjska','Rusija','Slovačka','Slovenija','Srbija','Španjolska',
  'Švedska','Švicarska','Turska','Ukrajina','Ujedinjeno Kraljevstvo',
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
    adresa_boravista: '', datum_ulaska_egp: '', mjesto_ulaska_egp: '',
    poslodavac: '', radno_mjesto: '', photo_url: '',
  })
  const [documents, setDocuments] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])

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
        adresa_boravista: emp.adresa_boravista || '', datum_ulaska_egp: emp.datum_ulaska_egp || '',
        mjesto_ulaska_egp: emp.mjesto_ulaska_egp || '',
        poslodavac: emp.poslodavac || '', radno_mjesto: emp.radno_mjesto || '',
        photo_url: emp.photo_url || '',
      })
      const { data: docs } = await supabase.from('documents').select('*').eq('employee_id', id)
      const { data: atts } = await supabase.from('attachments').select('*').eq('employee_id', id)
      setDocuments(docs || [{ tip_dokumenta: '', broj_dokumenta: '', datum_izdavanja: '', datum_isteka: '', file_url: '', _new: true }])
      setAttachments(atts || [{ tip_dokumenta: '', datum_izdavanja: '', datum_isteka: '', file_url: '', _new: true }])
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
      await supabase.from('employees').update({
        ime: form.ime, prezime: form.prezime,
        datum_rodjenja: form.datum_rodjenja || null,
        mjesto_rodjenja: form.mjesto_rodjenja || null,
        drzava_rodjenja: form.drzava_rodjenja || null,
        drzava_drzavljanstva: form.drzava_drzavljanstva || null,
        adresa_prebivalista: form.adresa_prebivalista || null,
        email: form.email || null,
        telefon: form.telefon || null,
        adresa_boravista: form.adresa_boravista || null,
        datum_ulaska_egp: form.datum_ulaska_egp || null,
        mjesto_ulaska_egp: form.mjesto_ulaska_egp || null,
        poslodavac: form.poslodavac || null,
        radno_mjesto: form.radno_mjesto || null,
      }).eq('id', id)

      // Upsert documents
      for (const doc of documents) {
        if (!doc.tip_dokumenta) continue
        if (doc._new || !doc.id) {
          await supabase.from('documents').insert({
            employee_id: id,
            tip_dokumenta: doc.tip_dokumenta,
            broj_dokumenta: doc.broj_dokumenta || null,
            datum_izdavanja: doc.datum_izdavanja || null,
            datum_isteka: doc.datum_isteka || null,
          })
        } else {
          await supabase.from('documents').update({
            tip_dokumenta: doc.tip_dokumenta,
            broj_dokumenta: doc.broj_dokumenta || null,
            datum_izdavanja: doc.datum_izdavanja || null,
            datum_isteka: doc.datum_isteka || null,
          }).eq('id', doc.id)
        }
      }

      // Upsert attachments
      for (const att of attachments) {
        if (!att.tip_dokumenta) continue
        if (att._new || !att.id) {
          await supabase.from('attachments').insert({
            employee_id: id,
            tip_dokumenta: att.tip_dokumenta,
            datum_izdavanja: att.datum_izdavanja || null,
            datum_isteka: att.datum_isteka || null,
          })
        } else {
          await supabase.from('attachments').update({
            tip_dokumenta: att.tip_dokumenta,
            datum_izdavanja: att.datum_izdavanja || null,
            datum_isteka: att.datum_isteka || null,
          }).eq('id', att.id)
        }
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Greška pri spremanju.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
  }

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
          <p className="text-sm" style={{ color: '#64748B' }}>{form.drzava_drzavljanstva || 'Nepoznata država'} · {form.poslodavac || 'Bez poslodavca'}</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</div>}
      {success && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#F0FDF4', color: '#16A34A' }}>Podaci uspješno spremljeni.</div>}

      <form onSubmit={handleSave}>
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
            <div className="col-span-2"><Field label="Adresa prebivališta"><input className={inputCls} style={inputStyle} value={form.adresa_prebivalista} onChange={e => setF('adresa_prebivalista', e.target.value)} /></Field></div>
          </div>
        </Section>

        <Section icon="✉️" title="Kontakt podaci" desc="Kako kontaktirati radnika.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email"><input type="email" className={inputCls} style={inputStyle} value={form.email} onChange={e => setF('email', e.target.value)} /></Field>
            <Field label="Telefon"><input className={inputCls} style={inputStyle} value={form.telefon} onChange={e => setF('telefon', e.target.value)} /></Field>
          </div>
        </Section>

        <Section icon="🪪" title="Osobni dokumenti" desc="Podaci iz putovnice i dokumenta boravka.">
          {documents.map((doc, i) => (
            <div key={doc.id || i} className="mb-4 pb-4" style={{ borderBottom: i < documents.length - 1 ? '1px dashed #E2E8F0' : 'none' }}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-medium" style={{ color: '#374151' }}>Dokument {i + 1}</p>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    Pogledaj datoteku ↗
                  </a>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tip dokumenta">
                  <select className={inputCls} style={inputStyle} value={doc.tip_dokumenta || ''}
                    onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, tip_dokumenta: e.target.value } : d))}>
                    <option value="">Odaberite...</option>
                    {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Broj dokumenta">
                  <input className={inputCls} style={inputStyle} value={doc.broj_dokumenta || ''}
                    onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, broj_dokumenta: e.target.value } : d))} />
                </Field>
                <Field label="Datum izdavanja">
                  <input type="date" className={inputCls} style={inputStyle} value={doc.datum_izdavanja || ''}
                    onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, datum_izdavanja: e.target.value } : d))} />
                </Field>
                <Field label="Datum isteka">
                  <input type="date" className={inputCls} style={inputStyle} value={doc.datum_isteka || ''}
                    onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, datum_isteka: e.target.value } : d))} />
                </Field>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setDocuments(prev => [...prev, { tip_dokumenta: '', broj_dokumenta: '', datum_izdavanja: '', datum_isteka: '', _new: true }])}
            className="text-sm font-medium" style={{ color: '#2563EB' }}>+ Dodaj dokument</button>
        </Section>

        <Section icon="📎" title="Prateći dokumenti" desc="Ugovori, potvrde i ostali prateći dokumenti.">
          {attachments.map((att, i) => (
            <div key={att.id || i} className="mb-4 pb-4" style={{ borderBottom: i < attachments.length - 1 ? '1px dashed #E2E8F0' : 'none' }}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-medium" style={{ color: '#374151' }}>Prilog {i + 1}</p>
                {att.file_url && (
                  <a href={att.file_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    Pogledaj datoteku ↗
                  </a>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tip dokumenta">
                  <select className={inputCls} style={inputStyle} value={att.tip_dokumenta || ''}
                    onChange={e => setAttachments(prev => prev.map((a, j) => j === i ? { ...a, tip_dokumenta: e.target.value } : a))}>
                    <option value="">Odaberite...</option>
                    {ATTACHMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <div />
                <Field label="Datum izdavanja">
                  <input type="date" className={inputCls} style={inputStyle} value={att.datum_izdavanja || ''}
                    onChange={e => setAttachments(prev => prev.map((a, j) => j === i ? { ...a, datum_izdavanja: e.target.value } : a))} />
                </Field>
                <Field label="Datum isteka">
                  <input type="date" className={inputCls} style={inputStyle} value={att.datum_isteka || ''}
                    onChange={e => setAttachments(prev => prev.map((a, j) => j === i ? { ...a, datum_isteka: e.target.value } : a))} />
                </Field>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setAttachments(prev => [...prev, { tip_dokumenta: '', datum_izdavanja: '', datum_isteka: '', _new: true }])}
            className="text-sm font-medium" style={{ color: '#2563EB' }}>+ Dodaj prilog</button>
        </Section>

        <Section icon="🏠" title="Boravak stranca" desc="Podaci o boravištu u Republici Hrvatskoj.">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label="Adresa boravišta"><input className={inputCls} style={inputStyle} value={form.adresa_boravista} onChange={e => setF('adresa_boravista', e.target.value)} /></Field></div>
            <Field label="Datum ulaska u EGP"><input type="date" className={inputCls} style={inputStyle} value={form.datum_ulaska_egp} onChange={e => setF('datum_ulaska_egp', e.target.value)} /></Field>
            <Field label="Mjesto ulaska u EGP"><input className={inputCls} style={inputStyle} value={form.mjesto_ulaska_egp} onChange={e => setF('mjesto_ulaska_egp', e.target.value)} /></Field>
          </div>
        </Section>

        <Section icon="💼" title="Rad stranca" desc="Zanimanje, poslodavac i dozvola za rad.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Poslodavac / firma"><input className={inputCls} style={inputStyle} value={form.poslodavac} onChange={e => setF('poslodavac', e.target.value)} /></Field>
            <Field label="Radno mjesto"><input className={inputCls} style={inputStyle} value={form.radno_mjesto} onChange={e => setF('radno_mjesto', e.target.value)} /></Field>
          </div>
        </Section>

        <div className="flex justify-end gap-3 pb-8">
          <Link href="/zaposlenici" className="px-4 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</Link>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: saving ? '#93C5FD' : '#2563EB', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Spremanje...' : '✓ Spremi promjene'}
          </button>
        </div>
      </form>
    </div>
  )
}
