'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import StatusPicker from '@/components/StatusPicker'

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

const OSOBNI_TYPES = ['Osobna iskaznica', 'Putovnica', 'Vozačka dozvola', 'Boravišna dozvola']
const PRATECI_TYPES = ['Radna dozvola', 'Liječnički pregled', 'Ugovor o radu', 'Potvrda o boravku']
const STATUSI = ['Aktivan', 'U postupku', 'Na čekanju', 'Otkazan']

const inputCls = "w-full px-3 py-2.5 rounded-lg border text-sm"
const inputStyle = { borderColor: '#D1D5DB', color: '#1E293B', background: 'white' }

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

type NewDoc = {
  naziv: string
  kategorija: 'osobni' | 'prateci'
  datum_izdavanja: string
  datum_isteka: string
  file: File | null
  _isCustom: boolean
}

function emptyDoc(kategorija: 'osobni' | 'prateci'): NewDoc {
  return { naziv: '', kategorija, datum_izdavanja: '', datum_isteka: '', file: null, _isCustom: false }
}

function NewDocCard({ doc, index, types, onChange, onRemove }: {
  doc: NewDoc; index: number; types: string[]
  onChange: (index: number, updated: NewDoc) => void
  onRemove: (index: number) => void
}) {
  function update(patch: Partial<NewDoc>) { onChange(index, { ...doc, ...patch }) }

  return (
    <div className="mb-4 p-4 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      <div className="flex items-start gap-2 mb-3">
        <div className="flex-1 flex flex-col gap-2">
          <select className={inputCls} style={inputStyle}
            value={doc._isCustom ? '__ostalo__' : doc.naziv}
            onChange={e => {
              if (e.target.value === '__ostalo__') update({ _isCustom: true, naziv: '' })
              else update({ _isCustom: false, naziv: e.target.value })
            }}>
            <option value="">Odaberi vrstu dokumenta...</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
            <option value="__ostalo__">Ostalo (upiši naziv)...</option>
          </select>
          {doc._isCustom && (
            <input className={inputCls} style={inputStyle} placeholder="Naziv dokumenta"
              value={doc.naziv} onChange={e => update({ naziv: e.target.value })} />
          )}
        </div>
        <button type="button" onClick={() => onRemove(index)}
          className="btn-danger text-xs px-2.5 py-1.5 rounded-lg flex-shrink-0 mt-0.5"
          style={{ background: '#FEF2F2', color: '#EF4444' }}>Ukloni</button>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Datum izdavanja">
          <input type="date" className={inputCls} style={inputStyle} value={doc.datum_izdavanja}
            onChange={e => update({ datum_izdavanja: e.target.value })} />
        </Field>
        <Field label="Datum isteka">
          <input type="date" className={inputCls} style={inputStyle} value={doc.datum_isteka}
            onChange={e => update({ datum_isteka: e.target.value })} />
        </Field>
      </div>
      <div>
        <p className="text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
          Preslika dokumenta <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcionalno)</span>
        </p>
        <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border text-sm"
          style={{ borderColor: doc.file ? '#BBF7D0' : '#D1D5DB', background: doc.file ? '#F0FDF4' : 'white', color: doc.file ? '#16A34A' : '#374151' }}>
          {doc.file ? `✓ ${doc.file.name}` : '↑ Učitaj (PDF, JPG, PNG do 10 MB)'}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
            onChange={e => update({ file: e.target.files?.[0] || null })} />
        </label>
      </div>
    </div>
  )
}

