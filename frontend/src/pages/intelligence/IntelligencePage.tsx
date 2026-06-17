import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API = 'http://localhost:8000/api/v1'
const getToken = () => localStorage.getItem('token') || ''

const riskColors: any = { low: '#10B981', medium: '#F59E0B', high: '#F97316', critical: '#DC2626' }

export default function IntelligencePage() {
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [shapResult, setShapResult] = useState<any>(null)
  const [shapLoading, setShapLoading] = useState(false)

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
      await fetch(`${API}/intelligence/churn/batch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      await fetchOverview()
    } catch (err) { console.error(err) }
    finally { setRunning(false) }
  }

  const explainCustomer = async (customer: any) => {
    setSelectedCustomer(customer)
    setShapLoading(true)
    setShapResult(null)
    try {
      const res = await fetch(`${API}/intelligence/churn/${customer.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      setShapResult(data)
    } catch (err) { console.error(err) }
    finally { setShapLoading(false) }
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

  return (
    <div>
      {/* Header */}
      <div className="fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            Predictive Intelligence
          </h1>
          <p style={{ color: '#475569', fontSize: '14px' }}>XGBoost churn prediction with SHAP explainability</p>
        </div>
        <button className="btn-primary" onClick={runPredictions} disabled={running}
          style={{ width: 'auto', padding: '10px 20px', fontSize: '14px' }}>
          {running ? '⏳ Running model...' : '🔮 Run Predictions'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>Loading intelligence data...</div>
      ) : overview && (
        <>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div className="kpi-card fade-in-up">
              <div style={{ fontSize: '30px', fontWeight: '700', color: '#FF6B7A', marginBottom: '4px' }}>{overview.total_customers}</div>
              <div style={{ fontSize: '13px', color: '#94A3B8' }}>Total Customers Analyzed</div>
            </div>
            <div className="kpi-card fade-in-up-delay-1">
              <div style={{ fontSize: '30px', fontWeight: '700', color: '#10B981', marginBottom: '4px' }}>{overview.avg_health_score}</div>
              <div style={{ fontSize: '13px', color: '#94A3B8' }}>Avg Health Score</div>
            </div>
            <div className="kpi-card fade-in-up-delay-2">
              <div style={{ fontSize: '30px', fontWeight: '700', color: '#DC2626', marginBottom: '4px' }}>
                {overview.risk_distribution.high + overview.risk_distribution.critical}
              </div>
              <div style={{ fontSize: '13px', color: '#94A3B8' }}>High/Critical Risk Customers</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>

            {/* Risk Distribution */}
            <div className="glass fade-in-up-delay-1" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>🎯 Churn Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={riskData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                    {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {riskData.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: r.color }} />
                      <span style={{ color: '#94A3B8', textTransform: 'capitalize' }}>{r.name}</span>
                    </div>
                    <span style={{ color: '#F1F5F9', fontWeight: '600' }}>{r.value as number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* High Risk Customers */}
            <div className="glass fade-in-up-delay-2" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>⚠️ At-Risk Customers</h3>
              {overview.high_risk_customers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                  No high-risk customers right now
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {overview.high_risk_customers.map((c: any) => (
                    <div key={c.id} onClick={() => explainCustomer(c)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
                        borderRadius: '10px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)',
                        transition: 'all 0.2s'
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

          {/* SHAP Explanation Panel */}
          {selectedCustomer && (
            <div className="glass fade-in-up" style={{ padding: '24px', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                  🧠 SHAP Explanation — {selectedCustomer.name}
                </h3>
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

                  <p style={{ color: '#94A3B8', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
                    TOP FACTORS DRIVING THIS PREDICTION
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {shapResult.top_factors.map((f: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#CBD5E1', minWidth: '160px' }}>{featureLabels[f.feature] || f.feature}</span>
                        <div style={{ flex: 1, height: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                          <div style={{
                            position: 'absolute', height: '100%',
                            left: f.direction === 'increases_risk' ? '50%' : `${50 - Math.min(Math.abs(f.impact) * 100, 50)}%`,
                            width: `${Math.min(Math.abs(f.impact) * 100, 50)}%`,
                            background: f.direction === 'increases_risk' ? '#DC2626' : '#10B981',
                            borderRadius: '6px'
                          }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: f.direction === 'increases_risk' ? '#FCA5A5' : '#6EE7B7', minWidth: '90px', textAlign: 'right' }}>
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
  )
}
