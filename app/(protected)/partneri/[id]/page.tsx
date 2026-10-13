'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PartnerForm, { draftFrom, type Partner, type PartnerDraft } from '@/components/PartnerForm'
import CompanyContacts, { type Contact } from '@/components/CompanyContacts'
import CompanyLinks, { type CompanyLink } from '@/components/CompanyLinks'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col mb-3">
      <span className="text-xs mb-0.5" style={{ color: '#94A3B8' }}>{label}</span>
      <span className="text-sm whitespace-pre-line" style={{ color: '#1E293B' }}>{children}</span>
    </div>
  )
}

export default function PartnerDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [links, setLinks] = useState<CompanyLink[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/partners/${id}`)
      if (!res.ok) { router.push('/partneri'); return }
      const json = await res.json()
      setPartner(json.partner)
      setContacts(json.contacts || [])
      setLinks(json.links || [])
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleSave(d: PartnerDraft) {
    setSaving(true); setError('')
    const res = await fetch(`/api/partners/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Spremanje nije uspjelo.'); return }
    setPartner(json)
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm('Obrisati ovu partnersku agenciju zajedno s njezinim kontaktima i linkovima?')) return
    setDeleting(true)
    await fetch(`/api/partners/${id}`, { method: 'DELETE' })
    router.push('/partneri')
  }

  if (loading) return <div className="p-8 text-sm" style={{ color: '#94A3B8' }}>Učitavanje...</div>
  if (!partner) return null

  const mjesto = [partner.grad, partner.drzava].filter(Boolean).join(', ')
  const hasInfo = partner.adresa || partner.oib || partner.web || partner.email || partner.telefon || partner.usluge || partner.napomena

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link href="/partneri" className="text-sm" style={{ color: '#64748B' }}>← Partnerske agencije</Link>

      <div className="flex items-start justify-between mt-4 mb-6 gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#F5F3FF', border: '2px solid #DDD6FE' }}>
            <span style={{ fontSize: 24 }}>🤝</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#1E293B' }}>{partner.naziv}</h1>
            {mjesto && <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>🌍 {mjesto}</p>}
          </div>
        </div>
        {!editing && (
          <button onClick={() => { setEditing(true); setError('') }}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white flex-shrink-0"
            style={{ background: '#2563EB' }}>
            ✏️ Uredi
          </button>
        )}
      </div>

      {editing && (
        <PartnerForm title="Uredi partnersku agenciju" initial={draftFrom(partner)} saving={saving} error={error}
          onSave={handleSave} onCancel={() => setEditing(false)}
          extraLeft={
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="btn-danger text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              {deleting ? 'Briše...' : '🗑 Obriši agenciju'}
            </button>
          } />
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <div className="bg-white rounded-2xl p-5 h-fit" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <p className="font-semibold text-sm mb-4" style={{ color: '#1E293B', borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
            ℹ️ Podaci o agenciji
          </p>
          {!hasInfo ? (
            <p className="text-sm" style={{ color: '#CBD5E1' }}>Nema unesenih podataka. Klikni „Uredi” za dodavanje.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              {partner.adresa && <div className="md:col-span-2"><Row label="Adresa">{partner.adresa}</Row></div>}
              {partner.oib && <Row label="OIB / porezni broj / licenca">{partner.oib}</Row>}
              {partner.web && (
                <Row label="Web stranica">
                  <a href={partner.web} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB' }}>{partner.web.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} ↗</a>
                </Row>
              )}
              {partner.email && <Row label="Email"><a href={`mailto:${partner.email}`} style={{ color: '#2563EB' }}>{partner.email}</a></Row>}
              {partner.telefon && <Row label="Telefon"><a href={`tel:${partner.telefon.replace(/\s+/g, '')}`} style={{ color: '#2563EB' }}>{partner.telefon}</a></Row>}
              {partner.usluge && <div className="md:col-span-2"><Row label="Usluge / suradnja">{partner.usluge}</Row></div>}
              {partner.napomena && <div className="md:col-span-2"><Row label="Napomena">{partner.napomena}</Row></div>}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <CompanyContacts key={`c-${id}`} companyId={id} initial={contacts}
            endpoint="/api/partner-contacts" parentKey="partner_id" />
          <CompanyLinks key={`l-${id}`} companyId={id} initial={links}
            endpoint="/api/partner-links" parentKey="partner_id" />
        </div>
      </div>
    </div>
  )
}
