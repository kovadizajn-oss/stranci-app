'use client'

import Link from 'next/link'

export default function DodajZaposlenika() {
  return (
    <div className="p-4 md:p-8" style={{ maxWidth: 600, margin: '0 auto' }}>
      <Link href="/zaposlenici" className="text-sm mb-6 inline-block" style={{ color: '#64748B' }}>
        ← Zaposlenici
      </Link>

      <h1 className="text-2xl font-semibold mb-2" style={{ color: '#1E293B' }}>Dodaj zaposlenika</h1>
      <p className="text-sm mb-8" style={{ color: '#64748B' }}>Odaberite način unosa podataka.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Manual */}
        <Link href="/zaposlenici/novi"
          className="bg-white rounded-xl p-6 flex flex-col gap-4 transition-all"
          style={{ border: '1px solid #E2E8F0', textDecoration: 'none' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = '#2563EB'
            ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'
            ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
          }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: '#EFF6FF' }}>
            ✏️
          </div>
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: '#1E293B' }}>Ručni unos</p>
            <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>
              Unesite podatke zaposlenika ručno popunjavanjem forme.
            </p>
          </div>
          <div className="mt-auto">
            <span className="text-xs font-medium px-3 py-1.5 rounded-lg inline-block"
              style={{ background: '#EFF6FF', color: '#2563EB' }}>
              Otvori formu →
            </span>
          </div>
        </Link>

        {/* Document upload */}
        <Link href="/zaposlenici/uvoz"
          className="bg-white rounded-xl p-6 flex flex-col gap-4 transition-all"
          style={{ border: '1px solid #E2E8F0', textDecoration: 'none' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = '#7C3AED'
            ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'
            ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
          }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: '#F5F3FF' }}>
            🪪
          </div>
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: '#1E293B' }}>Učitaj dokument</p>
            <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>
              Učitajte putovnicu, osobnu iskaznicu ili radnu dozvolu — AI automatski popuni podatke.
            </p>
          </div>
          <div className="mt-auto">
            <span className="text-xs font-medium px-3 py-1.5 rounded-lg inline-block"
              style={{ background: '#F5F3FF', color: '#7C3AED' }}>
              Učitaj dokumente →
            </span>
          </div>
        </Link>
      </div>
    </div>
  )
}
