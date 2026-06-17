import { useState } from 'react'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1') + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Registration failed')
      setSuccess(true)
      setTimeout(() => window.location.href = '/login', 2000)
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
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '56px', height: '56px',
            background: 'linear-gradient(135deg, #0EA5E9, #0D9488)',
            borderRadius: '16px', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', boxShadow: '0 8px 32px rgba(14, 165, 233, 0.3)'
          }}>🛡️</div>
          <h1 className="text-gradient" style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '6px' }}>
            Join AegisAI
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>Create your workspace account</p>
        </div>

        {success ? (
          <div style={{ 
            background: 'rgba(13, 148, 136, 0.1)',
            border: '1px solid rgba(13, 148, 136, 0.3)',
            borderRadius: '12px', padding: '20px',
            textAlign: 'center', color: '#5EEAD4'
          }}>
            ✅ Account created! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>FULL NAME</label>
              <input className="glass-input" type="text" placeholder="Deepanshu Singh Chauhan"
                value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>EMAIL</label>
              <input className="glass-input" type="email" placeholder="deepanshu@aegisai.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>PASSWORD</label>
              <input className="glass-input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            </div>

            {error && (
              <div style={{ 
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '10px', padding: '12px 16px',
                color: '#FCA5A5', fontSize: '13px', marginBottom: '16px'
              }}>{error}</div>
            )}

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? '⏳ Creating account...' : 'Create Account →'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ color: '#475569', fontSize: '13px' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: '#0EA5E9', textDecoration: 'none', fontWeight: '500' }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
