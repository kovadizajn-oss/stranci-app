'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Pogrešna lozinka. Pokušajte ponovo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ background: '#2563EB' }}>
            <span className="text-white font-bold text-xl">K</span>
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: '#1E293B' }}>Kvantus Admin</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>Evidencija i praćenje stranih radnika</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ borderColor: '#E2E8F0' }}>
          <h2 className="text-lg font-semibold mb-1" style={{ color: '#1E293B' }}>Prijava</h2>
          <p className="text-sm mb-6" style={{ color: '#64748B' }}>Unesite lozinku za pristup aplikaciji.</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                Lozinka
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 rounded-lg border text-sm transition-all"
                style={{ borderColor: error ? '#EF4444' : '#D1D5DB', color: '#1E293B' }}
              />
              {error && (
                <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all"
              style={{
                background: loading || !password ? '#93C5FD' : '#2563EB',
                cursor: loading || !password ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Provjera...' : 'Prijavi se'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
