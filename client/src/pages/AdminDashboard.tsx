// src/pages/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import adminDashboardService, {
  AdminDashboardStats,
  SystemHealth,
  AuditLogEntry,
} from '../services/adminDashboardService';
import './AdminDashboard.css';

// ── Helpers ───────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function auditBadgeClass(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('creat') || a.includes('invit') || a.includes('upload')) return 'create';
  if (a.includes('updat') || a.includes('chang') || a.includes('reset') || a.includes('role')) return 'update';
  if (a.includes('delet') || a.includes('deactiv')) return 'delete';
  if (a.includes('login') || a.includes('logout') || a.includes('mfa') || a.includes('auth')) return 'auth';
  return 'default';
}

function auditBadgeLabel(action: string): string {
  const map: Record<string, string> = {
    Created: 'Created', Updated: 'Updated', Deleted: 'Deleted',
    Uploaded: 'Uploaded', Invited: 'Invited', Deactivated: 'Deactivated',
    Reactivated: 'Reactivated', RoleChanged: 'Role', StatusChanged: 'Status',
    Login: 'Login', Logout: 'Logout', MfaEnabled: 'MFA', PasswordReset: 'Reset',
  };
  return map[action] ?? action;
}

function responseSpeedLabel(ms: number): { label: string; color: string } {
  if (ms < 100) return { label: 'Excellent', color: 'var(--green-700)' };
  if (ms < 300) return { label: 'Good',      color: 'var(--green-700)' };
  if (ms < 800) return { label: 'Slow',      color: '#92620A' };
  return              { label: 'Degraded',   color: 'var(--red)' };
}

function SkeletonCard() {
  return (
    <div className="summary-card">
      <div className="skeleton-block" style={{ width: 36, height: 36, borderRadius: 8, marginBottom: 14 }} />
      <div className="skeleton-block" style={{ width: '60%', height: 11, marginBottom: 10 }} />
      <div className="skeleton-block" style={{ width: '40%', height: 28, marginBottom: 8 }} />
      <div className="skeleton-block" style={{ width: '70%', height: 11 }} />
    </div>
  );
}

function HealthIndicator({ online, label }: { online: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: online ? 'var(--green-700)' : 'var(--red)',
        boxShadow: online
          ? '0 0 0 3px rgba(26,92,82,0.15)'
          : '0 0 0 3px rgba(185,28,28,0.15)',
      }} />
      <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{label}</span>
      <span style={{
        fontSize: 11.5, fontWeight: 600,
        color: online ? 'var(--green-700)' : 'var(--red)',
        marginLeft: 'auto',
      }}>
        {online ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}

const ROLE_ORDER = ['Admin', 'Partner', 'Associate', 'Paralegal', 'Client', 'Auditor'];
const GOLD_ROLES = new Set(['Admin', 'Partner']);

