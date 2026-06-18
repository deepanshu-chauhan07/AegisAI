import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'

const navItems = [
  { icon: '⊞', label: 'Dashboard', path: '/dashboard' },
  { icon: '👥', label: 'Customers', path: '/customers' },
  { icon: '🎫', label: 'Tickets', path: '/tickets' },
  { icon: '📚', label: 'Knowledge Base', path: '/knowledge-base' },
  { icon: '🤖', label: 'AI Copilot', path: '/copilot' },
  { icon: '📊', label: 'Analytics', path: '/analytics' },
  { icon: '💬', label: 'Generative BI', path: '/bi' },
  { icon: '⚡', label: 'Workflows', path: '/workflows' },
  { icon: '🧠', label: 'Intelligence', path: '/intelligence' },
]

const bottomItems = [
  { icon: '⚙️', label: 'Settings', path: '/settings' },
]

// Mobile bottom bar: 4 primary items + a "More" sheet for everything else
const mobilePrimaryItems = navItems.slice(0, 4)
const mobileMoreItems = [...navItems.slice(4), ...bottomItems]

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const getToken = () => localStorage.getItem('token') || ''

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showMoreSheet, setShowMoreSheet] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()
  const isMobile = useIsMobile()

  const fetchNotifications = async () => {
    try {
      const headers = { Authorization: `Bearer ${getToken()}` }
      const [notifRes, countRes] = await Promise.all([
        fetch(`${API}/notifications`, { headers }),
        fetch(`${API}/notifications/unread-count`, { headers })
      ])
      if (notifRes.ok) setNotifications(await notifRes.json())
      if (countRes.ok) {
        const data = await countRes.json()
        setUnreadCount(data.unread_count)
      }
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [])

  const markAllRead = async () => {
    await fetch(`${API}/notifications/read-all`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` } })
    fetchNotifications()
  }

  const markOneRead = async (id: string) => {
    await fetch(`${API}/notifications/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` } })
    fetchNotifications()
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  const timeAgo = (d: string) => {
    const diff = (Date.now() - new Date(d).getTime()) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
    return `${Math.floor(diff/86400)}d ago`
  }

  const currentLabel = navItems.find(n => n.path === location.pathname)?.label
    || bottomItems.find(n => n.path === location.pathname)?.label
    || 'Dashboard'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#050001' }}>
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* ===== DESKTOP SIDEBAR ===== */}
      {!isMobile && (
        <div className="glass-sidebar" style={{
          width: collapsed ? '72px' : '240px', transition: 'width 0.3s ease',
          display: 'flex', flexDirection: 'column', padding: '20px 12px',
          position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 8px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
            <div style={{
              width: '36px', height: '36px', minWidth: '36px',
              background: 'linear-gradient(135deg, #E11D2E, #FF3B4E)',
              borderRadius: '10px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '18px', boxShadow: '0 4px 15px rgba(225,29,46,0.3)'
            }}>🛡️</div>
            {!collapsed && (
              <div>
                <div className="text-gradient" style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '-0.3px' }}>AegisAI</div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>Enterprise Platform</div>
              </div>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
            {navItems.map(item => (
              <Link key={item.path} to={item.path} className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start' }} title={collapsed ? item.label : ''}>
                <span style={{ fontSize: '16px', minWidth: '20px', textAlign: 'center' }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {bottomItems.map(item => (
              <Link key={item.path} to={item.path} className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
            <button onClick={handleLogout} className="nav-item"
              style={{ border: 'none', background: 'none', justifyContent: collapsed ? 'center' : 'flex-start', width: '100%', color: '#FF6B7A' }}>
              <span style={{ fontSize: '16px' }}>🚪</span>
              {!collapsed && <span>Logout</span>}
            </button>
            <button onClick={() => setCollapsed(!collapsed)} className="nav-item"
              style={{ border: 'none', background: 'none', justifyContent: collapsed ? 'center' : 'flex-start', width: '100%' }}>
              <span style={{ fontSize: '16px' }}>{collapsed ? '→' : '←'}</span>
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <div style={{
        marginLeft: !isMobile ? (collapsed ? '72px' : '240px') : 0,
        transition: 'margin-left 0.3s ease', flex: 1, display: 'flex', flexDirection: 'column',
        width: '100%', minWidth: 0
      }}>

        {/* Header */}
        <div style={{
          height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '0 16px' : '0 24px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(5,0,1,0.7)', backdropFilter: 'blur(20px)',
          position: 'sticky', top: 0, zIndex: 50
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isMobile && (
              <div style={{
                width: '28px', height: '28px',
                background: 'linear-gradient(135deg, #E11D2E, #FF3B4E)',
                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
              }}>🛡️</div>
            )}
            <div style={{ color: '#94A3B8', fontSize: '14px', fontWeight: isMobile ? '600' : '400' }}>
              {currentLabel}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifs(!showNotifs)} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', position: 'relative'
              }}>
                🔔
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-4px',
                    background: '#E11D2E', color: 'white', fontSize: '10px', fontWeight: '700',
                    borderRadius: '10px', minWidth: '18px', height: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px'
                  }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {showNotifs && (
                <div className="glass-strong" style={{
                  position: 'fixed',
                  top: isMobile ? '56px' : '46px',
                  right: isMobile ? '12px' : 'auto',
                  left: isMobile ? '12px' : 'auto',
                  width: isMobile ? 'auto' : '340px',
                  maxHeight: '420px', overflowY: 'auto', zIndex: 200, padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#FF6B7A', fontSize: '12px', cursor: 'pointer' }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p style={{ color: '#475569', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No notifications yet</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {notifications.map(n => (
                        <div key={n.id} onClick={() => !n.read_at && markOneRead(n.id)} style={{
                          background: n.read_at ? 'rgba(255,255,255,0.02)' : 'rgba(225,29,46,0.08)',
                          border: `1px solid ${n.read_at ? 'rgba(255,255,255,0.04)' : 'rgba(225,29,46,0.15)'}`,
                          borderRadius: '10px', padding: '12px', cursor: n.read_at ? 'default' : 'pointer'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: n.read_at ? '#94A3B8' : '#F1F5F9' }}>{n.title}</span>
                            {!n.read_at && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF6B7A', marginTop: '4px' }} />}
                          </div>
                          <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>{n.message}</p>
                          <span style={{ fontSize: '11px', color: '#475569' }}>{timeAgo(n.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <div style={{
              width: '36px', height: '36px', background: 'linear-gradient(135deg, #E11D2E, #FF3B4E)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer'
            }}>D</div>
          </div>
        </div>

        <div style={{
          flex: 1,
          padding: isMobile ? '16px 16px 88px' : '24px',
          position: 'relative', zIndex: 1
        }} onClick={() => { if (showNotifs) setShowNotifs(false) }}>
          <Outlet />
        </div>
      </div>

      {/* ===== MOBILE BOTTOM TAB BAR ===== */}
      {isMobile && (
        <>
          <div className="glass-sidebar" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, height: '64px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-around',
            zIndex: 150, borderTop: '1px solid rgba(225,29,46,0.12)', borderRight: 'none'
          }}>
            {mobilePrimaryItems.map(item => {
              const isActive = location.pathname === item.path
              return (
                <Link key={item.path} to={item.path} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                  textDecoration: 'none', color: isActive ? '#FF8A93' : '#707A8D',
                  fontSize: '11px', flex: 1, padding: '6px 0', position: 'relative'
                }}>
                  {isActive && (
                    <span style={{
                      position: 'absolute', top: 0, width: '28px', height: '3px',
                      background: 'linear-gradient(90deg, #E11D2E, #FF3B4E)',
                      borderRadius: '0 0 4px 4px', boxShadow: '0 0 8px rgba(255,59,78,0.5)'
                    }} />
                  )}
                  <span style={{ fontSize: '19px' }}>{item.icon}</span>
                  <span style={{ fontWeight: isActive ? '600' : '400' }}>{item.label.split(' ')[0]}</span>
                </Link>
              )
            })}
            <button onClick={() => setShowMoreSheet(true)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              background: 'none', border: 'none', color: '#707A8D', fontSize: '11px', flex: 1, padding: '6px 0'
            }}>
              <span style={{ fontSize: '19px' }}>☰</span>
              <span>More</span>
            </button>
          </div>

          {/* More Sheet */}
          {showMoreSheet && (
            <div onClick={() => setShowMoreSheet(false)} style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              zIndex: 300, display: 'flex', alignItems: 'flex-end'
            }}>
              <div onClick={e => e.stopPropagation()} className="glass-strong" style={{
                width: '100%', borderRadius: '20px 20px 0 0', padding: '20px 16px 28px',
                maxHeight: '70vh', overflowY: 'auto'
              }}>
                <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '4px', margin: '0 auto 16px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                  {mobileMoreItems.map(item => (
                    <Link key={item.path} to={item.path} onClick={() => setShowMoreSheet(false)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                      textDecoration: 'none', color: location.pathname === item.path ? '#FF8A93' : '#CBD5E1',
                      background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '16px 8px',
                      border: location.pathname === item.path ? '1px solid rgba(225,29,46,0.3)' : '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <span style={{ fontSize: '24px' }}>{item.icon}</span>
                      <span style={{ fontSize: '12px', textAlign: 'center' }}>{item.label}</span>
                    </Link>
                  ))}
                </div>
                <button onClick={handleLogout} style={{
                  width: '100%', marginTop: '8px', padding: '14px', borderRadius: '12px',
                  background: 'rgba(225,29,46,0.1)', border: '1px solid rgba(225,29,46,0.25)',
                  color: '#FF8A93', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                }}>🚪 Logout</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
