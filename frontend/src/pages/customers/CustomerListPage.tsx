import { useState, useEffect } from 'react'

interface Customer {
  id: string
  contact_name: string
  email: string
  company_name: string
  phone: string
  plan_tier: string
  health_score: number
  churn_risk: string
  churn_prob: number
  created_at: string
}

const getHealthColor = (score: number) => {
  if (score >= 70) return '#10B981'
  if (score >= 40) return '#F59E0B'
  return '#DC2626'
}

const getChurnBadge = (risk: string) => {
  const styles: any = {
    low: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', border: 'rgba(16,185,129,0.3)' },
    medium: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
    high: { bg: 'rgba(220,38,38,0.15)', color: '#DC2626', border: 'rgba(220,38,38,0.3)' },
    critical: { bg: 'rgba(220,38,38,0.25)', color: '#FCA5A5', border: 'rgba(220,38,38,0.5)' },
  }
  const s = styles[risk] || styles.low
  return (
    <span style={{
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500'
    }}>{risk}</span>
  )
}

const API = 'http://localhost:8000/api/v1'

const getToken = () => localStorage.getItem('token') || ''

export default function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ contact_name: '', email: '', company_name: '', phone: '', plan_tier: 'free' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const fetchCustomers = async () => {
    setLoading(true)
    setError('')
    try {
      const token = getToken()
      console.log('Using token:', token?.substring(0, 20) + '...')
      const res = await fetch(
        `${API}/customers?page=${page}&size=20${search ? `&search=${search}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      console.log('Customers data:', data)
      setCustomers(data.data || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      setError('Failed to load customers')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCustomers() }, [page, search])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch(`${API}/customers`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error('Failed to create')
      setShowModal(false)
      setForm({ contact_name: '', email: '', company_name: '', phone: '', plan_tier: 'free' })
      fetchCustomers()
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('http://localhost:8000/api/v1/customers/import-csv', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      setUploadMsg(`✅ Imported: ${data.data.created} new, ${data.data.updated} updated, ${data.data.error_count} errors`)
      fetchCustomers()
    } catch (err: any) {
      setUploadMsg(`❌ ${err.message}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <div className="fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>Customers</h1>
          <p style={{ color: '#475569', fontSize: '14px' }}>{total} total customers</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <label className="btn-secondary" style={{ width: 'auto', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
            {uploading ? '⏳ Uploading...' : '📤 Import CSV'}
            <input type="file" accept=".csv" onChange={handleCsvUpload} disabled={uploading} style={{ display: 'none' }} />
          </label>
          <button className="btn-primary" onClick={() => setShowModal(true)}
            style={{ width: 'auto', padding: '10px 20px', fontSize: '14px' }}>
            + Add Customer
          </button>
        </div>
      </div>

      {uploadMsg && (
        <div className="fade-in-up" style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '10px', fontSize: '13px',
          background: uploadMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(220,38,38,0.1)',
          border: `1px solid ${uploadMsg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(220,38,38,0.3)'}`,
          color: uploadMsg.startsWith('✅') ? '#6EE7B7' : '#FCA5A5'
        }}>
          {uploadMsg}
        </div>
      )}

      <div className="fade-in-up-delay-1" style={{ marginBottom: '20px' }}>
        <input className="glass-input" placeholder="🔍 Search by name, email, company..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ maxWidth: '400px' }} />
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#FCA5A5', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="fade-in-up-delay-2 glass" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Customer', 'Company', 'Plan', 'Health Score', 'Churn Risk', 'Actions'].map(h => (
                <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', color: '#475569', fontWeight: '600', letterSpacing: '0.5px' }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {[1,2,3,4,5,6].map(j => (
                    <td key={j} style={{ padding: '16px 20px' }}>
                      <div style={{ height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No customers found</div>
                  <div style={{ fontSize: '13px' }}>Add your first customer to get started</div>
                </td>
              </tr>
            ) : customers.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1E3AB4, #DC2626)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '15px', fontWeight: '700', flexShrink: 0
                    }}>{c.contact_name.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>{c.contact_name}</div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>{c.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: '#94A3B8' }}>{c.company_name || '—'}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ background: 'rgba(79,123,247,0.15)', color: '#4F7BF7', border: '1px solid rgba(79,123,247,0.3)', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' }}>
                    {c.plan_tier}
                  </span>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${c.health_score}%`, height: '100%', background: getHealthColor(c.health_score), borderRadius: '3px' }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: getHealthColor(c.health_score) }}>{c.health_score}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }}>{getChurnBadge(c.churn_risk)}</td>
                <td style={{ padding: '16px 20px' }}>
                  <button style={{ background: 'rgba(79,123,247,0.1)', border: '1px solid rgba(79,123,247,0.2)', color: '#4F7BF7', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '460px', padding: '36px', margin: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Add New Customer</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              {[
                { label: 'FULL NAME *', key: 'contact_name', placeholder: 'Rahul Sharma', type: 'text' },
                { label: 'EMAIL *', key: 'email', placeholder: 'rahul@company.com', type: 'email' },
                { label: 'COMPANY', key: 'company_name', placeholder: 'TechCorp', type: 'text' },
                { label: 'PHONE', key: 'phone', placeholder: '+91-9876543210', type: 'text' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>{field.label}</label>
                  <input className="glass-input" type={field.type} placeholder={field.placeholder}
                    value={(form as any)[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    required={field.label.includes('*')} />
                </div>
              ))}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>PLAN TIER</label>
                <select className="glass-input" value={form.plan_tier} onChange={e => setForm({ ...form, plan_tier: e.target.value })}>
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px' }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating} style={{ flex: 2 }}>
                  {creating ? '⏳ Creating...' : 'Create Customer →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
