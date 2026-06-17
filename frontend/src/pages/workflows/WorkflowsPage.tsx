import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const getToken = () => localStorage.getItem('token') || ''

interface Workflow {
  id: string
  name: string
  description: string
  is_active: boolean
  trigger_type: string
  conditions: any[]
  actions: any[]
  run_count: number
  last_run_at: string | null
}

const TRIGGERS = [
  { value: 'ticket.created', label: '🎫 Ticket Created', icon: '🎫' },
  { value: 'ticket.status_changed', label: '🔄 Status Changed', icon: '🔄' },
  { value: 'ticket.sla_breach', label: '⚠️ SLA Breach', icon: '⚠️' },
  { value: 'customer.churn_high', label: '📉 High Churn Risk', icon: '📉' },
  { value: 'customer.created', label: '👤 Customer Created', icon: '👤' },
]

const FIELDS = ['priority', 'status', 'category', 'agent_id']
const OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
  { value: 'contains', label: 'contains' },
]
const ACTIONS = [
  { value: 'assign_agent', label: '👤 Assign Agent', icon: '👤' },
  { value: 'set_priority', label: '🎯 Set Priority', icon: '🎯' },
  { value: 'send_notification', label: '🔔 Send Notification', icon: '🔔' },
  { value: 'escalate', label: '🚨 Escalate', icon: '🚨' },
  { value: 'add_tag', label: '🏷️ Add Tag', icon: '🏷️' },
]

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [trigger, setTrigger] = useState('ticket.created')
  const [conditions, setConditions] = useState<any[]>([])
  const [actions, setActions] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const fetchWorkflows = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/workflows`, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.status === 401) { window.location.href = '/login'; return }
      const data = await res.json()
      setWorkflows(Array.isArray(data) ? data : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchWorkflows() }, [])

  const handleToggle = async (id: string) => {
    await fetch(`${API}/workflows/${id}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    fetchWorkflows()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow?')) return
    await fetch(`${API}/workflows/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    fetchWorkflows()
  }

  const addCondition = () => setConditions([...conditions, { field: 'priority', op: 'eq', value: '' }])
  const updateCondition = (i: number, key: string, value: string) => {
    const updated = [...conditions]
    updated[i] = { ...updated[i], [key]: value }
    setConditions(updated)
  }
  const removeCondition = (i: number) => setConditions(conditions.filter((_, idx) => idx !== i))

  const addAction = () => setActions([...actions, { type: 'send_notification', params: {} }])
  const updateAction = (i: number, key: string, value: any) => {
    const updated = [...actions]
    if (key === 'type') updated[i] = { ...updated[i], type: value, params: {} }
    else updated[i] = { ...updated[i], params: { ...updated[i].params, [key]: value } }
    setActions(updated)
  }
  const removeAction = (i: number) => setActions(actions.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!name.trim() || actions.length === 0) return
    setSaving(true)
    try {
      await fetch(`${API}/workflows`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, trigger_type: trigger, conditions, actions })
      })
      setShowBuilder(false)
      setName(''); setDescription(''); setConditions([]); setActions([])
      fetchWorkflows()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  return (
    <div>
      {/* Header */}
      <div className="fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>Workflows</h1>
          <p style={{ color: '#475569', fontSize: '14px' }}>{workflows.length} automation workflows</p>
        </div>
        <button className="btn-primary" onClick={() => setShowBuilder(true)}
          style={{ width: 'auto', padding: '10px 20px', fontSize: '14px' }}>
          + New Workflow
        </button>
      </div>

      {/* Workflow List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>Loading...</div>
      ) : workflows.length === 0 ? (
        <div className="glass" style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
          <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No workflows yet</div>
          <div style={{ fontSize: '13px' }}>Create your first automation workflow</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {workflows.map(wf => {
            const triggerInfo = TRIGGERS.find(t => t.value === wf.trigger_type)
            return (
              <div key={wf.id} className="glass fade-in-up" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '600' }}>{wf.name}</span>
                      <span style={{
                        fontSize: '11px', padding: '2px 10px', borderRadius: '20px',
                        background: wf.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                        color: wf.is_active ? '#10B981' : '#94A3B8',
                        border: `1px solid ${wf.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.3)'}`
                      }}>{wf.is_active ? '● Active' : '○ Paused'}</span>
                    </div>
                    {wf.description && <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '12px' }}>{wf.description}</p>}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '12px', padding: '4px 10px', borderRadius: '8px',
                        background: 'rgba(225,29,46,0.1)', color: '#FF8A93', border: '1px solid rgba(225,29,46,0.2)'
                      }}>{triggerInfo?.icon} {triggerInfo?.label.split(' ').slice(1).join(' ')}</span>
                      <span style={{ color: '#475569' }}>→</span>
                      {wf.conditions.length > 0 && (
                        <>
                          <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.2)' }}>
                            IF {wf.conditions.length} condition{wf.conditions.length > 1 ? 's' : ''}
                          </span>
                          <span style={{ color: '#475569' }}>→</span>
                        </>
                      )}
                      {wf.actions.map((a, i) => {
                        const actionInfo = ACTIONS.find(ac => ac.value === a.type)
                        return (
                          <span key={i} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.2)' }}>
                            {actionInfo?.icon} {actionInfo?.label.split(' ').slice(1).join(' ')}
                          </span>
                        )
                      })}
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#475569' }}>
                      Ran {wf.run_count} times {wf.last_run_at && `• Last: ${new Date(wf.last_run_at).toLocaleString('en-IN')}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleToggle(wf.id)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                      {wf.is_active ? 'Pause' : 'Activate'}
                    </button>
                    <button onClick={() => handleDelete(wf.id)}
                      style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#FCA5A5', padding: '6px 14px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Visual Builder Modal */}
      {showBuilder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>⚡ Build Workflow</h2>
              <button onClick={() => setShowBuilder(false)} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Name + Description */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>WORKFLOW NAME *</label>
              <input className="glass-input" placeholder="Auto-assign critical tickets" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: '12px' }} />
              <textarea className="glass-input" placeholder="Optional description..." value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ resize: 'none' }} />
            </div>

            {/* Trigger */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF8A93', fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(225,29,46,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>1</span>
                WHEN (Trigger)
              </label>
              <select className="glass-input" value={trigger} onChange={e => setTrigger(e.target.value)}>
                {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Conditions */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FCD34D', fontSize: '13px', fontWeight: '700' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>2</span>
                  IF (Conditions) — optional
                </label>
                <button onClick={addCondition} style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#FCD34D', padding: '4px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>+ Add</button>
              </div>
              {conditions.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <select className="glass-input" value={c.field} onChange={e => updateCondition(i, 'field', e.target.value)} style={{ flex: 1 }}>
                    {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select className="glass-input" value={c.op} onChange={e => updateCondition(i, 'op', e.target.value)} style={{ flex: 1 }}>
                    {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input className="glass-input" placeholder="value" value={c.value} onChange={e => updateCondition(i, 'value', e.target.value)} style={{ flex: 1 }} />
                  <button onClick={() => removeCondition(i)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '16px', padding: '8px' }}>✕</button>
                </div>
              ))}
              {conditions.length === 0 && <p style={{ color: '#475569', fontSize: '12px' }}>No conditions — workflow always runs on trigger</p>}
            </div>

            {/* Actions */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6EE7B7', fontSize: '13px', fontWeight: '700' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>3</span>
                  THEN (Actions) *
                </label>
                <button onClick={addAction} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#6EE7B7', padding: '4px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>+ Add</button>
              </div>
              {actions.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <select className="glass-input" value={a.type} onChange={e => updateAction(i, 'type', e.target.value)} style={{ flex: 1 }}>
                    {ACTIONS.map(ac => <option key={ac.value} value={ac.value}>{ac.label}</option>)}
                  </select>
                  {a.type === 'set_priority' && (
                    <select className="glass-input" value={a.params.priority || ''} onChange={e => updateAction(i, 'priority', e.target.value)} style={{ flex: 1 }}>
                      <option value="">Select...</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  )}
                  {a.type === 'add_tag' && (
                    <input className="glass-input" placeholder="tag name" value={a.params.tag || ''} onChange={e => updateAction(i, 'tag', e.target.value)} style={{ flex: 1 }} />
                  )}
                  {a.type === 'send_notification' && (
                    <input className="glass-input" placeholder="message" value={a.params.message || ''} onChange={e => updateAction(i, 'message', e.target.value)} style={{ flex: 1 }} />
                  )}
                  <button onClick={() => removeAction(i)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '16px', padding: '8px' }}>✕</button>
                </div>
              ))}
              {actions.length === 0 && <p style={{ color: '#475569', fontSize: '12px' }}>Add at least one action</p>}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => setShowBuilder(false)} style={{ flex: 1, padding: '12px' }}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !name.trim() || actions.length === 0} style={{ flex: 2 }}>
                {saving ? '⏳ Saving...' : '✓ Activate Workflow →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
