function App() {
  return (
    <div style={{backgroundColor: "#0F172A", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center"}}>
      <div style={{backgroundColor: "#1E293B", padding: "2rem", borderRadius: "12px", textAlign: "center"}}>
        <h1 style={{color: "#0EA5E9", fontSize: "2.5rem", fontWeight: "bold"}}>AegisAI</h1>
        <p style={{color: "#94A3B8"}}>Autonomous Enterprise Customer Intelligence Platform</p>
        <div style={{display: "flex", gap: "0.75rem", justifyContent: "center"}}>
          <span style={{backgroundColor: "#1E3A5F", color: "#F1F5F9", padding: "0.25rem 0.75rem", borderRadius: "24px"}}>React</span>
          <span style={{backgroundColor: "#1E3A5F", color: "#F1F5F9", padding: "0.25rem 0.75rem", borderRadius: "24px"}}>FastAPI</span>
          <span style={{backgroundColor: "#1E3A5F", color: "#F1F5F9", padding: "0.25rem 0.75rem", borderRadius: "24px"}}>Vite</span>
        </div>
      </div>
    </div>
  )
}

export default App
