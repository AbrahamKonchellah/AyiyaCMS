// src/layouts/AppShell.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { getNavSections, UserRole } from '../config/navConfig';
import calendarService, { NotificationDto } from '../services/calendarService';
import TourOverlay from '../components/tour/TourOverlay';
import FirstLoginModal from '../components/tour/FirstLoginModal';
import { useTour } from '../hooks/useTour';
import { getTourSteps } from '../config/tourSteps';
import './AppShell.css';

// ── Helpers ────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('');
}

function pageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/dashboard':   'Dashboard',
    '/clients':     'Clients',
    '/matters':     'Matters',
    '/documents':   'Documents',
    '/calendar':    'Calendar',
    '/billing':     'Billing',
    '/reports':     'Reports',
    '/audit-logs':  'Audit Log',
    '/users':       'User Management',
    '/my-cases':    'My Cases',
    '/my-invoices': 'My Invoices',
  };
  return map[pathname] ?? 'AyiyaCMS';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function LogoMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0B2B26" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75
           M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0
           c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202
           a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352
           c-.483-.174-.711-.703-.59-1.202L18.75 4.97Zm-16.5.52
           c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202
           a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352
           c-.483-.174-.711-.703-.59-1.202L5.25 5.49Z" />
    </svg>
  );
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [notifLoading, setNotifLoading]   = useState(false);

  const menuRef  = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const role        = (user?.role ?? 'Associate') as UserRole;
  const navSections = getNavSections(role);
  const userInitials = initials(user?.fullName ?? 'User');
  const tourSteps = getTourSteps(role);
  const { isActive, hasCompleted, start: startTour, next, back, end, state: tourState } = useTour(tourSteps, user?.id ?? '');
  const [showWelcome, setShowWelcome] = useState(!hasCompleted());
  const handleStartTour = () => { setShowWelcome(false); startTour(); };
  const handleDismissWelcome = () => { setShowWelcome(false); localStorage.setItem(`ayiyacms_tour_done_${user?.id}`, 'true'); };

  // ── Poll unread count every 60s ───────────────────────
  const refreshCount = useCallback(async () => {
    try {
      const count = await calendarService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Non-fatal — bell just stays at 0
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 60_000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  // ── Load notifications when bell is opened ────────────
  const openNotifications = async () => {
    setNotifOpen(o => {
      if (o) return false; // toggle off
      return true;
    });
    if (!notifOpen) {
      setNotifLoading(true);
      try {
        const data = await calendarService.getNotifications();
        setNotifications(data);
      } catch {
        // show empty state
      } finally {
        setNotifLoading(false);
      }
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await calendarService.markRead(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await calendarService.markAllRead();
      setNotifications([]);
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  // ── Close dropdowns on outside click ─────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Close sidebar on route change (mobile) ────────────
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="shell">

      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <a href="/dashboard" className="sidebar-logo">
          <div className="sidebar-logo-mark"><LogoMark /></div>
          <span className="sidebar-logo-name">AyiyaCMS</span>
        </a>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navSections.map((section, si) => (
            <div key={si}>
              {section.section && (
                <div className="nav-section-label">{section.section}</div>
              )}
              {section.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <NavIcon d={item.icon} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-inner" onClick={() => setMenuOpen(o => !o)}>
            <div className="avatar">{userInitials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.fullName ?? 'User'}</div>
              <div className="sidebar-user-role">{role}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.35)" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
            </svg>
          </div>
        </div>
      </aside>

      {/* ── Top bar ── */}
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="topbar-hamburger"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="topbar-title">{pageTitle(location.pathname)}</span>
        </div>

        <div className="topbar-right">

          {/* ── Notification bell ── */}
          <div className="notif-wrap" ref={notifRef}>
            <button
              className="topbar-btn"
              aria-label="Notifications"
              onClick={openNotifications}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {notifOpen && (
              <div className="notif-dropdown">
                <div className="notif-dropdown-header">
                  <span>Notifications</span>
                  {notifications.length > 0 && (
                    <button className="btn-ghost" style={{ fontSize: 11 }} onClick={handleMarkAllRead}>
                      Mark all read
                    </button>
                  )}
                </div>

                {notifLoading ? (
                  <div className="notif-loading">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="skeleton-block" style={{ height: 48, margin: '8px 12px', borderRadius: 4 }} />
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="notif-empty">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    <p>No unread notifications</p>
                  </div>
                ) : (
                  <div className="notif-list">
                    {notifications.map(n => (
                      <div key={n.id} className="notif-item">
                        <div className="notif-item-content">
                          <div className="notif-item-message">{n.message}</div>
                          <div className="notif-item-time">{timeAgo(n.remindAt)}</div>
                        </div>
                        <button
                          className="notif-dismiss"
                          onClick={() => handleMarkRead(n.id)}
                          title="Dismiss"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── User menu ── */}
          <div className="topbar-menu" ref={menuRef}>
            <div
              className="topbar-avatar"
              onClick={() => setMenuOpen(o => !o)}
              role="button"
              aria-label="User menu"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setMenuOpen(o => !o)}
            >
              {userInitials}
            </div>

            {menuOpen && (
              <div className="topbar-dropdown">
                <div className="topbar-dropdown-header">
                  <div className="topbar-dropdown-name">{user?.fullName ?? 'User'}</div>
                  <div className="topbar-dropdown-email">{user?.email ?? ''}</div>
                </div>

                <button
                  className="topbar-dropdown-item"
                  onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  Settings
                </button>

                <button className="topbar-dropdown-item danger" onClick={handleLogout}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="shell-main">
        <Outlet />
      </main>

      {showWelcome && user && (
        <FirstLoginModal
          role={role}
          userName={user.fullName}
          onStartTour={handleStartTour}
          onDismiss={handleDismissWelcome}
        />
      )}

      {isActive && (
        <TourOverlay state={tourState} onNext={next} onBack={back} onSkip={end} />
      )}

      {/* Persistent ? button */}
      <button
        className="tour-help-btn"
        onClick={() => { setShowWelcome(false); startTour(); }}
        title="Start guided tour"
        aria-label="Help tour"
      >
        ?
      </button>
    </div>
  );
}