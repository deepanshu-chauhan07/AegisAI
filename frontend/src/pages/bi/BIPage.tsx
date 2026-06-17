import { useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const getToken = () => localStorage.getItem('token') || ''

const COLORS = ['#FF6B7A', '#DC2626', '#10B981', '#F59E0B', '#FF8A93', '#38BDF8']

const suggestions = [
  "Show all tickets by priority",
  "How many customers do we have?",
  "Show tickets created this month",
  "List all open tickets",
  "Show customers by plan tier",
]

export default function BIPage() {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<any[]>([])

  const handleQuery = async (q?: string) => {
    const query = q || question
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`${API}/bi/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      })
      if (res.status === 401) { window.location.href = '/login'; return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Query failed')
      setResult(data)
      setHistory(prev => [{ question: query, result: data }, ...prev.slice(0, 9)])
      setQuestion('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderChart = (data: any[], chartType: string, columns: string[]) => {
    if (!data || data.length === 0) return null
    const xKey = columns[0]
    const yKey = columns[1]

    if (chartType === 'pie' && columns.length >= 2) {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey={xKey} tick={{ fill: '#475569', fontSize: 11 }} />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
            {columns.slice(1).map((col, i) => (
              <Line key={col} type="monotone" dataKey={col} stroke={COLORS[i]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={xKey} tick={{ fill: '#475569', fontSize: 11 }} />
          <YAxis tick={{ fill: '#475569', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
          {columns.slice(1).map((col, i) => (
            <Bar key={col} dataKey={col} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', height: 'calc(100vh - 100px)' }}>

      {/* Main Chat Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div className="fade-in-up">
          <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            Generative BI
          </h1>
          <p style={{ color: '#475569', fontSize: '14px' }}>Ask questions about your data in natural language</p>
        </div>

        {/* Query Input */}
        <div className="glass fade-in-up-delay-1" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <textarea
                className="glass-input"
                placeholder="Ask anything... e.g. 'Show all tickets by priority' or 'How many customers do we have?'"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuery() } }}
                rows={2}
                style={{ resize: 'none', marginBottom: 0 }}
              />
            </div>
            <button className="btn-primary" onClick={() => handleQuery()} disabled={loading || !question.trim()}
              style={{ width: 'auto', padding: '12px 24px', whiteSpace: 'nowrap' }}>
              {loading ? '⏳' : '🔍 Ask →'}
            </button>
          </div>

          {/* Suggestions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleQuery(s)}
                style={{
                  padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                  border: '1px solid rgba(225,29,46,0.2)', background: 'rgba(225,29,46,0.08)',
                  color: '#FF8A93', transition: 'all 0.2s'
                }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '12px', padding: '16px', color: '#FCA5A5', fontSize: '14px' }}>
            ❌ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="glass" style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤔</div>
            <p style={{ color: '#94A3B8', fontSize: '14px' }}>Generating SQL and analyzing data...</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Insight */}
            <div className="glass fade-in-up" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '28px', height: '28px', background: 'linear-gradient(135deg, #E11D2E, #FF3B4E)',
                  borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}>🧠</div>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>AI Insight</span>
                <span style={{ fontSize: '12px', color: '#475569', marginLeft: 'auto' }}>{result.total_rows} rows</span>
              </div>
              <p style={{ color: '#CBD5E1', fontSize: '14px', lineHeight: '1.7' }}>{result.insight}</p>
            </div>

            {/* Chart */}
            {result.data && result.data.length > 0 && result.columns.length >= 2 && (
              <div className="glass fade-in-up" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#94A3B8' }}>
                  📊 Visualization
                </h3>
                {renderChart(result.data, result.chart_type, result.columns)}
              </div>
            )}

            {/* Data Table */}
            <div className="glass fade-in-up" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#94A3B8' }}>📋 Raw Data</h3>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '250px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {result.columns.map((col: string) => (
                        <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#475569', fontWeight: '600', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                          {col.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.slice(0, 20).map((row: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {result.columns.map((col: string) => (
                          <td key={col} style={{ padding: '10px 16px', fontSize: '13px', color: '#CBD5E1', whiteSpace: 'nowrap' }}>
                            {String(row[col] ?? '—').slice(0, 50)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SQL */}
            <details>
              <summary style={{ color: '#475569', fontSize: '13px', cursor: 'pointer', padding: '8px 0' }}>
                🔍 View generated SQL
              </summary>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '16px', marginTop: '8px' }}>
                <code style={{ color: '#FF8A93', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>
                  {result.sql}
                </code>
              </div>
            </details>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>Ask your data anything</div>
            <div style={{ fontSize: '13px' }}>Try the suggestions above or type your own question</div>
          </div>
        )}
      </div>

      {/* History Sidebar */}
      <div className="glass" style={{ padding: '20px', height: 'fit-content', position: 'sticky', top: '80px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#94A3B8' }}>
          🕐 Query History
        </h3>
        {history.length === 0 ? (
          <p style={{ color: '#475569', fontSize: '13px' }}>No queries yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map((h, i) => (
              <button key={i} onClick={() => { setResult(h.result); setQuestion(h.question) }}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px', padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
                  color: '#94A3B8', fontSize: '12px', lineHeight: '1.5', transition: 'all 0.2s'
                }}>
                {h.question.slice(0, 60)}{h.question.length > 60 ? '...' : ''}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
