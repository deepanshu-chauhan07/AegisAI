import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Login failed')
      localStorage.setItem('token', data.access_token)
      console.log('Token saved:', data.access_token)
      window.location.href = '/customers'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-animated" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="glass glow-blue fade-in-up" style={{ width: '100%', maxWidth: '420px', padding: '48px 40px', margin: '20px', position: 'relative', zIndex: 10 }}>
        <div className="fade-in-up fade-in-up-delay-1" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'linear-gradient(135deg, #1E3AB4, #DC2626)',
            borderRadius: '16px', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', boxShadow: '0 8px 32px rgba(220,38,38,0.3)'
          }}>🛡️</div>
          <h1 className="text-gradient" style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '6px' }}>
            AegisAI
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>Sign in to your workspace</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="fade-in-up fade-in-up-delay-2" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', fontWeight: '500', marginBottom: '8px', letterSpacing: '0.3px' }}>EMAIL</label>
            <input className="glass-input" type="email" placeholder="deepanshu@aegisai.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="fade-in-up fade-in-up-delay-3" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', fontWeight: '500', marginBottom: '8px', letterSpacing: '0.3px' }}>PASSWORD</label>
            <input className="glass-input" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: '10px', padding: '12px 16px', color: '#FCA5A5',
              fontSize: '13px', marginBottom: '16px'
            }}>{error}</div>
          )}
          <div className="fade-in-up fade-in-up-delay-4">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? '⏳ Signing in...' : 'Sign In →'}
            </button>
          </div>
        </form>
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ color: '#475569', fontSize: '13px' }}>
            Don't have an account?{' '}
            <a href="/register" style={{ color: '#4F7BF7', textDecoration: 'none', fontWeight: '500' }}>Create one</a>
          </p>
        </div>
      </div>
    </div>
  )
}
