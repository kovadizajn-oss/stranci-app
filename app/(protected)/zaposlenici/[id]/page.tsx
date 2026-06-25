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
    return parts[parts.length - 1].replace(/^(doc|att|photo)_\d+_/, '')
  } catch { return 'Datoteka' }
}

type DocState = { id?: string; datum_isteka: string; file_url: string; _newFile?: File | null }

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({ ime: '', prezime: '', drzava_rodjenja: '', poslodavac: '', radno_mjesto: '' })
  const [radnaDozvola, setRD] = useState<DocState>({ datum_isteka: '', file_url: '' })
  const [lijecnicki, setLJ] = useState<DocState>({ datum_isteka: '', file_url: '' })

  const [vacations, setVacations] = useState<any[]>([])
  const [sickLeaves, setSickLeaves] = useState<any[]>([])
  const [deletedVacationIds, setDeletedVacationIds] = useState<string[]>([])
  const [deletedSickIds, setDeletedSickIds] = useState<string[]>([])

  function setF(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })) }

  useEffect(() => {
    async function load() {
      const { data: emp } = await supabase.from('employees').select('*').eq('id', id).single()
      if (!emp) { router.push('/zaposlenici'); return }

      setForm({ ime: emp.ime || '', prezime: emp.prezime || '', drzava_rodjenja: emp.drzava_rodjenja || '', poslodavac: emp.poslodavac || '', radno_mjesto: emp.radno_mjesto || '' })

      const [{ data: docs }, { data: vacs }, { data: sick }] = await Promise.all([
        supabase.from('documents').select('*').eq('employee_id', id),
        supabase.from('vacations').select('*').eq('employee_id', id).order('datum_od', { ascending: false }),
        supabase.from('sick_leaves').select('*').eq('employee_id', id).order('datum_od', { ascending: false }),
      ])

      const rdDoc = docs?.find((d: any) => d.tip_dokumenta === 'radna_dozvola')
      const ljDoc = docs?.find((d: any) => d.tip_dokumenta === 'lijecnicki')
      setRD({ id: rdDoc?.id, datum_isteka: rdDoc?.datum_isteka || '', file_url: rdDoc?.file_url || '' })
      setLJ({ id: ljDoc?.id, datum_isteka: ljDoc?.datum_isteka || '', file_url: ljDoc?.file_url || '' })

      setVacations(vacs || [])
      setSickLeaves(sick || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function saveDoc(doc: DocState, tip: string) {
    let fileUrl = doc.file_url || null
    if (doc._newFile) {
      const { data: uploaded } = await supabase.storage.from('dokumenti').upload(`${id}/doc_${Date.now()}_${doc._newFile.name}`, doc._newFile, { upsert: true })
      if (uploaded) {
        const { data: urlData } = supabase.storage.from('dokumenti').getPublicUrl(uploaded.path)
        fileUrl = urlData.publicUrl
      }
    }
    const payload = { employee_id: id, tip_dokumenta: tip, datum_isteka: doc.datum_isteka || null, file_url: fileUrl }
    if (doc.id) {
      await supabase.from('documents').update(payload).eq('id', doc.id)
    } else if (doc.datum_isteka || doc._newFile) {
      const { data: inserted } = await supabase.from('documents').insert(payload).select('id').single()
      if (tip === 'radna_dozvola' && inserted) setRD(p => ({ ...p, id: inserted.id }))
      if (tip === 'lijecnicki' && inserted) setLJ(p => ({ ...p, id: inserted.id }))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      await supabase.from('employees').update({
        ime: form.ime, prezime: form.prezime,
        drzava_rodjenja: form.drzava_rodjenja || null,
        poslodavac: form.poslodavac || null,
        radno_mjesto: form.radno_mjesto || null,
      }).eq('id', id)

      await saveDoc(radnaDozvola, 'radna_dozvola')
      await saveDoc(lijecnicki, 'lijecnicki')

      // Vacations
      for (const vacId of deletedVacationIds) await supabase.from('vacations').delete().eq('id', vacId)
      for (const vac of vacations) {
        if (!vac.datum_od || !vac.datum_do) continue
        if (vac._new || !vac.id) {
          await supabase.from('vacations').insert({ employee_id: id, datum_od: vac.datum_od, datum_do: vac.datum_do, napomena: vac.napomena || null })
        } else {
          await supabase.from('vacations').update({ datum_od: vac.datum_od, datum_do: vac.datum_do, napomena: vac.napomena || null }).eq('id', vac.id)
        }
      }

      // Sick leaves
      for (const sickId of deletedSickIds) await supabase.from('sick_leaves').delete().eq('id', sickId)
      for (const sick of sickLeaves) {
        if (!sick.datum_od || !sick.datum_do) continue
        if (sick._new || !sick.id) {
          await supabase.from('sick_leaves').insert({ employee_id: id, datum_od: sick.datum_od, datum_do: sick.datum_do, napomena: sick.napomena || null })
        } else {
          await supabase.from('sick_leaves').update({ datum_od: sick.datum_od, datum_do: sick.datum_do, napomena: sick.napomena || null }).eq('id', sick.id)
        }
      }

      setDeletedVacationIds([])
      setDeletedSickIds([])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Greška pri spremanju.')
    } finally {
      setSaving(false)
    }
  }

  function DocSection({ label, icon, doc, setDoc }: { label: string; icon: string; doc: DocState; setDoc: (fn: (p: DocState) => DocState) => void }) {
    return (
      <Section icon={icon} title={label} desc={`Datum isteka dokumenta: ${label.toLowerCase()}.`}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Datum isteka"><input type="date" className={inputCls} style={inputStyle} value={doc.datum_isteka} onChange={e => setDoc(p => ({ ...p, datum_isteka: e.target.value }))} /></Field>
          <div />
          <div className="col-span-2">
            <p className="text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Preslika <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcionalno)</span></p>
            {doc._newFile ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <span className="text-xs" style={{ color: '#16A34A' }}>✓ {doc._newFile.name}</span>
                <button type="button" onClick={() => setDoc(p => ({ ...p, _newFile: null }))} className="text-xs ml-auto" style={{ color: '#94A3B8' }}>✕</button>
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
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setDoc(p => ({ ...p, _newFile: e.target.files?.[0] || null }))} />
                </label>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border text-sm" style={{ borderColor: '#D1D5DB', background: 'white', color: '#374151' }}>
                ↑ Učitaj (PDF, JPG, PNG do 10 MB)
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setDoc(p => ({ ...p, _newFile: e.target.files?.[0] || null }))} />
              </label>
            )}
          </div>
        </div>
      </Section>
    )
  }

  if (loading) return <div className="p-8 text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <Link href="/zaposlenici" className="text-sm" style={{ color: '#64748B' }}>← Zaposlenici</Link>
      <div className="flex items-center gap-4 mt-2 mb-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{ background: '#EFF6FF', color: '#2563EB' }}>
          {form.ime[0]}{form.prezime[0]}
        </div>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#1E293B' }}>{form.ime} {form.prezime}</h1>
          <p className="text-sm" style={{ color: '#64748B' }}>{form.drzava_rodjenja || 'Nepoznata država'} · {form.poslodavac || 'Bez poslodavca'}</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</div>}
      {success && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#F0FDF4', color: '#16A34A' }}>Podaci uspješno spremljeni.</div>}

      <form onSubmit={handleSave}>
        <Section icon="👤" title="Osobni podaci" desc="Osnovni podaci radnika.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ime"><input className={inputCls} style={inputStyle} value={form.ime} onChange={e => setF('ime', e.target.value)} required /></Field>
            <Field label="Prezime"><input className={inputCls} style={inputStyle} value={form.prezime} onChange={e => setF('prezime', e.target.value)} required /></Field>
            <div className="col-span-2">
              <Field label="Država rođenja">
                <select className={inputCls} style={inputStyle} value={form.drzava_rodjenja} onChange={e => setF('drzava_rodjenja', e.target.value)}>
                  <option value="">Odaberite...</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </Section>

        <DocSection label="Radna dozvola" icon="📋" doc={radnaDozvola} setDoc={setRD} />
        <DocSection label="Liječnički pregled" icon="🏥" doc={lijecnicki} setDoc={setLJ} />

        {/* Rad stranca */}
        <Section icon="💼" title="Rad stranca" desc="Poslodavac i radno mjesto.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Poslodavac / firma"><input className={inputCls} style={inputStyle} value={form.poslodavac} onChange={e => setF('poslodavac', e.target.value)} /></Field>
            <Field label="Radno mjesto"><input className={inputCls} style={inputStyle} value={form.radno_mjesto} onChange={e => setF('radno_mjesto', e.target.value)} /></Field>
          </div>
        </Section>

        {/* Godišnji odmor & Bolovanje */}
        <Section icon="📅" title="Godišnji odmor & Bolovanje" desc="Evidencija odsutnosti radnika.">
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: '#374151' }}>Godišnji odmor</p>
              <button type="button" onClick={() => setVacations(prev => [...prev, { datum_od: '', datum_do: '', napomena: '', _new: true }])}
                className="text-xs font-medium" style={{ color: '#2563EB' }}>+ Dodaj</button>
            </div>
            {vacations.length === 0 && <p className="text-xs" style={{ color: '#94A3B8' }}>Nema unesenih godišnjih odmora.</p>}
            {vacations.map((vac, i) => (
              <div key={vac.id || i} className="flex items-center gap-3 mb-2 p-3 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <span className="text-sm">🌴</span>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div><p className="text-xs mb-1" style={{ color: '#64748B' }}>Od</p>
                    <input type="date" className={inputCls} style={inputStyle} value={vac.datum_od || ''} onChange={e => setVacations(prev => prev.map((v, j) => j === i ? { ...v, datum_od: e.target.value } : v))} /></div>
                  <div><p className="text-xs mb-1" style={{ color: '#64748B' }}>Do</p>
                    <input type="date" className={inputCls} style={inputStyle} value={vac.datum_do || ''} onChange={e => setVacations(prev => prev.map((v, j) => j === i ? { ...v, datum_do: e.target.value } : v))} /></div>
                  <div><p className="text-xs mb-1" style={{ color: '#64748B' }}>Napomena</p>
                    <input className={inputCls} style={inputStyle} placeholder="Opcionalno" value={vac.napomena || ''} onChange={e => setVacations(prev => prev.map((v, j) => j === i ? { ...v, napomena: e.target.value } : v))} /></div>
                </div>
                <button type="button" onClick={() => { if (vac.id) setDeletedVacationIds(prev => [...prev, vac.id]); setVacations(prev => prev.filter((_, j) => j !== i)) }}
                  className="text-xs flex-shrink-0" style={{ color: '#EF4444' }}>Ukloni</button>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: '#374151' }}>Bolovanje</p>
              <button type="button" onClick={() => setSickLeaves(prev => [...prev, { datum_od: '', datum_do: '', napomena: '', _new: true }])}
                className="text-xs font-medium" style={{ color: '#2563EB' }}>+ Dodaj</button>
            </div>
            {sickLeaves.length === 0 && <p className="text-xs" style={{ color: '#94A3B8' }}>Nema unesenih bolovanja.</p>}
            {sickLeaves.map((sick, i) => (
              <div key={sick.id || i} className="flex items-center gap-3 mb-2 p-3 rounded-lg" style={{ background: '#FEFCE8', border: '1px solid #FEF08A' }}>
                <span className="text-sm">🏥</span>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div><p className="text-xs mb-1" style={{ color: '#64748B' }}>Od</p>
                    <input type="date" className={inputCls} style={inputStyle} value={sick.datum_od || ''} onChange={e => setSickLeaves(prev => prev.map((s, j) => j === i ? { ...s, datum_od: e.target.value } : s))} /></div>
                  <div><p className="text-xs mb-1" style={{ color: '#64748B' }}>Do</p>
                    <input type="date" className={inputCls} style={inputStyle} value={sick.datum_do || ''} onChange={e => setSickLeaves(prev => prev.map((s, j) => j === i ? { ...s, datum_do: e.target.value } : s))} /></div>
                  <div><p className="text-xs mb-1" style={{ color: '#64748B' }}>Napomena</p>
                    <input className={inputCls} style={inputStyle} placeholder="Opcionalno" value={sick.napomena || ''} onChange={e => setSickLeaves(prev => prev.map((s, j) => j === i ? { ...s, napomena: e.target.value } : s))} /></div>
                </div>
                <button type="button" onClick={() => { if (sick.id) setDeletedSickIds(prev => [...prev, sick.id]); setSickLeaves(prev => prev.filter((_, j) => j !== i)) }}
                  className="text-xs flex-shrink-0" style={{ color: '#EF4444' }}>Ukloni</button>
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