function RoleBreakdown({ usersByRole, total }: {
  usersByRole: Record<string, number>; total: number;
}) {
  return (
    <div className="role-list">
      {ROLE_ORDER.map(role => {
        const count = usersByRole[role] ?? 0;
        const pct   = total > 0 ? Math.max((count / total) * 100, count > 0 ? 4 : 0) : 0;
        return (
          <div key={role} className="role-row">
            <div className="role-row-header">
              <span className="role-name">{role}</span>
              <span className="role-count">{count}</span>
            </div>
            <div className="role-bar-track">
              <div
                className={`role-bar-fill ${GOLD_ROLES.has(role) ? 'gold' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats]       = useState<AdminDashboardStats | null>(null);
  const [health, setHealth]     = useState<SystemHealth | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[] | null>(null);
  const [error, setError]       = useState('');

  useEffect(() => {
    adminDashboardService.getStats()
      .then(setStats)
      .catch(() => setError('Failed to load dashboard stats.'));

    adminDashboardService.getHealth()
      .then(setHealth)
      .catch(() => setHealth({
        databaseOnline:   false,
        storageOnline:    false,
        apiResponseMs:    0,
        storageUsedBytes: 0,
        activeSessions:   0,
      }));

    adminDashboardService.getAuditLog()
      .then(setAuditLog)
      .catch(() => setAuditLog([]));
  }, []);

  const firstName = user?.fullName?.split(' ')[0] ?? 'Admin';
  const today = new Date().toLocaleDateString('en-KE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const speedInfo = health ? responseSpeedLabel(health.apiResponseMs) : null;

  return (
    <div className="admin-dashboard">

      <div className="dashboard-heading">
        <h1>{greeting()}, {firstName}.</h1>
        <p>{today} · System Overview</p>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: 20 }}>
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* ── System health strip ── */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '16px 20px',
        marginBottom: 20,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 14,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            System Health
          </span>
          <button
            onClick={() => navigate('/system-health')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'var(--accent)', fontWeight: 500, padding: 0,
            }}
          >
            View details →
          </button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}>
          {!health ? (
            <>
              <div className="skeleton-block" style={{ height: 22 }} />
              <div className="skeleton-block" style={{ height: 22 }} />
              <div className="skeleton-block" style={{ height: 22 }} />
              <div className="skeleton-block" style={{ height: 22 }} />
            </>
          ) : (
            <>
              <HealthIndicator online={health.databaseOnline} label="Database" />
              <HealthIndicator online={health.storageOnline} label="File Storage (S3)" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>API Response</span>
                <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: speedInfo?.color }}>
                  {health.apiResponseMs}ms · {speedInfo?.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
                <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>Storage Used</span>
                <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>
                  {formatBytes(health.storageUsedBytes)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="summary-cards">
        {!stats ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="summary-card gold">
              <div className="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z" />
                </svg>
              </div>
              <div className="card-label">Total Users</div>
              <div className="card-value">{stats.totalUsers}</div>
              <div className="card-sub">{stats.activeUsers} active</div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <div className="card-label">Total Clients</div>
              <div className="card-value">{stats.totalClients}</div>
              <div className="card-sub">registered in system</div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
                </svg>
              </div>
              <div className="card-label">Active Matters</div>
              <div className="card-value">{stats.activeMatters}</div>
              <div className="card-sub">across all clients</div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <div className="card-label">Total Documents</div>
              <div className="card-value">{stats.totalDocuments}</div>
              <div className="card-sub">stored in system</div>
            </div>
          </>
        )}
      </div>

      {/* ── Bottom grid ── */}
      <div className="admin-dashboard-grid">

        <div className="panel">
          <div className="panel-header">
            <h2>Live Audit Log</h2>
            <button
              onClick={() => navigate('/audit-logs')}
              className="panel-header-link"
            >
              Full log →
            </button>
          </div>
          <div className="audit-list">
            {!auditLog ? (
              <div className="empty-state">Loading audit log…</div>
            ) : auditLog.length === 0 ? (
              <div className="empty-state">No audit entries yet.</div>
            ) : (
              auditLog.map((entry, i) => (
                <div key={entry.id}>
                  <div className="audit-item">
                    <span className={`audit-badge ${auditBadgeClass(entry.action)}`}>
                      {auditBadgeLabel(entry.action)}
                    </span>
                    <div className="audit-body">
                      <div className="audit-entity">
                        <strong>{entry.entityName}</strong>
                        {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}…` : ''}
                      </div>
                      <div className="audit-by">by {entry.performedBy}</div>
                    </div>
                    <div className="audit-time">{relativeTime(entry.performedAt)}</div>
                  </div>
                  {i < auditLog.length - 1 && <div className="audit-divider" />}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Users by Role</h2>
            <button
              onClick={() => navigate('/users')}
              className="panel-header-link"
            >
              Manage →
            </button>
          </div>
          {!stats ? (
            <div className="empty-state">Loading…</div>
          ) : (
            <RoleBreakdown
              usersByRole={stats.usersByRole}
              total={stats.totalUsers}
            />
          )}
        </div>

      </div>
    </div>
  );
}