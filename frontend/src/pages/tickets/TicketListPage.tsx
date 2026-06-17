import { useState, useEffect } from 'react'

interface Ticket {
  id: string
  ticket_number: number
  title: string
  status: string
  priority: string
  category: string
  customer_id: string
  sla_breached: boolean
  created_at: string
}

const priorityConfig: any = {
  critical: { bg: 'rgba(220,38,38,0.15)', color: '#FCA5A5', border: 'rgba(220,38,38,0.4)' },
  high: { bg: 'rgba(245,158,11,0.15)', color: '#FCD34D', border: 'rgba(245,158,11,0.4)' },
  medium: { bg: 'rgba(225,29,46,0.15)', color: '#FF8A93', border: 'rgba(225,29,46,0.4)' },
  low: { bg: 'rgba(16,185,129,0.15)', color: '#6EE7B7', border: 'rgba(16,185,129,0.4)' },
}

const statusConfig: any = {
  open: { bg: 'rgba(225,29,46,0.15)', color: '#FF8A93', border: 'rgba(225,29,46,0.3)' },
  assigned: { bg: 'rgba(245,158,11,0.15)', color: '#FCD34D', border: 'rgba(245,158,11,0.3)' },
  in_progress: { bg: 'rgba(14,165,233,0.15)', color: '#38BDF8', border: 'rgba(14,165,233,0.3)' },
  resolved: { bg: 'rgba(16,185,129,0.15)', color: '#6EE7B7', border: 'rgba(16,185,129,0.3)' },
  closed: { bg: 'rgba(100,116,139,0.15)', color: '#94A3B8', border: 'rgba(100,116,139,0.3)' },
  escalated: { bg: 'rgba(220,38,38,0.15)', color: '#FCA5A5', border: 'rgba(220,38,38,0.3)' },
}

const Badge = ({ text, config }: any) => (
  <span style={{
    background: config?.bg || 'rgba(100,116,139,0.15)',
    color: config?.color || '#94A3B8',
    border: `1px solid ${config?.border || 'rgba(100,116,139,0.3)'}`,
    padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500'
  }}>{text}</span>
)

const API = 'http://localhost:8000/api/v1'
const getToken = () => localStorage.getItem('token') || ''

