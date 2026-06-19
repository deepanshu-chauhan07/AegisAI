import { useState, useEffect } from 'react'

interface Ticket {
  id: string
  ticket_number: number
  title: string
  description?: string
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

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const getToken = () => localStorage.getItem('token') || ''

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ["assigned", "escalated"],
  assigned: ["in_progress", "escalated"],
  in_progress: ["pending_customer", "resolved", "escalated"],
  pending_customer: ["in_progress", "resolved"],
  escalated: ["in_progress", "resolved"],
  resolved: ["closed", "reopened"],
  closed: ["reopened"],
  reopened: ["assigned", "in_progress"]
}

export default function TicketListPage() {
  const isMobile = useIsMobile()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [form, setForm] = useState({ title: '', description: '', customer_id: '', priority: 'medium', category: '' })
  const [creating, setCreating] = useState(false)

  // Detail view state
  const [detailTab, setDetailTab] = useState<'reply' | 'ai'>('reply')
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // AI Copilot
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

  const openTicketDetail = async (t: Ticket) => {
    setSelectedTicket(t)
    setShowDetail(true)
    setDetailTab('reply')
    setReplyText('')
    setCopilotResult('')
    setSentiment(null)
    fetchComments(t.id)
  }

  const fetchComments = async (ticketId: string) => {
    setCommentsLoading(true)
    try {
      const res = await fetch(`${API}/tickets/${ticketId}/comments`, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) setComments(await res.json())
    } catch (err) { console.error(err) }
    finally { setCommentsLoading(false) }
  }

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return
    setSendingReply(true)
    try {
      const res = await fetch(`${API}/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText, is_internal: false })
      })
      if (res.ok) {
        setReplyText('')
        fetchComments(selectedTicket.id)
      }
    } catch (err) { console.error(err) }
    finally { setSendingReply(false) }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`${API}/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        const updated = await res.json()
        setSelectedTicket(updated)
        fetchTickets()
      }
    } catch (err) { console.error(err) }
    finally { setUpdatingStatus(false) }
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

  const useAiReplyAsDraft = () => {
    if (copilotResult) {
      setReplyText(copilotResult)
      setDetailTab('reply')
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const formatTime = (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const getSentimentColor = (s: string) => {
    if (s === 'positive') return '#10B981'
    if (s === 'negative') return '#DC2626'
    return '#F59E0B'
  }

  return (
    <div>
      <div className="fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>Tickets</h1>
          <p style={{ color: '#475569', fontSize: '14px' }}>{total} total tickets</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}
          style={{ width: 'auto', padding: '10px 20px', fontSize: '14px' }}>
          + New Ticket
        </button>
      </div>

      <div className="fade-in-up-delay-1" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', overflowX: isMobile ? 'auto' : 'visible' }}>
        {['', 'open', 'in_progress', 'resolved', 'escalated', 'closed'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            style={{
              padding: '7px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
              border: statusFilter === s ? '1px solid rgba(225,29,46,0.5)' : '1px solid rgba(255,255,255,0.08)',
              background: statusFilter === s ? 'rgba(225,29,46,0.15)' : 'rgba(255,255,255,0.04)',
              color: statusFilter === s ? '#FF8A93' : '#64748B', transition: 'all 0.2s'
            }}>{s || 'All'}</button>
        ))}
      </div>

      <div className="fade-in-up-delay-2 glass" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['#', 'Title', 'Priority', 'Status', 'SLA', 'Created'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', color: '#475569', fontWeight: '600', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {[1,2,3,4,5,6].map(j => (
                      <td key={j} style={{ padding: '16px 20px' }}>
                        <div style={{ height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎫</div>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No tickets found</div>
                    <div style={{ fontSize: '13px' }}>Create your first ticket</div>
                  </td>
                </tr>
              ) : tickets.map(t => (
                <tr key={t.id}
                  onClick={() => openTicketDetail(t)}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
                  <td style={{ padding: '16px 20px', color: '#475569', fontSize: '13px', whiteSpace: 'nowrap' }}>{formatDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== TICKET DETAIL MODAL ===== */}
      {showDetail && selectedTicket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-strong" style={{
            width: '100%', maxWidth: isMobile ? '100%' : '720px',
            maxHeight: isMobile ? '92vh' : '88vh', overflowY: 'auto',
            padding: isMobile ? '20px' : '32px',
            borderRadius: isMobile ? '20px 20px 0 0' : '16px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>#{selectedTicket.ticket_number}</p>
                <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '700', marginBottom: '8px' }}>{selectedTicket.title}</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Badge text={selectedTicket.priority} config={priorityConfig[selectedTicket.priority]} />
                  <Badge text={selectedTicket.status.replace('_', ' ')} config={statusConfig[selectedTicket.status]} />
                </div>
              </div>
              <button onClick={() => setShowDetail(false)} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {selectedTicket.description && (
              <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px', lineHeight: '1.6' }}>{selectedTicket.description}</p>
            )}

            {/* Status changer */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', fontWeight: '600', marginBottom: '8px' }}>CHANGE STATUS</label>
              <select className="glass-input" value="" disabled={updatingStatus}
                onChange={e => { if (e.target.value) handleStatusChange(e.target.value) }}>
                <option value="">Current: {selectedTicket.status.replace('_', ' ')} — select next step</option>
                {(VALID_TRANSITIONS[selectedTicket.status] || []).map(s => (
                  <option key={s} value={s}>→ {s.replace('_', ' ')}</option>
                ))}
              </select>
              {(VALID_TRANSITIONS[selectedTicket.status] || []).length === 0 && (
                <p style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>This is a terminal status with no further transitions defined.</p>
              )}
            </div>

            {/* Tabs: Reply vs AI Copilot */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {[
                { key: 'reply', label: '💬 Reply to Customer' },
                { key: 'ai', label: '🤖 AI Copilot' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setDetailTab(tab.key as any)}
                  style={{
                    flex: 1, padding: '9px 4px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer',
                    border: detailTab === tab.key ? '1px solid rgba(225,29,46,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    background: detailTab === tab.key ? 'rgba(225,29,46,0.15)' : 'rgba(255,255,255,0.04)',
                    color: detailTab === tab.key ? '#FF8A93' : '#64748B'
                  }}>{tab.label}</button>
              ))}
            </div>

            {/* REPLY TAB */}
            {detailTab === 'reply' && (
              <div>
                <textarea className="glass-input" placeholder="Type your reply to the customer..."
                  value={replyText} onChange={e => setReplyText(e.target.value)}
                  rows={4} style={{ resize: 'none', marginBottom: '12px' }} />
                <button className="btn-primary" onClick={handleSendReply} disabled={sendingReply || !replyText.trim()}
                  style={{ width: 'auto', padding: '10px 22px', marginBottom: '20px' }}>
                  {sendingReply ? '⏳ Sending...' : '✉️ Send Reply →'}
                </button>

                <p style={{ fontSize: '12px', color: '#475569', fontWeight: '600', marginBottom: '10px' }}>CONVERSATION HISTORY</p>
                {commentsLoading ? (
                  <p style={{ color: '#475569', fontSize: '13px', textAlign: 'center', padding: '16px' }}>Loading...</p>
                ) : comments.length === 0 ? (
                  <p style={{ color: '#475569', fontSize: '13px', textAlign: 'center', padding: '16px' }}>No replies yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                    {comments.map((c: any) => (
                      <div key={c.id} style={{
                        background: c.is_ai ? 'rgba(225,29,46,0.06)' : 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#FF8A93', fontWeight: '600' }}>{c.is_ai ? '🤖 AI Generated' : '👤 Agent'}</span>
                          <span style={{ fontSize: '11px', color: '#475569' }}>{formatTime(c.created_at)}</span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: '1.6' }}>{c.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI COPILOT TAB */}
            {detailTab === 'ai' && (
              <div>
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

                <button className="btn-primary" onClick={() => handleCopilot(copilotTab)} disabled={copilotLoading}
                  style={{ marginBottom: '16px', fontSize: '13px', padding: '10px' }}>
                  {copilotLoading ? '⏳ Generating...' : `Generate ${copilotTab === 'suggest' ? 'Reply' : copilotTab === 'summarize' ? 'Summary' : 'Sentiment'} →`}
                </button>

                {copilotResult && (
                  <div>
                    <div style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px', padding: '16px', maxHeight: '220px', overflowY: 'auto', marginBottom: '12px'
                    }}>
                      <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{copilotResult}</p>
                    </div>
                    {copilotTab === 'suggest' && (
                      <button className="btn-secondary" onClick={useAiReplyAsDraft} style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }}>
                        ↩️ Use as Reply Draft
                      </button>
                    )}
                  </div>
                )}

                {sentiment && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { label: 'Sentiment', value: sentiment.sentiment, color: getSentimentColor(sentiment.sentiment) },
                      { label: 'Emotion', value: sentiment.dominant_emotion, color: '#FF8A93' },
                      { label: 'Urgency', value: sentiment.urgency, color: '#F59E0B' },
                    ].map(item => (
                      <div key={item.label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                        borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        <span style={{ fontSize: '13px', color: '#64748B' }}>{item.label}</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: item.color, textTransform: 'capitalize' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
