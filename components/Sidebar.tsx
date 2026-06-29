'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    label: 'GLAVNO',
    items: [
      { href: '/dashboard', label: 'Pregled', icon: '🔎' },
      { href: '/zaposlenici', label: 'Zaposlenici', icon: '👥' },
      { href: '/kalendar', label: 'Kalendar', icon: '📅' },
      { href: '/obaveze', label: 'Obaveze', icon: '📋' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 h-full flex-col hidden md:flex"
        style={{ width: 220, background: '#FFFFFF', borderRight: '1px solid #E2E8F0', zIndex: 50 }}
      >
        <div className="flex items-center gap-2.5 px-4 py-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: '#2563EB' }}>
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <span className="font-semibold text-sm" style={{ color: '#1E293B' }}>Kvantus</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="text-xs font-semibold px-2 mb-2 tracking-wider" style={{ color: '#94A3B8' }}>{group.label}</p>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-0.5 text-sm transition-all"
                  style={{
                    color: isActive(item.href) ? '#2563EB' : '#475569',
                    background: isActive(item.href) ? '#EFF6FF' : 'transparent',
                    fontWeight: isActive(item.href) ? 500 : 400,
                  }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 py-2 z-50"
        style={{ background: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
        {navItems[0].items.map((item) => (
          <Link key={item.href} href={item.href}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs"
            style={{
              color: isActive(item.href) ? '#2563EB' : '#94A3B8',
              background: isActive(item.href) ? '#EFF6FF' : 'transparent',
              fontWeight: isActive(item.href) ? 600 : 400,
            }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