export default function TicketListPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showCopilot, setShowCopilot] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [form, setForm] = useState({ title: '', description: '', customer_id: '', priority: 'medium', category: '' })
  const [creating, setCreating] = useState(false)
  const [copilotResult, setCopilotResult] = useState('')
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotTab, setCopilotTab] = useState<'suggest'|'summarize'|'sentiment'>('suggest')
  const [sentiment, setSentiment] = useState<any>(null)

  const fetchTickets = async () => {
    setLoading(true)
    try {
      let url = `${API}/tickets?page=${page}&size=20`
      if (statusFilter) url += `&status=${statusFilter}`
      if (priorityFilter) url += `&priority=${priorityFilter}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.status === 401) { window.location.href = '/login'; return }
      const data = await res.json()
      setTickets(data.data || [])
      setTotal(data.total || 0)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const fetchCustomers = async () => {
    const res = await fetch(`${API}/customers?size=100`, { headers: { Authorization: `Bearer ${getToken()}` } })
    const data = await res.json()
    setCustomers(data.data || [])
  }

  useEffect(() => { fetchTickets() }, [page, statusFilter, priorityFilter])
  useEffect(() => { fetchCustomers() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch(`${API}/tickets`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error('Failed')
      setShowModal(false)
      setForm({ title: '', description: '', customer_id: '', priority: 'medium', category: '' })
      fetchTickets()
    } catch (err) { console.error(err) }
    finally { setCreating(false) }
  }

  const handleCopilot = async (action: string) => {
    if (!selectedTicket) return
    setCopilotLoading(true)
    setCopilotResult('')
    setSentiment(null)
    try {
      const res = await fetch(`${API}/ai/copilot/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: selectedTicket.id })
      })
      const data = await res.json()
      if (action === 'suggest') setCopilotResult(data.reply)
      else if (action === 'summarize') setCopilotResult(data.summary)
      else if (action === 'sentiment') setSentiment(data)
    } catch (err) { setCopilotResult('Error getting AI response') }
    finally { setCopilotLoading(false) }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const getSentimentColor = (s: string) => {
    if (s === 'positive') return '#10B981'
    if (s === 'negative') return '#DC2626'
    return '#F59E0B'
  }

  return (
    <div>
      <div className="fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>Tickets</h1>
          <p style={{ color: '#475569', fontSize: '14px' }}>{total} total tickets</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}
          style={{ width: 'auto', padding: '10px 20px', fontSize: '14px' }}>
          + New Ticket
        </button>
      </div>

      <div className="fade-in-up-delay-1" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['', 'open', 'in_progress', 'resolved', 'escalated', 'closed'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            style={{
              padding: '7px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
              border: statusFilter === s ? '1px solid rgba(225,29,46,0.5)' : '1px solid rgba(255,255,255,0.08)',
              background: statusFilter === s ? 'rgba(225,29,46,0.15)' : 'rgba(255,255,255,0.04)',
              color: statusFilter === s ? '#FF8A93' : '#64748B', transition: 'all 0.2s'
            }}>{s || 'All'}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showCopilot ? '1fr 380px' : '1fr', gap: '20px' }}>
        <div className="fade-in-up-delay-2 glass" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['#', 'Title', 'Priority', 'Status', 'SLA', 'Created', 'AI'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', color: '#475569', fontWeight: '600', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {[1,2,3,4,5,6,7].map(j => (
                      <td key={j} style={{ padding: '16px 20px' }}>
                        <div style={{ height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎫</div>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No tickets found</div>
                    <div style={{ fontSize: '13px' }}>Create your first ticket</div>
                  </td>
                </tr>
              ) : tickets.map(t => (
                <tr key={t.id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer',
                    background: selectedTicket?.id === t.id ? 'rgba(225,29,46,0.08)' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => { if (selectedTicket?.id !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (selectedTicket?.id !== t.id) e.currentTarget.style.background = 'transparent' }}>
                  <td style={{ padding: '16px 20px', color: '#475569', fontSize: '13px', fontWeight: '600' }}>#{t.ticket_number || '—'}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '2px' }}>{t.title}</div>
                    {t.category && <div style={{ fontSize: '12px', color: '#475569' }}>{t.category}</div>}
                  </td>
                  <td style={{ padding: '16px 20px' }}><Badge text={t.priority} config={priorityConfig[t.priority]} /></td>
                  <td style={{ padding: '16px 20px' }}><Badge text={t.status.replace('_', ' ')} config={statusConfig[t.status]} /></td>
                  <td style={{ padding: '16px 20px' }}>
                    {t.sla_breached
                      ? <span style={{ color: '#DC2626', fontSize: '12px', fontWeight: '600' }}>⚠️ Breached</span>
                      : <span style={{ color: '#10B981', fontSize: '12px' }}>✅ On track</span>}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#475569', fontSize: '13px' }}>{formatDate(t.created_at)}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <button
                      onClick={() => { setSelectedTicket(t); setShowCopilot(true); setCopilotResult(''); setSentiment(null) }}
                      style={{
                        background: 'linear-gradient(135deg, rgba(225,29,46,0.2), rgba(220,38,38,0.1))',
                        border: '1px solid rgba(225,29,46,0.3)', color: '#FF8A93',
                        padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer'
                      }}>🤖 AI</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Copilot Panel */}
        {showCopilot && selectedTicket && (
          <div className="glass fade-in-up" style={{ padding: '24px', height: 'fit-content', position: 'sticky', top: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '28px',
                  background: 'linear-gradient(135deg, #E11D2E, #FF3B4E)',
                  borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}>🤖</div>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>AI Copilot</span>
              </div>
              <button onClick={() => setShowCopilot(false)}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <div style={{ background: 'rgba(225,29,46,0.08)', border: '1px solid rgba(225,29,46,0.15)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: '#FF8A93', fontWeight: '600', marginBottom: '4px' }}>SELECTED TICKET</p>
              <p style={{ fontSize: '13px', color: '#CBD5E1' }}>{selectedTicket.title}</p>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              {[
                { key: 'suggest', label: '💬 Reply' },
                { key: 'summarize', label: '📝 Summary' },
                { key: 'sentiment', label: '😊 Sentiment' }
              ].map(tab => (
                <button key={tab.key} onClick={() => setCopilotTab(tab.key as any)}
                  style={{
                    flex: 1, padding: '7px 4px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer',
                    border: copilotTab === tab.key ? '1px solid rgba(225,29,46,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    background: copilotTab === tab.key ? 'rgba(225,29,46,0.15)' : 'rgba(255,255,255,0.04)',
                    color: copilotTab === tab.key ? '#FF8A93' : '#64748B'
                  }}>{tab.label}</button>
              ))}
            </div>

            <button className="btn-primary"
              onClick={() => handleCopilot(copilotTab)}
              disabled={copilotLoading}
              style={{ marginBottom: '16px', fontSize: '13px', padding: '10px' }}>
              {copilotLoading ? '⏳ Generating...' : `Generate ${copilotTab === 'suggest' ? 'Reply' : copilotTab === 'summarize' ? 'Summary' : 'Sentiment'} →`}
            </button>

            {copilotResult && (
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '16px', maxHeight: '300px', overflowY: 'auto'
              }}>
                <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                  {copilotResult}
                </p>
              </div>
            )}

            {sentiment && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Sentiment', value: sentiment.sentiment, color: getSentimentColor(sentiment.sentiment) },
                  { label: 'Emotion', value: sentiment.dominant_emotion, color: '#FF8A93' },
                  { label: 'Urgency', value: sentiment.urgency, color: '#F59E0B' },
                  { label: 'Score', value: sentiment.score?.toFixed(2), color: '#94A3B8' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                    borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>{item.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: item.color, textTransform: 'capitalize' }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '500px', padding: '36px', margin: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Create New Ticket</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>TITLE *</label>
                <input className="glass-input" placeholder="Billing issue with Pro plan"
                  value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>DESCRIPTION</label>
                <textarea className="glass-input" placeholder="Describe the issue..."
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={3} style={{ resize: 'none' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>CUSTOMER *</label>
                <select className="glass-input" value={form.customer_id}
                  onChange={e => setForm({...form, customer_id: e.target.value})} required>
                  <option value="">Select customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.contact_name} — {c.email}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>PRIORITY</label>
                  <select className="glass-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    <option value="critical">🔴 Critical</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🔵 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>CATEGORY</label>
                  <select className="glass-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="">Select...</option>
                    <option value="billing">Billing</option>
                    <option value="technical">Technical</option>
                    <option value="account">Account</option>
                    <option value="feature">Feature Request</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px' }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating} style={{ flex: 2 }}>
                  {creating ? '⏳ Creating...' : 'Create Ticket →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
