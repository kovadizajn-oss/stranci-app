'use client'

import { useState } from 'react'
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

type DocEntry = { tip: string; broj: string; datum_izdavanja: string; datum_isteka: string; file: File | null; file_url?: string }
type AttEntry = { tip: string; datum_izdavanja: string; datum_isteka: string; file: File | null; file_url?: string }

const emptyDoc = (): DocEntry => ({ tip: '', broj: '', datum_izdavanja: '', datum_isteka: '', file: null })
const emptyAtt = (): AttEntry => ({ tip: '', datum_izdavanja: '', datum_isteka: '', file: null })

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 rounded-lg border text-sm transition-all"
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }

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

export default function NoviZaposlenik() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [form, setForm] = useState({
    ime: '', prezime: '', datum_rodjenja: '', mjesto_rodjenja: '',
    drzava_rodjenja: '', drzava_drzavljanstva: '', adresa_prebivalista: '',
    email: '', telefon: '',
    adresa_boravista: '', datum_isteka_smjestaja: '', datum_ulaska_egp: '', mjesto_ulaska_egp: '',
    poslodavac: '', radno_mjesto: '',
  })
  const [documents, setDocuments] = useState<DocEntry[]>([emptyDoc()])
  const [attachments, setAttachments] = useState<AttEntry[]>([emptyAtt()])

  function setF(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function uploadFile(file: File, path: string): Promise<string | null> {
    const { data, error } = await supabase.storage.from('dokumenti').upload(path, file, { upsert: true })
    if (error) return null
    const { data: urlData } = supabase.storage.from('dokumenti').getPublicUrl(data.path)
    return urlData.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.ime || !form.prezime) { setError('Ime i prezime su obavezni.'); return }
    setSaving(true)
    setError('')

    try {
      // Insert employee
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .insert({
          ime: form.ime, prezime: form.prezime,
          datum_rodjenja: form.datum_rodjenja || null,
          mjesto_rodjenja: form.mjesto_rodjenja || null,
          drzava_rodjenja: form.drzava_rodjenja || null,
          drzava_drzavljanstva: form.drzava_drzavljanstva || null,
          adresa_prebivalista: form.adresa_prebivalista || null,
          email: form.email || null,
          telefon: form.telefon || null,
          datum_isteka_smjestaja: form.datum_isteka_smjestaja || null,
          datum_ulaska_egp: form.datum_ulaska_egp || null,
          mjesto_ulaska_egp: form.mjesto_ulaska_egp || null,
          poslodavac: form.poslodavac || null,
          radno_mjesto: form.radno_mjesto || null,
        })
        .select('id')
        .single()

      if (empErr) throw empErr
      const empId = emp.id

      // Save current address to addresses table
      if (form.adresa_boravista) {
        await supabase.from('addresses').insert({
          employee_id: empId,
          adresa: form.adresa_boravista,
          datum_od: new Date().toISOString().split('T')[0],
          is_current: true,
        })
      }

      // Save initial work history entry
      if (form.poslodavac) {
        await supabase.from('work_history').insert({
          employee_id: empId,
          poslodavac: form.poslodavac,
          radno_mjesto: form.radno_mjesto || null,
          datum_od: new Date().toISOString().split('T')[0],
          is_current: true,
        })
      }

      // Upload photo
      if (photo) {
        const photoUrl = await uploadFile(photo, `${empId}/photo_${Date.now()}_${photo.name}`)
        if (photoUrl) {
          await supabase.from('employees').update({ photo_url: photoUrl }).eq('id', empId)
        }
      }

      // Upload documents
      const validDocs = documents.filter(d => d.tip)
      for (const doc of validDocs) {
        let fileUrl: string | null = null
        if (doc.file) fileUrl = await uploadFile(doc.file, `${empId}/doc_${Date.now()}_${doc.file.name}`)
        await supabase.from('documents').insert({
          employee_id: empId,
          tip_dokumenta: doc.tip || null,
          broj_dokumenta: doc.broj || null,
          datum_izdavanja: doc.datum_izdavanja || null,
          datum_isteka: doc.datum_isteka || null,
          file_url: fileUrl,
        })
      }

      // Upload attachments
      const validAtts = attachments.filter(a => a.tip)
      for (const att of validAtts) {
        let fileUrl: string | null = null
        if (att.file) fileUrl = await uploadFile(att.file, `${empId}/att_${Date.now()}_${att.file.name}`)
        await supabase.from('attachments').insert({
          employee_id: empId,
          tip_dokumenta: att.tip || null,
          datum_izdavanja: att.datum_izdavanja || null,
          datum_isteka: att.datum_isteka || null,
          file_url: fileUrl,
        })
      }

      router.push('/zaposlenici')
    } catch (err: any) {
      setError(err.message || 'Greška pri spremanju. Pokušajte ponovo.')
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <Link href="/zaposlenici" className="text-sm" style={{ color: '#64748B' }}>← Zaposlenici</Link>
      </div>
      <h1 className="text-2xl font-semibold mb-1" style={{ color: '#1E293B' }}>Novi zaposlenik</h1>
      <p className="text-sm mb-6" style={{ color: '#64748B' }}>
        Unesite podatke o stranom radniku. Polja označena * su obavezna.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Osobni podaci */}
        <Section icon="👤" title="Osobni podaci stranca" desc="Osnovni identifikacijski podaci radnika.">
          {/* Photo */}
          <div className="flex items-center gap-4 mb-5">
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ border: '2px dashed #D1D5DB', background: '#F9FAFB', overflow: 'hidden' }}
            >
              {photoPreview
                ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                : <span style={{ fontSize: 28 }}>📷</span>
              }
            </div>
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#1E293B' }}>Fotografija radnika</p>
              <p className="text-xs mb-2" style={{ color: '#64748B' }}>JPG ili PNG, max 5 MB.</p>
              <label className="cursor-pointer text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: '#F1F5F9', color: '#374151' }}>
                ↑ Učitaj fotografiju
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ime" required>
              <input className={inputCls} style={inputStyle} value={form.ime} onChange={e => setF('ime', e.target.value)} placeholder="npr. Andrii" required />
            </Field>
            <Field label="Prezime" required>
              <input className={inputCls} style={inputStyle} value={form.prezime} onChange={e => setF('prezime', e.target.value)} placeholder="npr. Kovalenko" required />
            </Field>
            <Field label="Datum rođenja">
              <input type="date" className={inputCls} style={inputStyle} value={form.datum_rodjenja} onChange={e => setF('datum_rodjenja', e.target.value)} />
            </Field>
            <Field label="Mjesto rođenja">
              <input className={inputCls} style={inputStyle} value={form.mjesto_rodjenja} onChange={e => setF('mjesto_rodjenja', e.target.value)} placeholder="npr. Lavov" />
            </Field>
            <Field label="Država rođenja">
              <select className={inputCls} style={inputStyle} value={form.drzava_rodjenja} onChange={e => setF('drzava_rodjenja', e.target.value)}>
                <option value="">Odaberite državu...</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Država državljanstva" required>
              <select className={inputCls} style={inputStyle} value={form.drzava_drzavljanstva} onChange={e => setF('drzava_drzavljanstva', e.target.value)}>
                <option value="">Odaberite državu</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Adresa prebivališta">
                <input className={inputCls} style={inputStyle} value={form.adresa_prebivalista} onChange={e => setF('adresa_prebivalista', e.target.value)} placeholder="Ulica i broj, grad, država" />
              </Field>
            </div>
          </div>
        </Section>

        {/* Kontakt */}
        <Section icon="✉️" title="Kontakt podaci" desc="Kako kontaktirati radnika.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <input type="email" className={inputCls} style={inputStyle} value={form.email} onChange={e => setF('email', e.target.value)} placeholder="ime@email.com" />
            </Field>
            <Field label="Telefon (opcionalno)">
              <input className={inputCls} style={inputStyle} value={form.telefon} onChange={e => setF('telefon', e.target.value)} placeholder="+385 91 234 5678" />
            </Field>
          </div>
        </Section>

        {/* Osobni dokumenti */}
        <Section icon="🪪" title="Osobni dokumenti" desc="Podaci iz putovnice i dokumenta boravka.">
          {documents.map((doc, i) => (
            <div key={i} className="mb-5 pb-5" style={{ borderBottom: i < documents.length - 1 ? '1px dashed #E2E8F0' : 'none' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium" style={{ color: '#374151' }}>Dokument {i + 1}</p>
                {documents.length > 1 && (
                  <button type="button" onClick={() => setDocuments(prev => prev.filter((_, j) => j !== i))}
                    className="text-xs" style={{ color: '#EF4444' }}>Ukloni</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tip dokumenta">
                  <select className={inputCls} style={inputStyle} value={doc.tip}
                    onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, tip: e.target.value } : d))}>
                    <option value="">Odaberite dokument</option>
                    {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Broj dokumenta">
                  <input className={inputCls} style={inputStyle} value={doc.broj} placeholder="npr. AB123456"
                    onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, broj: e.target.value } : d))} />
                </Field>
                <Field label="Datum izdavanja">
                  <input type="date" className={inputCls} style={inputStyle} value={doc.datum_izdavanja}
                    onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, datum_izdavanja: e.target.value } : d))} />
                </Field>
                <Field label="Datum isteka">
                  <input type="date" className={inputCls} style={inputStyle} value={doc.datum_isteka}
                    onChange={e => setDocuments(prev => prev.map((d, j) => j === i ? { ...d, datum_isteka: e.target.value } : d))} />
                </Field>
                <div className="col-span-2">
                  <Field label="Preslika dokumenta">
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border text-sm"
                      style={{ borderColor: '#D1D5DB', background: 'white', color: '#374151' }}>
                      ↑ {doc.file ? doc.file.name : 'Učitaj (PDF, JPG, PNG do 10 MB)'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0] || null
                          setDocuments(prev => prev.map((d, j) => j === i ? { ...d, file } : d))
                        }} />
                    </label>
                  </Field>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setDocuments(prev => [...prev, emptyDoc()])}
            className="text-sm font-medium" style={{ color: '#2563EB' }}>
            + Dodaj dokument
          </button>
        </Section>

        {/* Prateći dokumenti */}
        <Section icon="📎" title="Prateći dokumenti" desc="Ugovori, potvrde i ostali prateći dokumenti.">
          {attachments.map((att, i) => (
            <div key={i} className="mb-5 pb-5" style={{ borderBottom: i < attachments.length - 1 ? '1px dashed #E2E8F0' : 'none' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium" style={{ color: '#374151' }}>Prilog {i + 1}</p>
                {attachments.length > 1 && (
                  <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    className="text-xs" style={{ color: '#EF4444' }}>Ukloni</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tip dokumenta">
                  <select className={inputCls} style={inputStyle} value={att.tip}
                    onChange={e => setAttachments(prev => prev.map((a, j) => j === i ? { ...a, tip: e.target.value } : a))}>
                    <option value="">Odaberite tip...</option>
                    {ATTACHMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <div />
                <Field label="Datum izdavanja">
                  <input type="date" className={inputCls} style={inputStyle} value={att.datum_izdavanja}
                    onChange={e => setAttachments(prev => prev.map((a, j) => j === i ? { ...a, datum_izdavanja: e.target.value } : a))} />
                </Field>
                <Field label="Datum isteka">
                  <input type="date" className={inputCls} style={inputStyle} value={att.datum_isteka}
                    onChange={e => setAttachments(prev => prev.map((a, j) => j === i ? { ...a, datum_isteka: e.target.value } : a))} />
                </Field>
                <div className="col-span-2">
                  <Field label="Preslika priloga">
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border text-sm"
                      style={{ borderColor: '#D1D5DB', background: 'white', color: '#374151' }}>
                      ↑ {att.file ? att.file.name : 'Učitaj (PDF, JPG, PNG do 10 MB)'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0] || null
                          setAttachments(prev => prev.map((a, j) => j === i ? { ...a, file } : a))
                        }} />
                    </label>
                  </Field>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setAttachments(prev => [...prev, emptyAtt()])}
            className="text-sm font-medium" style={{ color: '#2563EB' }}>
            + Dodaj prilog
          </button>
        </Section>

        {/* Boravak */}
        <Section icon="🏠" title="Boravak stranca" desc="Podaci o boravištu u Republici Hrvatskoj.">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Adresa boravišta">
                <input className={inputCls} style={inputStyle} value={form.adresa_boravista} onChange={e => setF('adresa_boravista', e.target.value)} placeholder="Ulica i broj, grad" />
              </Field>
            </div>
            <Field label="Datum isteka smještaja">
              <input type="date" className={inputCls} style={inputStyle} value={form.datum_isteka_smjestaja} onChange={e => setF('datum_isteka_smjestaja', e.target.value)} />
            </Field>
            <div />
            <Field label="Datum ulaska u EGP">
              <input type="date" className={inputCls} style={inputStyle} value={form.datum_ulaska_egp} onChange={e => setF('datum_ulaska_egp', e.target.value)} />
            </Field>
            <Field label="Mjesto ulaska u EGP">
              <input className={inputCls} style={inputStyle} value={form.mjesto_ulaska_egp} onChange={e => setF('mjesto_ulaska_egp', e.target.value)} placeholder="npr. Zagreb" />
            </Field>
          </div>
        </Section>

        {/* Rad */}
        <Section icon="💼" title="Rad stranca" desc="Zanimanje, poslodavac i dozvola za rad.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Poslodavac / firma">
              <input className={inputCls} style={inputStyle} value={form.poslodavac} onChange={e => setF('poslodavac', e.target.value)} placeholder="Naziv tvrtke" />
            </Field>
            <Field label="Radno mjesto">
              <input className={inputCls} style={inputStyle} value={form.radno_mjesto} onChange={e => setF('radno_mjesto', e.target.value)} placeholder="npr. Skladištar" />
            </Field>
          </div>
        </Section>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <p className="text-xs" style={{ color: '#94A3B8' }}>* obavezna polja</p>
          <div className="flex items-center gap-3">
            <Link href="/zaposlenici" className="px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: '#F1F5F9', color: '#374151' }}>
              Odustani
            </Link>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: saving ? '#93C5FD' : '#2563EB', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Spremanje...' : '✓ Spremi zaposlenika'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
