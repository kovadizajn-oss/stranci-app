import Sidebar from '@/components/Sidebar'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#F1F5F9' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto w-full md:ml-[230px] pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
