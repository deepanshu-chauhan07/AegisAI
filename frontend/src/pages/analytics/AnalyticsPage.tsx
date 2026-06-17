import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const API = 'http://localhost:8000/api/v1'
const getToken = () => localStorage.getItem('token') || ''

const KPICard = ({ title, value, icon, color, subtitle }: any) => (
  <div className="kpi-card fade-in-up">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
      <div style={{
        width: '44px', height: '44px',
        background: `${color}18`,
        border: `1px solid ${color}30`,
        borderRadius: '12px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '20px'
      }}>{icon}</div>
    </div>
    <div style={{ fontSize: '30px', fontWeight: '700', color, marginBottom: '4px' }}>{value}</div>
    <div style={{ fontSize: '13px', fontWeight: '500', color: '#94A3B8', marginBottom: '2px' }}>{title}</div>
    {subtitle && <div style={{ fontSize: '12px', color: '#475569' }}>{subtitle}</div>}
  </div>
)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px', padding: '12px 16px'
      }}>
        <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '6px' }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color, fontSize: '13px', fontWeight: '600' }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null)
  const [trends, setTrends] = useState<any[]>([])
  const [byPriority, setByPriority] = useState<any[]>([])
  const [byStatus, setByStatus] = useState<any[]>([])
  const [healthDist, setHealthDist] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${getToken()}` }
      const [ovRes, trRes, prRes, stRes, hlRes] = await Promise.all([
        fetch(`${API}/analytics/overview`, { headers }),
        fetch(`${API}/analytics/tickets/trends?days=${days}`, { headers }),
        fetch(`${API}/analytics/tickets/by-priority`, { headers }),
        fetch(`${API}/analytics/tickets/by-status`, { headers }),
        fetch(`${API}/analytics/customers/health-distribution`, { headers }),
      ])
      const [ov, tr, pr, st, hl] = await Promise.all([
        ovRes.json(), trRes.json(), prRes.json(), stRes.json(), hlRes.json()
      ])
      setOverview(ov)
      setTrends(tr.data || [])
      setByPriority(pr.data || [])
      setByStatus(st.data || [])
      setHealthDist(hl.data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [days])

  const priorityColors: any = {
    critical: '#DC2626', high: '#F59E0B', medium: '#4F7BF7', low: '#10B981'
  }

  const statusColors: any = {
    open: '#818CF8', in_progress: '#38BDF8', resolved: '#6EE7B7',
    closed: '#94A3B8', escalated: '#FCA5A5', assigned: '#FCD34D'
  }

  return (
    <div>
      {/* Header */}
      <div className="fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>Analytics</h1>
          <p style={{ color: '#475569', fontSize: '14px' }}>Real-time platform insights</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{
                padding: '7px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                border: days === d ? '1px solid rgba(79,123,247,0.5)' : '1px solid rgba(255,255,255,0.08)',
                background: days === d ? 'rgba(79,123,247,0.15)' : 'rgba(255,255,255,0.04)',
                color: days === d ? '#818CF8' : '#64748B'
              }}>{d}d</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          <KPICard title="Total Customers" value={overview.total_customers} icon="👥" color="#4F7BF7" />
          <KPICard title="Open Tickets" value={overview.open_tickets} icon="🎫" color="#DC2626" subtitle={`${overview.critical_tickets} critical`} />
          <KPICard title="Resolution Rate" value={`${overview.resolution_rate}%`} icon="✅" color="#10B981" subtitle={`${overview.resolved_tickets} resolved`} />
          <KPICard title="SLA Breached" value={overview.sla_breached} icon="⚠️" color="#F59E0B" subtitle="tickets breached SLA" />
        </div>
      )}

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Ticket Trends */}
        <div className="glass fade-in-up-delay-1" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px' }}>📈 Ticket Trends</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }}
                tickFormatter={v => v.slice(5)} interval={Math.floor(trends.length / 5)} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }} />
              <Line type="monotone" dataKey="created" stroke="#4F7BF7" strokeWidth={2} dot={false} name="Created" />
              <Line type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2} dot={false} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Health */}
        <div className="glass fade-in-up-delay-2" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px' }}>💚 Customer Health</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={healthDist} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                paddingAngle={4} dataKey="value">
                {healthDist.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* By Priority */}
        <div className="glass fade-in-up-delay-3" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px' }}>🎯 Tickets by Priority</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="priority" tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Tickets" radius={[6, 6, 0, 0]}>
                {byPriority.map((entry, i) => (
                  <Cell key={i} fill={priorityColors[entry.priority] || '#4F7BF7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Status */}
        <div className="glass fade-in-up-delay-4" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px' }}>📊 Tickets by Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byStatus} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis dataKey="status" type="category" tick={{ fill: '#475569', fontSize: 11 }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Tickets" radius={[0, 6, 6, 0]}>
                {byStatus.map((entry, i) => (
                  <Cell key={i} fill={statusColors[entry.status] || '#4F7BF7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
