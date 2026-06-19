const kpis = [
  { label: 'Total Customers', value: '1,247', change: '+12%', icon: '👥', color: '#FF6B7A' },
  { label: 'Open Tickets', value: '89', change: '-5%', icon: '🎫', color: '#DC2626' },
  { label: 'Avg Resolution', value: '4.2h', change: '-18%', icon: '⚡', color: '#10B981' },
  { label: 'CSAT Score', value: '4.8/5', change: '+0.3', icon: '⭐', color: '#F59E0B' },
]

const recentTickets = [
  { id: '#1042', title: 'Billing issue with Pro plan', customer: 'Rahul Sharma', status: 'open', priority: 'critical' },
  { id: '#1041', title: 'API integration not working', customer: 'Priya Singh', status: 'open', priority: 'high' },
  { id: '#1040', title: 'Password reset not received', customer: 'Amit Kumar', status: 'resolved', priority: 'medium' },
  { id: '#1039', title: 'Dashboard loading slow', customer: 'Sneha Patel', status: 'open', priority: 'low' },
]

export default function DashboardPage() {
  return (
    <div>
      {/* Header */}
      <div className="fade-in-up" style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '6px' }}>
          Good morning, <span className="text-gradient">Deepanshu</span> 👋
        </h1>
        <p style={{ color: '#475569', fontSize: '14px' }}>Here's what's happening with AegisAI today</p>
      </div>

      {/* KPI Cards */}
      <div className="fade-in-up-delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{
                width: '42px', height: '42px',
                background: `${kpi.color}18`,
                border: `1px solid ${kpi.color}30`,
                borderRadius: '12px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '18px'
              }}>{kpi.icon}</div>
              <span style={{
                fontSize: '12px', fontWeight: '500',
                color: kpi.change.startsWith('+') ? '#10B981' : kpi.change.startsWith('-') && kpi.label !== 'Avg Resolution' ? '#DC2626' : '#10B981',
                background: kpi.change.startsWith('+') ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.1)',
                padding: '3px 8px', borderRadius: '20px'
              }}>{kpi.change}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px', color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '13px', color: '#475569' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Tickets */}
      <div className="fade-in-up-delay-2" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
        <div className="glass" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Recent Tickets</h2>
            <a href="/tickets" style={{ color: '#FF6B7A', fontSize: '13px', textDecoration: 'none' }}>View all →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentTickets.map((ticket, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ color: '#475569', fontSize: '12px', fontWeight: '600', minWidth: '42px' }}>{ticket.id}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '2px' }}>{ticket.title}</div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>{ticket.customer}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={ticket.priority === 'critical' ? 'status-critical' : ticket.status === 'resolved' ? 'status-resolved' : 'status-open'}>
                    {ticket.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Copilot quick panel */}
        <div className="glass" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>🤖 AI Copilot</h2>
          <div style={{
            background: 'linear-gradient(135deg, rgba(225,29,46,0.15), rgba(220,38,38,0.1))',
            border: '1px solid rgba(225,29,46,0.2)',
            borderRadius: '12px', padding: '16px', marginBottom: '16px'
          }}>
            <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.6' }}>
              AI Copilot is available inside every ticket — get instant reply suggestions, summaries, and sentiment analysis.
            </p>
          </div>
          <a href="/tickets" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '14px' }}>
              Open Tickets →
            </button>
          </a>
        </div>
      </div>
    </div>
  )
}
