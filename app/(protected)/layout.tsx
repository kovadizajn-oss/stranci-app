import Sidebar from '@/components/Sidebar'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#F1F5F9' }}>
      <Sidebar />
      {/* overflow-x-clip (umjesto overflow-auto): main ne smije biti vlastiti "scroll" okvir, inače sticky trake
          (npr. traka za odabrane radnike, gumb Spremi) ne prate ekran nego stoje na dnu stranice. min-w-0 drži širinu unutar ekrana. */}
      <main className="flex-1 min-w-0 overflow-x-clip w-full md:ml-[230px] pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
