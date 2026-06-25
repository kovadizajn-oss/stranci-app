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

type DocState = { datum_isteka: string; file: File | null }

export default function NoviZaposlenik() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ ime: '', prezime: '', drzava_rodjenja: '' })
  const [radnaDozvola, setRD] = useState<DocState>({ datum_isteka: '', file: null })
  const [lijecnicki, setLJ] = useState<DocState>({ datum_isteka: '', file: null })
  const [poslodavac, setPoslodavac] = useState('')
  const [radnoMjesto, setRadnoMjesto] = useState('')

  function setF(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })) }

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
        .insert({ ime: form.ime, prezime: form.prezime, drzava_rodjenja: form.drzava_rodjenja || null, poslodavac: poslodavac || null, radno_mjesto: radnoMjesto || null })
        .select('id').single()
      if (empErr) throw empErr
      const empId = emp.id

      if (radnaDozvola.datum_isteka || radnaDozvola.file) {
        let fileUrl = null
        if (radnaDozvola.file) fileUrl = await uploadFile(radnaDozvola.file, `${empId}/doc_${Date.now()}_${radnaDozvola.file.name}`)
        await supabase.from('documents').insert({ employee_id: empId, tip_dokumenta: 'radna_dozvola', datum_isteka: radnaDozvola.datum_isteka || null, file_url: fileUrl })
      }

      if (lijecnicki.datum_isteka || lijecnicki.file) {
        let fileUrl = null
        if (lijecnicki.file) fileUrl = await uploadFile(lijecnicki.file, `${empId}/doc_${Date.now()}_${lijecnicki.file.name}`)
        await supabase.from('documents').insert({ employee_id: empId, tip_dokumenta: 'lijecnicki', datum_isteka: lijecnicki.datum_isteka || null, file_url: fileUrl })
      }

      router.push('/zaposlenici')
    } catch (err: any) {
      setError(err.message || 'Greška pri spremanju.')
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/zaposlenici" className="text-sm" style={{ color: '#64748B' }}>← Zaposlenici</Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1" style={{ color: '#1E293B' }}>Novi zaposlenik</h1>
      <p className="text-sm mb-6" style={{ color: '#64748B' }}>Polja označena * su obavezna.</p>

      {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <Section icon="👤" title="Osobni podaci" desc="Osnovni podaci radnika.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ime" required><input className={inputCls} style={inputStyle} value={form.ime} onChange={e => setF('ime', e.target.value)} required /></Field>
            <Field label="Prezime" required><input className={inputCls} style={inputStyle} value={form.prezime} onChange={e => setF('prezime', e.target.value)} required /></Field>
            <div className="col-span-2">
              <Field label="Država rođenja">
                <select className={inputCls} style={inputStyle} value={form.drzava_rodjenja} onChange={e => setF('drzava_rodjenja', e.target.value)}>
                  <option value="">Odaberite državu...</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </Section>

        <Section icon="📋" title="Radna dozvola" desc="Datum isteka radne dozvole radnika.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Datum isteka"><input type="date" className={inputCls} style={inputStyle} value={radnaDozvola.datum_isteka} onChange={e => setRD(p => ({ ...p, datum_isteka: e.target.value }))} /></Field>
            <div />
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Preslika <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcionalno)</span></label>
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border text-sm" style={{ borderColor: '#D1D5DB', background: 'white', color: '#374151' }}>
                ↑ {radnaDozvola.file ? radnaDozvola.file.name : 'Učitaj (PDF, JPG, PNG)'}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setRD(p => ({ ...p, file: e.target.files?.[0] || null }))} />
              </label>
            </div>
          </div>
        </Section>

        <Section icon="🏥" title="Liječnički pregled" desc="Datum isteka liječničkog pregleda radnika.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Datum isteka"><input type="date" className={inputCls} style={inputStyle} value={lijecnicki.datum_isteka} onChange={e => setLJ(p => ({ ...p, datum_isteka: e.target.value }))} /></Field>
            <div />
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Preslika <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcionalno)</span></label>
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border text-sm" style={{ borderColor: '#D1D5DB', background: 'white', color: '#374151' }}>
                ↑ {lijecnicki.file ? lijecnicki.file.name : 'Učitaj (PDF, JPG, PNG)'}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setLJ(p => ({ ...p, file: e.target.files?.[0] || null }))} />
              </label>
            </div>
          </div>
        </Section>

        <Section icon="💼" title="Rad stranca" desc="Poslodavac i radno mjesto.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Poslodavac / firma"><input className={inputCls} style={inputStyle} value={poslodavac} onChange={e => setPoslodavac(e.target.value)} /></Field>
            <Field label="Radno mjesto"><input className={inputCls} style={inputStyle} value={radnoMjesto} onChange={e => setRadnoMjesto(e.target.value)} /></Field>
          </div>
        </Section>

        <div className="flex items-center justify-between pt-2 pb-8">
          <p className="text-xs" style={{ color: '#94A3B8' }}>* obavezna polja</p>
          <div className="flex gap-3">
            <Link href="/zaposlenici" className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: '#F1F5F9', color: '#374151' }}>Odustani</Link>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: saving ? '#93C5FD' : '#2563EB', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Spremanje...' : '✓ Spremi zaposlenika'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
