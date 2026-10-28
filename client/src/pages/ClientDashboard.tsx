// src/pages/ClientDashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import clientDashboardService, {
  ClientDashboardStats,
  ClientMatter,
  ClientInvoice,
} from '../services/clientDashboardService';
import './ClientDashboard.css';

function formatKes(amount: number): string {
  return 'KES ' + amount.toLocaleString('en-KE', { minimumFractionDigits: 0 });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function hearingUrgency(iso: string): 'soon' | 'upcoming' {
  const days = Math.ceil(
    (new Date(iso).getTime() - Date.now()) / 86400000
  );
  return days <= 3 ? 'soon' : 'upcoming';
}

function invoiceStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'paid')    return 'paid';
  if (s === 'overdue') return 'overdue';
  return 'pending';
}

function isOverdue(dueDateIso: string, status: string): boolean {
  return ['pending', 'sent'].includes(status.toLowerCase()) &&
    new Date(dueDateIso).getTime() < Date.now();
}

function clientDisplayStatus(status: string, overdue: boolean): string {
  if (overdue) return 'Overdue';
  if (status.toLowerCase() === 'sent') return 'Pending';
  return status;
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

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats]       = useState<ClientDashboardStats | null>(null);
  const [matters, setMatters]   = useState<ClientMatter[] | null>(null);
  const [invoices, setInvoices] = useState<ClientInvoice[] | null>(null);
  const [error, setError]       = useState('');

  useEffect(() => {
    clientDashboardService.getStats()
      .then(setStats)
      .catch(() => setError('Failed to load your dashboard. Please try again.'));

    clientDashboardService.getMatters()
      .then(setMatters)
      .catch(() => setMatters([]));

    clientDashboardService.getInvoices()
      .then(setInvoices)
      .catch(() => setInvoices([]));
  }, []);

  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const today = new Date().toLocaleDateString('en-KE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="client-dashboard">

      <div className="dashboard-heading">
        <h1>{greeting()}, {firstName}.</h1>
        <p>{today}</p>
      </div>

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
            {/* Active Cases */}
            <div className="summary-card">
              <div className="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
                </svg>
              </div>
              <div className="card-label">Active Cases</div>
              <div className="card-value">{stats.activeCases}</div>
              <div className="card-sub">being handled for you</div>
            </div>

            {/* Upcoming Hearings */}
            <div className={`summary-card ${stats.upcomingHearings > 0 ? 'urgent' : ''}`}>
              <div className="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              </div>
              <div className="card-label">Upcoming Hearings</div>
              <div className="card-value">{stats.upcomingHearings}</div>
              <div className="card-sub">in the next 7 days</div>
            </div>

            {/* Shared Documents — links to My Cases */}
            <div
              className="summary-card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/my-cases')}
            >
              <div className="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <div className="card-label">Documents Shared</div>
              <div className="card-value">{stats.sharedDocuments}</div>
              <div className="card-sub" style={{ color: 'var(--accent)' }}>view in My Cases →</div>
            </div>

            {/* Outstanding Balance — links to My Invoices */}
            <div
              className={`summary-card ${stats.outstandingBalanceKes > 0 ? 'outstanding' : ''}`}
              style={{ cursor: stats.outstandingBalanceKes > 0 ? 'pointer' : 'default' }}
              onClick={() => stats.outstandingBalanceKes > 0 && navigate('/my-invoices')}
            >
              <div className="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              </div>
              <div className="card-label">Outstanding Balance</div>
              <div className="card-value">{formatKes(stats.outstandingBalanceKes)}</div>
              <div className="card-sub" style={{ color: stats.outstandingBalanceKes > 0 ? 'var(--accent)' : undefined }}>
                {stats.outstandingBalanceKes > 0 ? 'tap to view & pay →' : 'all paid up'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Bottom grid ── */}
      <div className="client-dashboard-grid">

        {/* My Active Cases */}
        <div className="panel">
          <div className="panel-header">
            <h2>My Active Cases</h2>
            <button
              className="panel-link"
              onClick={() => navigate('/my-cases')}
            >
              View all →
            </button>
          </div>
          <div className="matter-list">
            {!matters ? (
              <div className="empty-state">Loading your cases…</div>
            ) : matters.length === 0 ? (
              <div className="empty-state">No active cases at this time.</div>
            ) : (
              matters.map(m => (
                <div key={m.id} className="matter-item">
                  <div className="matter-item-header">
                    <div className="matter-title">{m.title}</div>
                    <span className={`matter-status-badge ${m.status.toLowerCase()}`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="matter-meta">
                    {m.jicmsCaseNumber && (
                      <span className="matter-meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
                        </svg>
                        {m.jicmsCaseNumber}
                      </span>
                    )}
                    {m.courtStation && (
                      <span className="matter-meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        {m.courtStation}
                      </span>
                    )}
                    {m.assignedLawyerName && (
                      <span className="matter-meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
                        </svg>
                        {m.assignedLawyerName}
                      </span>
                    )}
                  </div>
                  {m.hearingDate && (
                    <div className={`matter-hearing ${hearingUrgency(m.hearingDate)}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5" />
                      </svg>
                      Hearing: {formatDate(m.hearingDate)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* My Invoices — summary only, no pay button */}
        <div className="panel">
          <div className="panel-header">
            <h2>My Invoices</h2>
            <button
              className="panel-link"
              onClick={() => navigate('/my-invoices')}
            >
              View & Pay →
            </button>
          </div>
          <div className="invoice-list">
            {!invoices ? (
              <div className="empty-state">Loading invoices…</div>
            ) : invoices.length === 0 ? (
              <div className="empty-state">No invoices yet.</div>
            ) : (
              invoices.map(inv => {
                const overdue     = isOverdue(inv.dueDate, inv.status);
                const statusLabel = clientDisplayStatus(inv.status, overdue);
                const statusClass = overdue ? 'overdue' : invoiceStatusClass(inv.status);

                return (
                  <div
                    key={inv.id}
                    className="invoice-item"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/my-invoices')}
                  >
                    <div className="invoice-item-header">
                      <div className="invoice-matter">{inv.matterTitle}</div>
                      <div className="invoice-amount">{formatKes(inv.amount)}</div>
                    </div>
                    <div className="invoice-meta">
                      <div className="invoice-dates">
                        Issued {formatDate(inv.issuedAt)} · Due {formatDate(inv.dueDate)}
                      </div>
                      <span className={`invoice-status-badge ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
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