'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard',    label: 'Pregled',      icon: <IconDashboard /> },
  { href: '/zaposlenici',  label: 'Zaposlenici',  icon: <IconWorkers /> },
  { href: '/tvrtke',       label: 'Tvrtke',       icon: <IconCompany /> },
  { href: '/kalendar',     label: 'Kalendar',     icon: <IconCalendar /> },
  { href: '/obaveze',      label: 'Obaveze',      icon: <IconObaveze /> },
]

function IconDashboard() {
  return <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
}
function IconWorkers() {
  return <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>
}
function IconCompany() {
  return <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M3 21h18M3 7v14M21 7v14M6 3h12l2 4H4L6 3z"/><path d="M9 21v-6h6v6"/></svg>
}
function IconCalendar() {
  return <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
}
function IconObaveze() {
  return <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
}
function IconLogout() {
  return <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}

export default function Sidebar() {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {loggingOut && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
          style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="w-10 h-10 rounded-full border-4 animate-spin mb-4"
            style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#2563EB' }} />
          <p className="text-sm font-medium text-white">Odjava u tijeku...</p>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 h-full hidden md:flex flex-col"
        style={{ width: 230, background: '#0F172A', zIndex: 50 }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Kvantus</p>
            <p className="text-xs" style={{ color: '#64748B' }}>Admin panel</p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-5 px-3">
          <p className="text-xs font-semibold px-3 mb-3 tracking-widest uppercase"
            style={{ color: '#334155' }}>Navigacija</p>
          {navItems.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}
                className="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium"
                style={{
                  color: active ? '#FFFFFF' : '#64748B',
                  background: active ? 'rgba(37,99,235,0.2)' : 'transparent',
                  position: 'relative',
                }}>
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full"
                    style={{ height: 20, background: '#2563EB' }} />
                )}
                <span style={{ color: active ? '#60A5FA' : '#475569' }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

        {/* Logout */}
        <div className="px-3 py-4">
          <button onClick={handleLogout} disabled={loggingOut}
            className="nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: '#475569' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#F87171'
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = '#475569'
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}>
            <IconLogout />
            {loggingOut ? 'Odjava...' : 'Odjava'}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around px-1 py-2 z-50"
        style={{ background: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {navItems.map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl"
              style={{
                color: active ? '#60A5FA' : '#475569',
                background: active ? 'rgba(37,99,235,0.15)' : 'transparent',
                fontSize: 10,
                minWidth: 0,
                fontWeight: active ? 600 : 400,
              }}>
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
