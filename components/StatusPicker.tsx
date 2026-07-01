'use client'

import { useEffect, useRef, useState } from 'react'

export const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  'Aktivan':    { color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' },
  'U postupku': { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  'Na čekanju': { color: '#CA8A04', bg: '#FEF9C3', border: '#FDE047' },
  'Otkazan':    { color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
}

const STATUSI = ['Aktivan', 'U postupku', 'Na čekanju', 'Otkazan']

type Props = {
  value: string
  onChange: (val: string) => void
}

export default function StatusPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const cfg = STATUS_CONFIG[value] || STATUS_CONFIG['Aktivan']

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm"
        style={{
          borderColor: open ? '#2563EB' : '#D1D5DB',
          background: 'white',
          boxShadow: open ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <span
          className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
        >
          {value}
        </span>
        <svg
          style={{
            width: 16, height: 16, color: '#94A3B8',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1 bg-white rounded-xl py-1.5 flex flex-col gap-0.5"
          style={{
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          }}
        >
          {STATUSI.map(s => {
            const c = STATUS_CONFIG[s]
            const isSelected = s === value
            return (
              <button
                key={s}
                type="button"
                onClick={() => { onChange(s); setOpen(false) }}
                className="flex items-center gap-3 px-3 py-2 text-left w-full"
                style={{
                  background: isSelected ? '#F8FAFC' : 'transparent',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                  style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
                >
                  {s}
                </span>
                {isSelected && (
                  <span className="ml-auto text-xs" style={{ color: '#2563EB' }}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
