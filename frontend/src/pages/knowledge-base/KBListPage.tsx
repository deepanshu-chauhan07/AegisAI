import { useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const getToken = () => localStorage.getItem('token') || ''

export default function KBListPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'ask' | 'upload'>('ask')

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setAnswer('')
    setCitations([])
    try {
      const res = await fetch(`${API}/kb/ask`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      const data = await res.json()
      setAnswer(data.answer)
      setCitations(data.citations || [])
    } catch (err) {
      setAnswer('Error searching knowledge base')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API}/kb/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      })
      const data = await res.json()
      setUploadResult(data)
    } catch (err) {
      setUploadResult({ error: 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fade-in-up" style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>
          Knowledge Base
        </h1>
        <p style={{ color: '#475569', fontSize: '14px' }}>Upload documents and ask AI questions</p>
      </div>

      {/* Tabs */}
      <div className="fade-in-up-delay-1" style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { key: 'ask', label: '🤖 Ask AI', },
          { key: 'upload', label: '📤 Upload Document' }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '8px 20px', borderRadius: '20px', fontSize: '14px', cursor: 'pointer',
              border: activeTab === tab.key ? '1px solid rgba(225,29,46,0.5)' : '1px solid rgba(255,255,255,0.08)',
              background: activeTab === tab.key ? 'rgba(225,29,46,0.15)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.key ? '#FF8A93' : '#64748B',
              transition: 'all 0.2s', fontWeight: activeTab === tab.key ? '600' : '400'
            }}>{tab.label}</button>
        ))}
      </div>

      {/* Ask AI Tab */}
      {activeTab === 'ask' && (
        <div className="fade-in-up-delay-2">
          <div className="glass" style={{ padding: '32px', marginBottom: '20px' }}>
            <form onSubmit={handleAsk}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', fontWeight: '600', marginBottom: '10px', letterSpacing: '0.5px' }}>
                  ASK A QUESTION
                </label>
                <textarea
                  className="glass-input"
                  placeholder="What is our refund policy? How do I reset my password? ..."
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  rows={3}
                  style={{ resize: 'none', marginBottom: '12px' }}
                />
                <button className="btn-primary" type="submit" disabled={loading || !question.trim()}
                  style={{ width: 'auto', padding: '10px 24px', fontSize: '14px' }}>
                  {loading ? '🔍 Searching...' : '🤖 Ask AI →'}
                </button>
              </div>
            </form>
          </div>

          {/* Answer */}
          {answer && (
            <div className="glass fade-in-up" style={{ padding: '28px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{
                  width: '32px', height: '32px',
                  background: 'linear-gradient(135deg, #E11D2E, #FF3B4E)',
                  borderRadius: '8px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '16px'
                }}>🤖</div>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>AI Answer</span>
              </div>
              <p style={{ color: '#CBD5E1', fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {answer}
              </p>

              {/* Citations */}
              {citations.length > 0 && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ color: '#475569', fontSize: '12px', fontWeight: '600', marginBottom: '12px', letterSpacing: '0.5px' }}>
                    SOURCES ({citations.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {citations.map((c, i) => (
                      <div key={i} style={{
                        background: 'rgba(225,29,46,0.08)', border: '1px solid rgba(225,29,46,0.15)',
                        borderRadius: '10px', padding: '12px 16px'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#FF8A93', marginBottom: '4px' }}>
                          📄 {c.doc_title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          Relevance: {Math.round(c.score * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!answer && !loading && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>Ask anything</div>
              <div style={{ fontSize: '13px' }}>Upload documents first, then ask questions about them</div>
            </div>
          )}
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="fade-in-up-delay-2">
          <div className="glass" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Upload Document</h3>
            <p style={{ color: '#475569', fontSize: '13px', marginBottom: '24px' }}>
              Supported: PDF, DOCX, TXT, MD — Max 50MB
            </p>

            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '48px', border: '2px dashed rgba(225,29,46,0.3)',
              borderRadius: '16px', cursor: 'pointer',
              background: 'rgba(225,29,46,0.04)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
                {uploading ? '⏳ Processing...' : 'Click to upload document'}
              </div>
              <div style={{ fontSize: '13px', color: '#475569' }}>PDF, DOCX, TXT, MD</div>
              <input type="file" accept=".pdf,.docx,.txt,.md"
                onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>

            {uploadResult && (
              <div style={{
                marginTop: '20px',
                background: uploadResult.error ? 'rgba(220,38,38,0.1)' : 'rgba(16,185,129,0.1)',
                border: `1px solid ${uploadResult.error ? 'rgba(220,38,38,0.3)' : 'rgba(16,185,129,0.3)'}`,
                borderRadius: '12px', padding: '16px'
              }}>
                {uploadResult.error ? (
                  <p style={{ color: '#FCA5A5', fontSize: '14px' }}>❌ {uploadResult.error}</p>
                ) : (
                  <div>
                    <p style={{ color: '#6EE7B7', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                      ✅ Document indexed successfully!
                    </p>
                    <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                      Title: {uploadResult.data?.title} • Chunks: {uploadResult.data?.chunk_count}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