export default function NoviZaposlenik() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [companies, setCompanies] = useState<{ id: string; naziv: string }[]>([])
  const [companyId, setCompanyId] = useState<string>('') // '' = manual, uuid = linked
  const [poslodavacManual, setPoslodavacManual] = useState('')

  useEffect(() => {
    supabase.from('companies').select('id, naziv').order('naziv').then(({ data }) => setCompanies(data || []))
  }, [])

  const [form, setForm] = useState({
    ime: '', prezime: '', drzava_rodjenja: '',
    datum_rodjenja: '', oib: '', status_zaposlenika: 'Aktivan',
  })
  const [extra, setExtra] = useState({
    email: '', telefon: '', adresa_smjestaja: '', ime_oca: '', iban: '',
  })
  const [radnoMjesto, setRadnoMjesto] = useState('')
  const [osobniDocs, setOsobniDocs] = useState<NewDoc[]>([])
  const [prateciDocs, setPrateciDocs] = useState<NewDoc[]>([])

  function setF(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })) }
  function setE(key: string, value: string) { setExtra(prev => ({ ...prev, [key]: value })) }

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
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .insert({
          ime: form.ime, prezime: form.prezime,
          drzava_rodjenja: form.drzava_rodjenja || null,
          datum_rodjenja: form.datum_rodjenja || null,
          oib: form.oib || null,
          status_zaposlenika: form.status_zaposlenika,
          email: extra.email || null,
          telefon: extra.telefon || null,
          adresa_smjestaja: extra.adresa_smjestaja || null,
          ime_oca: extra.ime_oca || null,
          iban: extra.iban || null,
          company_id: companyId || null,
          poslodavac: companyId
            ? (companies.find(c => c.id === companyId)?.naziv || null)
            : (poslodavacManual || null),
          radno_mjesto: radnoMjesto || null,
        })
        .select('id').single()
      if (empErr) throw empErr
      const empId = emp.id

      for (const doc of [...osobniDocs, ...prateciDocs]) {
        if (!doc.naziv && !doc.file && !doc.datum_isteka && !doc.datum_izdavanja) continue
        let fileUrl = null
        if (doc.file) fileUrl = await uploadFile(doc.file, `${empId}/doc_${Date.now()}_${doc.file.name}`)
        await supabase.from('documents').insert({
          employee_id: empId,
          naziv: doc.naziv || null,
          kategorija: doc.kategorija,
          datum_izdavanja: doc.datum_izdavanja || null,
          datum_isteka: doc.datum_isteka || null,
          file_url: fileUrl,
        })
      }

      router.push('/zaposlenici')
    } catch (err: any) {
      setError(err.message || 'Greška pri spremanju.')
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <Link href="/zaposlenici" className="text-sm" style={{ color: '#64748B' }}>← Zaposlenici</Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1" style={{ color: '#1E293B' }}>Novi zaposlenik</h1>
      <p className="text-sm mb-6" style={{ color: '#64748B' }}>Polja označena * su obavezna.</p>

      {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <Section icon="👤" title="Osobni podaci" desc="Osnovni podaci radnika.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Ime" required><input className={inputCls} style={inputStyle} value={form.ime} onChange={e => setF('ime', e.target.value)} required /></Field>
            <Field label="Prezime" required><input className={inputCls} style={inputStyle} value={form.prezime} onChange={e => setF('prezime', e.target.value)} required /></Field>
            <Field label="Datum rođenja"><input type="date" className={inputCls} style={inputStyle} value={form.datum_rodjenja} onChange={e => setF('datum_rodjenja', e.target.value)} /></Field>
            <Field label="OIB"><input className={inputCls} style={inputStyle} value={form.oib} onChange={e => setF('oib', e.target.value)} maxLength={11} placeholder="11 znamenki" /></Field>
            <div className="col-span-1 md:col-span-2">
              <Field label="Država rođenja">
                <select className={inputCls} style={inputStyle} value={form.drzava_rodjenja} onChange={e => setF('drzava_rodjenja', e.target.value)}>
                  <option value="">Odaberite državu...</option>
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

        <Section icon="ℹ️" title="Dodatne informacije" desc="Kontakt, smještaj i ostali podaci (opcionalno).">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Email"><input type="email" className={inputCls} style={inputStyle} value={extra.email} onChange={e => setE('email', e.target.value)} placeholder="email@primjer.com" /></Field>
            <Field label="Telefon"><input className={inputCls} style={inputStyle} value={extra.telefon} onChange={e => setE('telefon', e.target.value)} placeholder="+385..." /></Field>
            <Field label="Ime oca"><input className={inputCls} style={inputStyle} value={extra.ime_oca} onChange={e => setE('ime_oca', e.target.value)} /></Field>
            <Field label="IBAN"><input className={inputCls} style={inputStyle} value={extra.iban} onChange={e => setE('iban', e.target.value)} placeholder="HR..." /></Field>
            <div className="col-span-1 md:col-span-2">
              <Field label="Adresa smještaja (HR)"><input className={inputCls} style={inputStyle} value={extra.adresa_smjestaja} onChange={e => setE('adresa_smjestaja', e.target.value)} placeholder="Ulica i broj, Grad" /></Field>
            </div>
          </div>
        </Section>

        <Section icon="🪪" title="Osobni dokumenti" desc="Identifikacijski i osobni dokumenti radnika.">
          {osobniDocs.map((doc, i) => (
            <NewDocCard key={`osobni-${i}`} doc={doc} index={i} types={OSOBNI_TYPES}
              onChange={(idx, updated) => setOsobniDocs(prev => prev.map((d, j) => j === idx ? updated : d))}
              onRemove={idx => setOsobniDocs(prev => prev.filter((_, j) => j !== idx))} />
          ))}
          {osobniDocs.length === 0 && <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>Nema dodanih osobnih dokumenata.</p>}
          <button type="button" onClick={() => setOsobniDocs(prev => [...prev, emptyDoc('osobni')])}
            className="btn-link text-sm font-medium" style={{ color: '#2563EB' }}>+ Dodaj osobni dokument</button>
        </Section>

        <Section icon="📋" title="Prateći dokumenti" desc="Radna dozvola, liječnički pregled i ostali prateći dokumenti.">
          {prateciDocs.map((doc, i) => (
            <NewDocCard key={`prateci-${i}`} doc={doc} index={i} types={PRATECI_TYPES}
              onChange={(idx, updated) => setPrateciDocs(prev => prev.map((d, j) => j === idx ? updated : d))}
              onRemove={idx => setPrateciDocs(prev => prev.filter((_, j) => j !== idx))} />
          ))}
          {prateciDocs.length === 0 && <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>Nema dodanih prateći dokumenata.</p>}
          <button type="button" onClick={() => setPrateciDocs(prev => [...prev, emptyDoc('prateci')])}
            className="btn-link text-sm font-medium" style={{ color: '#2563EB' }}>+ Dodaj prateći dokument</button>
        </Section>

        <Section icon="💼" title="Rad stranca" desc="Poslodavac i radno mjesto.">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <Field label="Poslodavac / firma">
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
            <Field label="Radno mjesto"><input className={inputCls} style={inputStyle} value={radnoMjesto} onChange={e => setRadnoMjesto(e.target.value)} /></Field>
          </div>
        </Section>

        <div className="flex items-center justify-between pt-2 pb-8">
          <p className="text-xs" style={{ color: '#94A3B8' }}>* obavezna polja</p>
          <div className="flex gap-3">
            <Link href="/zaposlenici" className="btn-secondary px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</Link>
            <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: saving ? '#93C5FD' : '#2563EB', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Spremanje...' : '✓ Spremi zaposlenika'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
