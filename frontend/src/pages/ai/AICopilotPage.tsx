export default function AICopilotPage() {
  return (
    <div>
      <div className="fade-in-up" style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>
          AI Copilot
        </h1>
        <p style={{ color: '#475569', fontSize: '14px' }}>
          AI assistant available inside each ticket
        </p>
      </div>
      <div className="glass" style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🤖</div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
          AI Copilot is ticket-based
        </h2>
        <p style={{ color: '#475569', fontSize: '14px', marginBottom: '28px' }}>
          Open any ticket and click the <strong style={{color: '#818CF8'}}>🤖 AI</strong> button
        </p>
        <a href="/tickets">
          <button className="btn-primary" style={{ width: 'auto', padding: '12px 28px' }}>
            Go to Tickets →
          </button>
        </a>
      </div>
    </div>
  )
}
