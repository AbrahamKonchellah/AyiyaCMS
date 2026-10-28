// src/pages/StaffDashboard.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import dashboardService, {
  DashboardStats,
  ActivityItem,
  DeadlineItem,
} from '../services/dashboardService';
import './StaffDashboard.css';

// ── Helpers ───────────────────────────────────────────
function formatKes(amount: number): string {
  return 'KES ' + amount.toLocaleString('en-KE', { minimumFractionDigits: 0 });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function deadlineUrgency(iso: string): 'today' | 'tomorrow' | 'soon' {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d     = new Date(iso); d.setHours(0, 0, 0, 0);
  const diff  = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff <= 0)  return 'today';
  if (diff === 1) return 'tomorrow';
  return 'soon';
}

function deadlineDayLabel(urgency: string, iso: string): string {
  if (urgency === 'today')    return 'Today';
  if (urgency === 'tomorrow') return 'Tomorrow';
  return new Date(iso).toLocaleDateString('en-KE', { weekday: 'short' });
}

function deadlineFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Icon ──────────────────────────────────────────────
function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  const paths: Record<string, string> = {
    doc:   "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
    note:  "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z",
    user:  "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
    bill:  "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5Z",
    alert: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[type]} />
    </svg>
  );
}

// ── Skeleton card ─────────────────────────────────────
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

// ── Component ─────────────────────────────────────────
export default function StaffDashboard() {
  const { user } = useAuth();

  const [stats, setStats]         = useState<DashboardStats | null>(null);
  const [activity, setActivity]   = useState<ActivityItem[] | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[] | null>(null);
  const [error, setError]         = useState('');

  useEffect(() => {
    Promise.all([
      dashboardService.getStats()    .then(setStats)    .catch(() => setError('Failed to load dashboard stats.')),
      dashboardService.getActivity() .then(setActivity) .catch(() => setError('Failed to load activity feed.')),
      dashboardService.getDeadlines().then(setDeadlines).catch(() => setError('Failed to load deadlines.')),
    ]);
  }, []);

  const firstName = user?.fullName?.split(' ')[0] ?? 'Counsel';
  const today = new Date().toLocaleDateString('en-KE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="staff-dashboard">

      {/* ── Heading ── */}
      <div className="dashboard-heading">
        <h1>{greeting()}, {firstName}.</h1>
        <p>{today}</p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="error-banner" style={{ marginBottom: 20 }}>
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="summary-cards">
        {!stats ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="summary-card">
              <div className="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
                </svg>
              </div>
              <div className="card-label">Active Matters</div>
              <div className="card-value">{stats.activeMatters}</div>
              <div className="card-sub">across all practice areas</div>
            </div>

            <div className={`summary-card ${stats.upcomingHearings > 0 ? 'urgent' : ''}`}>
              <div className="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              </div>
              <div className="card-label">Upcoming Hearings</div>
              <div className="card-value">{stats.upcomingHearings}</div>
              <div className="card-sub">in the next 7 days</div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              </div>
              <div className="card-label">Outstanding Invoices</div>
              <div className="card-value" style={{ fontSize: 20, marginTop: 4 }}>
                {formatKes(stats.outstandingInvoiceKes)}
              </div>
              <div className="card-sub">awaiting payment</div>
            </div>

            <div className="summary-card">
              <div className="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div className="card-label">Unbilled Hours</div>
              <div className="card-value">
                {stats.unbilledHoursThisMonth}
                <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-soft)' }}>h</span>
              </div>
              <div className="card-sub">this month, not yet billed</div>
            </div>
          </>
        )}
      </div>

      {/* ── Bottom grid ── */}
      <div className="dashboard-grid">

        {/* Activity feed */}
        <div className="panel">
          <div className="panel-header">
            <h2>Recent Activity</h2>
            <a href="/matters" className="panel-header-link">View all matters →</a>
          </div>
          <div className="activity-list">
            {!activity ? (
              <div className="empty-state">Loading activity…</div>
            ) : activity.length === 0 ? (
              <div className="empty-state">No recent activity.</div>
            ) : (
              activity.map((item, i) => (
                <div key={item.id}>
                  <div className="activity-item">
                    <div className={`activity-icon ${item.type}`}>
                      <ActivityIcon type={item.type} />
                    </div>
                    <div className="activity-body">
                      <div
                        className="activity-text"
                        dangerouslySetInnerHTML={{ __html: item.text }}
                      />
                      {item.matter && (
                        <div className="activity-matter">{item.matter}</div>
                      )}
                    </div>
                    <div className="activity-time">{relativeTime(item.time)}</div>
                  </div>
                  {i < activity.length - 1 && <div className="activity-divider" />}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Deadlines */}
        <div className="panel">
          <div className="panel-header">
            <h2>Deadlines This Week</h2>
            <a href="/calendar" className="panel-header-link">Calendar →</a>
          </div>
          <div className="deadline-list">
            {!deadlines ? (
              <div className="empty-state">Loading…</div>
            ) : deadlines.length === 0 ? (
              <div className="empty-state">No deadlines this week.</div>
            ) : (
              deadlines.map((item, i) => {
                const urgency = deadlineUrgency(item.date);
                return (
                  <div key={item.id}>
                    <div className={`deadline-item ${urgency}`}>
                      <div className="deadline-dot-col">
                        <div className="deadline-dot" />
                      </div>
                      <div className="deadline-body">
                        <div className="deadline-title">{item.title}</div>
                        <div className="deadline-matter">{item.matter}</div>
                      </div>
                      <div className="deadline-date">
                        <div className="deadline-day">{deadlineDayLabel(urgency, item.date)}</div>
                        <div className="deadline-full-date">{deadlineFullDate(item.date)}</div>
                      </div>
                    </div>
                    {i < deadlines.length - 1 && <div className="deadline-divider" />}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}