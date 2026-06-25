import Sidebar from '@/components/Sidebar'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#F8FAFC' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto w-full md:ml-[220px] pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
