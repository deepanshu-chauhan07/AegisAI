import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const getToken = () => localStorage.getItem('token') || ''

interface TeamMember {
  id: string
  email: string
  full_name: string
  is_active: boolean
  role: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'team' | 'notifications'>('profile')
  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')

  const [team, setTeam] = useState<TeamMember[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const [notifPrefs, setNotifPrefs] = useState({
    email_on_critical: true,
    email_on_sla_breach: true,
    email_on_assignment: false,
    inapp_all: true,
  })

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.status === 401) { window.location.href = '/login'; return }
      const data = await res.json()
      setProfile(data)
      setFullName(data.full_name)
    } catch (err) { console.error(err) }
  }

  const fetchTeam = async () => {
    setTeamLoading(true)
    try {
      const res = await fetch(`${API}/team`, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) {
        const data = await res.json()
        setTeam(data)
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    } catch (err) { setIsAdmin(false) }
    finally { setTeamLoading(false) }
  }

  useEffect(() => { fetchProfile(); fetchTeam() }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg('')
    try {
      const res = await fetch(`${API}/auth/me`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to update')
      setProfile(data)
      setProfileMsg('✅ Profile updated successfully')
    } catch (err: any) {
      setProfileMsg(`❌ ${err.message}`)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg('')
    if (newPassword !== confirmPassword) {
      setPasswordMsg('❌ New passwords do not match')
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to change password')
      setPasswordMsg('✅ Password changed successfully')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (err: any) {
      setPasswordMsg(`❌ ${err.message}`)
    } finally {
      setChangingPassword(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    await fetch(`${API}/team/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_name: newRole })
    })
    fetchTeam()
  }

  const handleToggleActive = async (userId: string) => {
    await fetch(`${API}/team/${userId}/toggle-active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    fetchTeam()
  }

  const tabs = [
    { key: 'profile', label: '👤 Profile' },
    { key: 'security', label: '🔒 Security' },
    ...(isAdmin ? [{ key: 'team', label: '👥 Team' }] : []),
    { key: 'notifications', label: '🔔 Notifications' },
  ]

  return (
    <div>
      <div className="fade-in-up" style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>Settings</h1>
        <p style={{ color: '#475569', fontSize: '14px' }}>Manage your account, security, and team</p>
      </div>

      <div className="fade-in-up-delay-1" style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '8px 18px', borderRadius: '20px', fontSize: '14px', cursor: 'pointer',
              border: activeTab === tab.key ? '1px solid rgba(225,29,46,0.5)' : '1px solid rgba(255,255,255,0.08)',
              background: activeTab === tab.key ? 'rgba(225,29,46,0.15)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.key ? '#FF8A93' : '#64748B',
              transition: 'all 0.2s', fontWeight: activeTab === tab.key ? '600' : '400'
            }}>{tab.label}</button>
        ))}
      </div>

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="glass fade-in-up-delay-2" style={{ padding: '32px', maxWidth: '520px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Profile Information</h3>
          <form onSubmit={handleSaveProfile}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>FULL NAME</label>
              <input className="glass-input" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>EMAIL</label>
              <input className="glass-input" value={profile?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              <p style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>Email cannot be changed</p>
            </div>
            <button className="btn-primary" type="submit" disabled={savingProfile} style={{ width: 'auto', padding: '10px 24px' }}>
              {savingProfile ? '⏳ Saving...' : 'Save Changes →'}
            </button>
            {profileMsg && <p style={{ marginTop: '12px', fontSize: '13px', color: profileMsg.startsWith('✅') ? '#6EE7A8' : '#FCA5A5' }}>{profileMsg}</p>}
          </form>
        </div>
      )}

      {/* SECURITY TAB */}
      {activeTab === 'security' && (
        <div className="glass fade-in-up-delay-2" style={{ padding: '32px', maxWidth: '520px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Change Password</h3>
          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>CURRENT PASSWORD</label>
              <input type="password" className="glass-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>NEW PASSWORD</label>
              <input type="password" className="glass-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              <p style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>8+ chars, uppercase, lowercase, number, special character</p>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>CONFIRM NEW PASSWORD</label>
              <input type="password" className="glass-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            <button className="btn-primary" type="submit" disabled={changingPassword} style={{ width: 'auto', padding: '10px 24px' }}>
              {changingPassword ? '⏳ Updating...' : 'Update Password →'}
            </button>
            {passwordMsg && <p style={{ marginTop: '12px', fontSize: '13px', color: passwordMsg.startsWith('✅') ? '#6EE7A8' : '#FCA5A5' }}>{passwordMsg}</p>}
          </form>
        </div>
      )}

      {/* TEAM TAB */}
      {activeTab === 'team' && isAdmin && (
        <div className="glass fade-in-up-delay-2" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Team Members ({team.length})</h3>
          </div>
          {teamLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>Loading...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {team.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px 20px', fontSize: '14px', whiteSpace: 'nowrap' }}>{m.full_name}</td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#94A3B8', whiteSpace: 'nowrap' }}>{m.email}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <select className="glass-input" value={m.role} onChange={e => handleRoleChange(m.id, e.target.value)}
                          style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}>
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="agent">Agent</option>
                          <option value="customer">Customer</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                          background: m.is_active ? 'rgba(34,197,94,0.14)' : 'rgba(100,116,139,0.14)',
                          color: m.is_active ? '#6EE7A8' : '#94A3B8',
                          border: `1px solid ${m.is_active ? 'rgba(34,197,94,0.3)' : 'rgba(100,116,139,0.3)'}`
                        }}>{m.is_active ? '● Active' : '○ Inactive'}</span>
                      </td>
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleToggleActive(m.id)} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px' }}>
                          {m.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <div className="glass fade-in-up-delay-2" style={{ padding: '32px', maxWidth: '520px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Notification Preferences</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { key: 'email_on_critical', label: 'Email me on critical tickets' },
              { key: 'email_on_sla_breach', label: 'Email me on SLA breaches' },
              { key: 'email_on_assignment', label: 'Email me when assigned a ticket' },
              { key: 'inapp_all', label: 'Show in-app notifications' },
            ].map(pref => (
              <div key={pref.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                <span style={{ fontSize: '14px', color: '#CBD5E1' }}>{pref.label}</span>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                  <input type="checkbox" checked={(notifPrefs as any)[pref.key]}
                    onChange={e => setNotifPrefs({ ...notifPrefs, [pref.key]: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', inset: 0,
                    background: (notifPrefs as any)[pref.key] ? 'linear-gradient(135deg, #E11D2E, #FF3B4E)' : 'rgba(255,255,255,0.1)',
                    borderRadius: '24px', transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute', height: '18px', width: '18px', left: (notifPrefs as any)[pref.key] ? '23px' : '3px',
                      top: '3px', background: 'white', borderRadius: '50%', transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: '#475569', marginTop: '16px' }}>
            These preferences are saved locally for this demo. Backend persistence coming soon.
          </p>
        </div>
      )}
    </div>
  )
}
