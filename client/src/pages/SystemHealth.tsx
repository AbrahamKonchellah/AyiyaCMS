// src/pages/SystemHealth.tsx
import { useState, useEffect, useCallback } from 'react';
import adminDashboardService, { SystemHealth } from '../services/adminDashboardService';
import './AdminDashboard.css';
import './SystemHealth.css';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function responseSpeedLabel(ms: number): { label: string; color: string } {
  if (ms < 100) return { label: 'Excellent', color: 'var(--green-700)' };
  if (ms < 300) return { label: 'Good',      color: 'var(--green-700)' };
  if (ms < 800) return { label: 'Slow',      color: '#92620A' };
  return              { label: 'Degraded',   color: 'var(--red)'       };
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <div style={{
      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
      background: online ? 'var(--green-700)' : 'var(--red)',
      boxShadow: online
        ? '0 0 0 3px rgba(26,92,82,0.15)'
        : '0 0 0 3px rgba(185,28,28,0.15)',
    }} />
  );
}

function HealthCard({
  icon, label, value, sub, status, refreshing,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  status?: 'ok' | 'warn' | 'error';
  refreshing?: boolean;
}) {
  const statusColor = status === 'ok' ? 'var(--green-700)'
    : status === 'warn' ? '#92620A'
    : status === 'error' ? 'var(--red)'
    : 'var(--text)';

  return (
    <div className={`sh-card ${refreshing ? 'sh-card-refreshing' : ''}`}>
      <div className="sh-card-icon">{icon}</div>
      <div className="sh-card-label">{label}</div>
      <div className="sh-card-value" style={{ color: statusColor }}>{value}</div>
      {sub && <div className="sh-card-sub">{sub}</div>}
    </div>
  );
}

export default function SystemHealthPage() {
  const [health, setHealth]       = useState<SystemHealth | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError]         = useState('');

  const fetchHealth = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await adminDashboardService.getHealth();
      setHealth(data);
      setLastChecked(new Date());
      setError('');
    } catch {
      setError('Failed to fetch system health. The API may be unreachable.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + auto-refresh every 30 seconds
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(() => fetchHealth(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const speed = health ? responseSpeedLabel(health.apiResponseMs) : null;

  return (
    <div className="admin-dashboard">

      <div className="dashboard-heading">
        <div>
          <h1>System Health</h1>
          <p>
            Live monitoring · auto-refreshes every 30 seconds
            {lastChecked && (
              <span style={{ marginLeft: 8, color: 'var(--text-soft)' }}>
                · Last checked {lastChecked.toLocaleTimeString('en-KE')}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
          className="sh-refresh-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: refreshing ? 'rotate(360deg)' : 'none', transition: refreshing ? 'transform 1s linear' : 'none' }}>
            <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: 20 }}>
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* ── Status cards ── */}
      {loading ? (
        <div className="sh-grid">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="sh-card">
              <div className="skeleton-block" style={{ width: 36, height: 36, borderRadius: 8, marginBottom: 14 }} />
              <div className="skeleton-block" style={{ width: '60%', height: 11, marginBottom: 10 }} />
              <div className="skeleton-block" style={{ width: '40%', height: 28 }} />
            </div>
          ))}
        </div>
      ) : health && (
        <div className="sh-grid">

          <HealthCard
            refreshing={refreshing}
            icon={<StatusDot online={health.databaseOnline} />}
            label="Database"
            value={health.databaseOnline ? 'Online' : 'Offline'}
            sub="Supabase PostgreSQL via Npgsql"
            status={health.databaseOnline ? 'ok' : 'error'}
          />

          <HealthCard
            refreshing={refreshing}
            icon={<StatusDot online={health.storageOnline} />}
            label="File Storage"
            value={health.storageOnline ? 'Online' : 'Offline'}
            sub="Supabase S3-compatible storage"
            status={health.storageOnline ? 'ok' : 'error'}
          />

          <HealthCard
            refreshing={refreshing}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
            label="API Response Time"
            value={`${health.apiResponseMs}ms`}
            sub={speed?.label}
            status={
              health.apiResponseMs < 300 ? 'ok'
              : health.apiResponseMs < 800 ? 'warn'
              : 'error'
            }
          />

          <HealthCard
            refreshing={refreshing}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            }
            label="Storage Used"
            value={formatBytes(health.storageUsedBytes)}
            sub="across all uploaded documents"
            status="ok"
          />

          <HealthCard
            refreshing={refreshing}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z" />
              </svg>
            }
            label="Active Sessions"
            value={String(health.activeSessions)}
            sub="users with valid refresh tokens"
            status="ok"
          />

        </div>
      )}

      {/* ── Service status detail ── */}
      {health && (
        <div className="sh-section">
          <h2 className="sh-section-title">Service Status</h2>
          <div className="sh-service-list">

            <div className="sh-service-row">
              <div className="sh-service-left">
                <StatusDot online={health.databaseOnline} />
                <div>
                  <div className="sh-service-name">PostgreSQL Database</div>
                  <div className="sh-service-detail">Supabase · aws-0-eu-west-1 · Port 6543 (PgBouncer)</div>
                </div>
              </div>
              <span className={`sh-status-badge ${health.databaseOnline ? 'ok' : 'error'}`}>
                {health.databaseOnline ? 'Operational' : 'Down'}
              </span>
            </div>

            <div className="sh-service-row">
              <div className="sh-service-left">
                <StatusDot online={health.storageOnline} />
                <div>
                  <div className="sh-service-name">File Storage (S3)</div>
                  <div className="sh-service-detail">Supabase Storage · S3-compatible · ayiyacms-documents</div>
                </div>
              </div>
              <span className={`sh-status-badge ${health.storageOnline ? 'ok' : 'error'}`}>
                {health.storageOnline ? 'Operational' : 'Down'}
              </span>
            </div>

            <div className="sh-service-row">
              <div className="sh-service-left">
                <StatusDot online />
                <div>
                  <div className="sh-service-name">API Server</div>
                  <div className="sh-service-detail">ASP.NET Core · localhost:5295 · {health.apiResponseMs}ms response</div>
                </div>
              </div>
              <span className={`sh-status-badge ${health.apiResponseMs < 800 ? 'ok' : 'warn'}`}>
                {health.apiResponseMs < 300 ? 'Operational' : health.apiResponseMs < 800 ? 'Slow' : 'Degraded'}
              </span>
            </div>

            <div className="sh-service-row">
              <div className="sh-service-left">
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: '#92620A',
                  boxShadow: '0 0 0 3px rgba(146,98,10,0.15)',
                }} />
                <div>
                  <div className="sh-service-name">Meilisearch</div>
                  <div className="sh-service-detail">Full-text search · Docker · localhost:7700</div>
                </div>
              </div>
              <span className="sh-status-badge warn">Not monitored</span>
            </div>

          </div>
        </div>
      )}

      {/* ── Error tracking placeholder ── */}
      <div className="sh-section">
        <h2 className="sh-section-title">Error Tracking</h2>
        <div className="sh-sentry-card">
          <div className="sh-sentry-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <div className="sh-sentry-title">Sentry Error Monitoring</div>
              <div className="sh-sentry-detail">
                Sentry is not yet configured for this project. Once integrated, recent application errors and stack traces will appear here.
              </div>
            </div>
          </div>
          <a
            href="https://sentry.io"
            target="_blank"
            rel="noopener noreferrer"
            className="sh-sentry-link"
          >
            Set up Sentry →
          </a>
        </div>
      </div>

    </div>
  );
}