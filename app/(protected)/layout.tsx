import Sidebar from '@/components/Sidebar'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#F8FAFC' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto" style={{ marginLeft: 220 }}>
        {children}
      </main>
    </div>
  )
}
