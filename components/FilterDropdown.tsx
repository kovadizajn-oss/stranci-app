'use client'

import { useEffect, useRef, useState } from 'react'

export type FilterOption = { value: string; label?: string; color?: string; bg?: string }

function Pill({ o }: { o: FilterOption }) {
  if (!o.color) return <span>{o.label ?? o.value}</span>
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap" style={{ background: o.bg, color: o.color }}>
      {o.label ?? o.value}
    </span>
  )
}

/** Filter u stilu aplikacije: gumb kao input polje, padajući izbornik s obojenim oznakama. */
export default function FilterDropdown({ label, value, onChange, options, allLabel = 'sve' }: {
  label: string; value: string; onChange: (v: string) => void; options: FilterOption[]; allLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  function pick(v: string) { onChange(v); setOpen(false) }

  return (
    <div ref={ref} className="relative w-full md:w-auto">
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}
        className="w-full md:w-auto flex items-center justify-between gap-2 px-3 rounded-lg border text-sm bg-white"
        style={{
          height: 38, minWidth: 150,
          borderColor: open || value ? '#2563EB' : '#D1D5DB',
          boxShadow: open ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}>
        <span className="flex items-center gap-1.5 min-w-0" style={{ color: '#64748B' }}>
          {label}:
          {selected ? <Pill o={selected} /> : <span style={{ color: '#334155' }}>{allLabel}</span>}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2.2}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="listbox" className="absolute left-0 mt-1 py-1 z-50"
          style={{ top: '100%', minWidth: '100%', background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          {[{ value: '', label: allLabel === 'sve' ? 'Sve' : allLabel } as FilterOption, ...options].map(o => {
            const active = o.value === value
            return (
              <button key={o.value || '__all'} type="button" role="option" aria-selected={active}
                onClick={() => pick(o.value)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left whitespace-nowrap"
                style={{ color: '#334155', background: active ? '#F8FAFC' : 'transparent', fontWeight: active ? 600 : 400 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
                onMouseLeave={e => (e.currentTarget.style.background = active ? '#F8FAFC' : 'transparent')}>
                <Pill o={o} />
                {active && <span style={{ color: '#2563EB', fontSize: 12 }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
