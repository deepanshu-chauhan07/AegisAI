import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const getToken = () => localStorage.getItem('token') || ''

const riskColors: any = { low: '#10B981', medium: '#F59E0B', high: '#F97316', critical: '#DC2626' }
const segmentColors: any = { "Champions": "#6EE7A8", "Steady": "#FF8A93", "New & Growing": "#818CF8", "At Risk": "#DC2626" }

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

export default function IntelligencePage() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<'churn' | 'segments' | 'anomalies' | 'routing' | 'response'>('churn')

  // Churn
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [shapResult, setShapResult] = useState<any>(null)
  const [shapLoading, setShapLoading] = useState(false)

  // Segmentation
  const [segments, setSegments] = useState<any>(null)
  const [segLoading, setSegLoading] = useState(false)

  // Anomalies
  const [volumeAnomalies, setVolumeAnomalies] = useState<any>(null)
  const [agentOverload, setAgentOverload] = useState<any>(null)
  const [anomalyLoading, setAnomalyLoading] = useState(false)

  // Routing
  const [routePriority, setRoutePriority] = useState('medium')
  const [routeCategory, setRouteCategory] = useState('technical')
  const [routeResult, setRouteResult] = useState<any>(null)
  const [routeLoading, setRouteLoading] = useState(false)

  // Response time
  const [rtPriority, setRtPriority] = useState('medium')
  const [rtCategory, setRtCategory] = useState('technical')
  const [rtResult, setRtResult] = useState<any>(null)
  const [rtLoading, setRtLoading] = useState(false)

  const fetchOverview = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/intelligence/overview`, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.status === 401) { window.location.href = '/login'; return }
      const data = await res.json()
      setOverview(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchOverview() }, [])

  const runPredictions = async () => {
    setRunning(true)
    try {
      await fetch(`${API}/intelligence/churn/batch`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } })
      await fetchOverview()
    } catch (err) { console.error(err) }
    finally { setRunning(false) }
  }

  const explainCustomer = async (customer: any) => {
    setSelectedCustomer(customer)
    setShapLoading(true)
    setShapResult(null)
    try {
      const res = await fetch(`${API}/intelligence/churn/${customer.id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      const data = await res.json()
      setShapResult(data)
    } catch (err) { console.error(err) }
    finally { setShapLoading(false) }
  }

  const runSegmentation = async () => {
    setSegLoading(true)
    try {
      const res = await fetch(`${API}/intelligence/segmentation`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } })
      const data = await res.json()
      setSegments(data)
    } catch (err) { console.error(err) }
    finally { setSegLoading(false) }
  }

  const runAnomalyDetection = async () => {
    setAnomalyLoading(true)
    try {
      const [volRes, agentRes] = await Promise.all([
        fetch(`${API}/intelligence/anomalies/ticket-volume?days=30`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/intelligence/anomalies/agent-overload`, { headers: { Authorization: `Bearer ${getToken()}` } })
      ])
      setVolumeAnomalies(await volRes.json())
      setAgentOverload(await agentRes.json())
    } catch (err) { console.error(err) }
    finally { setAnomalyLoading(false) }
  }

  const runRouting = async () => {
    setRouteLoading(true)
    try {
      const res = await fetch(`${API}/intelligence/auto-route`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: routePriority, category: routeCategory })
      })
      setRouteResult(await res.json())
    } catch (err) { console.error(err) }
    finally { setRouteLoading(false) }
  }

  const runResponsePrediction = async () => {
    setRtLoading(true)
    try {
      const res = await fetch(`${API}/intelligence/response-time/predict`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: rtPriority, category: rtCategory })
      })
      setRtResult(await res.json())
    } catch (err) { console.error(err) }
    finally { setRtLoading(false) }
  }

  const riskData = overview ? Object.entries(overview.risk_distribution).map(([name, value]) => ({
    name, value, color: riskColors[name]
  })) : []

  const featureLabels: any = {
    health_score: "Health Score", ticket_count: "Total Tickets",
    critical_ticket_ratio: "Critical Ticket %", sla_breach_count: "SLA Breaches",
    open_ticket_count: "Open Tickets", days_since_signup: "Days Since Signup",
    plan_tier_score: "Plan Tier", resolution_rate: "Resolution Rate"
  }

  const tabs = [
    { key: 'churn', label: '🎯 Churn Prediction' },
    { key: 'segments', label: '🧩 Segmentation' },
    { key: 'anomalies', label: '⚠️ Anomalies' },
    { key: 'routing', label: '🧭 Auto-Routing' },
    { key: 'response', label: '⏱️ Response Time' },
  ]

  return (
    <div>
      <div className="fade-in-up" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>
          Predictive Intelligence
        </h1>
        <p style={{ color: '#475569', fontSize: '14px' }}>ML-powered insights across churn, segments, anomalies & routing</p>
      </div>

      <div className="fade-in-up-delay-1" style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', overflowX: isMobile ? 'auto' : 'visible' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '8px 16px', borderRadius: '20px', fontSize: isMobile ? '12px' : '13px', cursor: 'pointer', whiteSpace: 'nowrap',
              border: activeTab === tab.key ? '1px solid rgba(225,29,46,0.5)' : '1px solid rgba(255,255,255,0.08)',
              background: activeTab === tab.key ? 'rgba(225,29,46,0.15)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.key ? '#FF8A93' : '#64748B',
              fontWeight: activeTab === tab.key ? '600' : '400'
            }}>{tab.label}</button>
        ))}
      </div>

      {/* ===== CHURN TAB ===== */}
      {activeTab === 'churn' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn-primary" onClick={runPredictions} disabled={running}
              style={{ width: 'auto', padding: '10px 20px', fontSize: '14px' }}>
              {running ? '⏳ Running model...' : '🔮 Run Predictions'}
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>Loading...</div>
          ) : overview && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="kpi-card fade-in-up">
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#FF6B7A', marginBottom: '4px' }}>{overview.total_customers}</div>
                  <div style={{ fontSize: '13px', color: '#94A3B8' }}>Total Customers Analyzed</div>
                </div>
                <div className="kpi-card fade-in-up-delay-1">
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#10B981', marginBottom: '4px' }}>{overview.avg_health_score}</div>
                  <div style={{ fontSize: '13px', color: '#94A3B8' }}>Avg Health Score</div>
                </div>
                <div className="kpi-card fade-in-up-delay-2">
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#DC2626', marginBottom: '4px' }}>
                    {overview.risk_distribution.high + overview.risk_distribution.critical}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94A3B8' }}>High/Critical Risk</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', gap: '20px' }}>
                <div className="glass fade-in-up-delay-1" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>🎯 Risk Distribution</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={riskData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                        {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#160508', border: '1px solid rgba(225,29,46,0.2)', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    {riskData.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: r.color }} />
                          <span style={{ color: '#94A3B8', textTransform: 'capitalize' }}>{r.name}</span>
                        </div>
                        <span style={{ color: '#F1F5F9', fontWeight: '600' }}>{r.value as number}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass fade-in-up-delay-2" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>⚠️ At-Risk Customers</h3>
                  {overview.high_risk_customers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#475569' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
                      No high-risk customers right now
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {overview.high_risk_customers.map((c: any) => (
                        <div key={c.id} onClick={() => explainCustomer(c)}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
                            borderRadius: '10px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)'
                          }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '500' }}>{c.name}</div>
                            <div style={{ fontSize: '12px', color: '#475569' }}>{c.email}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: riskColors[c.churn_risk] }}>
                              {Math.round(c.churn_prob * 100)}%
                            </div>
                            <div style={{ fontSize: '11px', color: '#475569', textTransform: 'capitalize' }}>{c.churn_risk}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedCustomer && (
                <div className="glass fade-in-up" style={{ padding: '24px', marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600' }}>🧠 SHAP Explanation — {selectedCustomer.name}</h3>
                    <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                  </div>
                  {shapLoading ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#475569' }}>Computing explanation...</div>
                  ) : shapResult && (
                    <div>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <div style={{ background: 'rgba(225,29,46,0.1)', border: '1px solid rgba(225,29,46,0.2)', borderRadius: '12px', padding: '12px 20px' }}>
                          <div style={{ fontSize: '12px', color: '#FF8A93' }}>Churn Probability</div>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#FF8A93' }}>{Math.round(shapResult.churn_probability * 100)}%</div>
                        </div>
                        <div style={{ background: `${riskColors[shapResult.churn_risk]}15`, border: `1px solid ${riskColors[shapResult.churn_risk]}30`, borderRadius: '12px', padding: '12px 20px' }}>
                          <div style={{ fontSize: '12px', color: riskColors[shapResult.churn_risk] }}>Risk Level</div>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: riskColors[shapResult.churn_risk], textTransform: 'capitalize' }}>{shapResult.churn_risk}</div>
                        </div>
                      </div>
                      <p style={{ color: '#94A3B8', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>TOP FACTORS</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {shapResult.top_factors.map((f: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '13px', color: '#CBD5E1', minWidth: isMobile ? '100px' : '160px' }}>{featureLabels[f.feature] || f.feature}</span>
                            <div style={{ flex: 1, height: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                              <div style={{
                                position: 'absolute', height: '100%',
                                left: f.direction === 'increases_risk' ? '50%' : `${50 - Math.min(Math.abs(f.impact) * 100, 50)}%`,
                                width: `${Math.min(Math.abs(f.impact) * 100, 50)}%`,
                                background: f.direction === 'increases_risk' ? '#DC2626' : '#10B981',
                                borderRadius: '6px'
                              }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: f.direction === 'increases_risk' ? '#FCA5A5' : '#6EE7A8', minWidth: '70px', textAlign: 'right' }}>
                              {f.direction === 'increases_risk' ? '↑ Risk' : '↓ Risk'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== SEGMENTATION TAB ===== */}
      {activeTab === 'segments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn-primary" onClick={runSegmentation} disabled={segLoading}
              style={{ width: 'auto', padding: '10px 20px', fontSize: '14px' }}>
              {segLoading ? '⏳ Clustering...' : '🧩 Run Segmentation'}
            </button>
          </div>

          {!segments && !segLoading && (
            <div className="glass" style={{ textAlign: 'center', padding: '50px', color: '#475569' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧩</div>
              Click "Run Segmentation" to cluster customers using K-Means
            </div>
          )}

          {segments?.error && (
            <div className="glass" style={{ padding: '24px', color: '#FCA5A5' }}>{segments.error}</div>
          )}

          {segments?.segments && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
              {Object.entries(segments.segments).map(([name, count]) => (
                <div key={name} className="kpi-card">
                  <div style={{ fontSize: '24px', fontWeight: '700', color: segmentColors[name] || '#FF6B7A', marginBottom: '4px' }}>{count as number}</div>
                  <div style={{ fontSize: '13px', color: '#94A3B8' }}>{name}</div>
                </div>
              ))}
            </div>
          )}

          {segments?.customers && (
            <div className="glass" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Name', 'Email', 'Health', 'Segment'].map(h => (
                        <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {segments.customers.map((c: any) => (
                      <tr key={c.customer_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '12px 20px', fontSize: '14px', whiteSpace: 'nowrap' }}>{c.name}</td>
                        <td style={{ padding: '12px 20px', fontSize: '13px', color: '#94A3B8', whiteSpace: 'nowrap' }}>{c.email}</td>
                        <td style={{ padding: '12px 20px', fontSize: '13px' }}>{c.health_score}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{
                            fontSize: '11px', padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap',
                            background: `${segmentColors[c.segment]}18`, color: segmentColors[c.segment],
                            border: `1px solid ${segmentColors[c.segment]}40`
                          }}>{c.segment}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ANOMALIES TAB ===== */}
      {activeTab === 'anomalies' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn-primary" onClick={runAnomalyDetection} disabled={anomalyLoading}
              style={{ width: 'auto', padding: '10px 20px', fontSize: '14px' }}>
              {anomalyLoading ? '⏳ Scanning...' : '⚠️ Detect Anomalies'}
            </button>
          </div>

          {!volumeAnomalies && !anomalyLoading && (
            <div className="glass" style={{ textAlign: 'center', padding: '50px', color: '#475569' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
              Click "Detect Anomalies" to scan ticket volume & agent workload patterns
            </div>
          )}

          {volumeAnomalies && (
            <div className="glass fade-in-up" style={{ padding: '24px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>📈 Ticket Volume Anomalies (Isolation Forest)</h3>
              {volumeAnomalies.message ? (
                <p style={{ color: '#94A3B8', fontSize: '13px' }}>{volumeAnomalies.message}</p>
              ) : volumeAnomalies.anomalies?.length === 0 ? (
                <p style={{ color: '#6EE7A8', fontSize: '13px' }}>✅ No unusual ticket volume detected in last {volumeAnomalies.period_days} days (avg: {volumeAnomalies.average_daily_tickets}/day)</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {volumeAnomalies.anomalies.map((a: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(225,29,46,0.06)', borderRadius: '10px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#CBD5E1' }}>{a.date}</span>
                      <span style={{ fontSize: '13px', color: a.type === 'spike' ? '#FCA5A5' : '#FCD34D' }}>
                        {a.type === 'spike' ? '📈' : '📉'} {a.ticket_count} tickets ({a.deviation > 0 ? '+' : ''}{a.deviation} vs avg)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {agentOverload && (
            <div className="glass fade-in-up-delay-1" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>👥 Agent Overload Detection</h3>
              {agentOverload.message ? (
                <p style={{ color: '#94A3B8', fontSize: '13px' }}>{agentOverload.message}</p>
              ) : agentOverload.overloaded_agents?.length === 0 ? (
                <p style={{ color: '#6EE7A8', fontSize: '13px' }}>✅ No agent overload detected (avg load: {agentOverload.average_load})</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {agentOverload.overloaded_agents.map((a: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#CBD5E1' }}>Agent {a.agent_id.slice(0, 8)}...</span>
                      <span style={{ fontSize: '13px', color: '#FCD34D' }}>⚠️ {a.open_tickets} open tickets</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== AUTO-ROUTING TAB ===== */}
      {activeTab === 'routing' && (
        <div className="glass fade-in-up" style={{ padding: isMobile ? '20px' : '32px', maxWidth: '600px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>🧭 Smart Agent Routing</h3>
          <p style={{ color: '#475569', fontSize: '13px', marginBottom: '20px' }}>Get an ML-recommended agent for a new ticket based on workload & resolution history</p>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>PRIORITY</label>
              <select className="glass-input" value={routePriority} onChange={e => setRoutePriority(e.target.value)}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>CATEGORY</label>
              <select className="glass-input" value={routeCategory} onChange={e => setRouteCategory(e.target.value)}>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="account">Account</option>
                <option value="feature">Feature Request</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <button className="btn-primary" onClick={runRouting} disabled={routeLoading} style={{ width: 'auto', padding: '10px 24px', marginBottom: '20px' }}>
            {routeLoading ? '⏳ Computing...' : 'Get Recommendation →'}
          </button>

          {routeResult?.error && <p style={{ color: '#FCA5A5', fontSize: '13px' }}>{routeResult.error}</p>}

          {routeResult?.recommended_agent && (
            <div style={{ background: 'rgba(225,29,46,0.08)', border: '1px solid rgba(225,29,46,0.2)', borderRadius: '14px', padding: '20px' }}>
              <p style={{ fontSize: '12px', color: '#FF8A93', fontWeight: '600', marginBottom: '8px' }}>RECOMMENDED AGENT</p>
              <p style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>{routeResult.recommended_agent.agent_name}</p>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <div><span style={{ fontSize: '12px', color: '#64748B' }}>Current Load: </span><span style={{ fontSize: '13px', fontWeight: '600' }}>{routeResult.recommended_agent.current_workload}</span></div>
                <div><span style={{ fontSize: '12px', color: '#64748B' }}>Resolution Rate: </span><span style={{ fontSize: '13px', fontWeight: '600' }}>{Math.round(routeResult.recommended_agent.resolution_rate * 100)}%</span></div>
                <div><span style={{ fontSize: '12px', color: '#64748B' }}>Score: </span><span style={{ fontSize: '13px', fontWeight: '600' }}>{routeResult.recommended_agent.score}</span></div>
              </div>
              <p style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>{routeResult.reasoning}</p>
            </div>
          )}
        </div>
      )}

      {/* ===== RESPONSE TIME TAB ===== */}
      {activeTab === 'response' && (
        <div className="glass fade-in-up" style={{ padding: isMobile ? '20px' : '32px', maxWidth: '600px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>⏱️ Response Time Prediction</h3>
          <p style={{ color: '#475569', fontSize: '13px', marginBottom: '20px' }}>Estimate resolution time using historical patterns (Linear Regression, falls back to SLA heuristics)</p>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>PRIORITY</label>
              <select className="glass-input" value={rtPriority} onChange={e => setRtPriority(e.target.value)}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>CATEGORY</label>
              <select className="glass-input" value={rtCategory} onChange={e => setRtCategory(e.target.value)}>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="account">Account</option>
                <option value="feature">Feature Request</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <button className="btn-primary" onClick={runResponsePrediction} disabled={rtLoading} style={{ width: 'auto', padding: '10px 24px', marginBottom: '20px' }}>
            {rtLoading ? '⏳ Predicting...' : 'Predict Resolution Time →'}
          </button>

          {rtResult && (
            <div style={{ background: 'rgba(225,29,46,0.08)', border: '1px solid rgba(225,29,46,0.2)', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#FF8A93', fontWeight: '600', marginBottom: '8px' }}>ESTIMATED RESOLUTION TIME</p>
              <p style={{ fontSize: '32px', fontWeight: '800' }} className="text-gradient">{rtResult.predicted_resolution_display}</p>
              <p style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}>
                Method: {rtResult.method === 'ml_model' ? '🤖 ML Model' : '📋 SLA Heuristic (insufficient historical data)'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
