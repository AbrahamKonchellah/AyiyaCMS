// src/pages/MyInvoices.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import clientDashboardService, { ClientInvoice } from '../services/clientDashboardService';
import paymentsService from '../services/paymentsService';
import { useToast } from '../components/auth/Toast';
import './ClientDashboard.css';

function formatKes(amount: number): string {
  return 'KES ' + amount.toLocaleString('en-KE', { minimumFractionDigits: 0 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function isOverdue(dueDateIso: string, status: string): boolean {
  return ['pending', 'sent'].includes(status.toLowerCase()) &&
    new Date(dueDateIso).getTime() < Date.now();
}

function invoiceStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'paid')    return 'paid';
  if (s === 'overdue') return 'overdue';
  return 'pending';
}

function clientDisplayStatus(status: string, overdue: boolean): string {
  if (overdue) return 'Overdue';
  if (status.toLowerCase() === 'sent') return 'Pending';
  return status;
}

// ── M-Pesa pay button with polling ───────────────────
function PayButton({ invoice, onPaid }: {
  invoice: ClientInvoice;
  onPaid: (id: string) => void;
}) {
  const toast = useToast();
  const [state, setState] = useState<'idle' | 'requesting' | 'waiting'>('idle');
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollRef.current)  clearInterval(pollRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    pollRef.current  = null;
    timerRef.current = null;
  };

  const startPolling = (invoiceId: string) => {
    // Poll every 5 seconds
    pollRef.current = setInterval(async () => {
      try {
        const updated = await clientDashboardService.getInvoice(invoiceId);
        if (updated.status.toLowerCase() === 'paid') {
          stopPolling();
          setState('idle');
          onPaid(invoiceId);
          toast.success('Payment confirmed', 'Your M-Pesa payment has been received.');
        }
      } catch {
        // silently ignore poll errors
      }
    }, 5000);

    // Timeout after 2 minutes
    timerRef.current = setTimeout(() => {
      stopPolling();
      setState('idle');
      toast.warning(
        'Payment not confirmed',
        'No confirmation received. Check your M-Pesa messages and try again if needed.'
      );
    }, 120_000);
  };

  useEffect(() => () => stopPolling(), []);

  const handlePay = async () => {
    setState('requesting');
    try {
      await paymentsService.initiateMpesa(invoice.id);
      setState('waiting');
      toast.success(
        'Check your phone',
        'An M-Pesa prompt has been sent. Enter your PIN to complete payment.'
      );
      startPolling(invoice.id);
    } catch (err: any) {
      setState('idle');
      const message = err?.response?.data?.message ?? 'Could not initiate payment. Please try again.';
      toast.error('Payment failed', message);
    }
  };

  if (state === 'waiting') {
    return (
      <div className="pay-waiting">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        Waiting for M-Pesa confirmation…
      </div>
    );
  }

  return (
    <button
      className="pay-btn"
      onClick={handlePay}
      disabled={state === 'requesting'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
      </svg>
      {state === 'requesting' ? 'Requesting…' : 'Pay via M-Pesa'}
    </button>
  );
}

const PAGE_SIZE = 20;

export default function MyInvoices() {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [filter, setFilter]     = useState('All');
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(true);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const loadPage = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const data = await clientDashboardService.getAllInvoices(pageNum, PAGE_SIZE);
      if (pageNum === 1) {
        setInvoices(data);
      } else {
        setInvoices(prev => [...prev, ...data]);
      }
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPage(1); }, [loadPage]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPage(next);
  };

  // Called by PayButton when polling confirms payment
  const handlePaid = (invoiceId: string) => {
    setInvoices(prev =>
      prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'Paid' } : inv)
    );
  };

  const filtered = invoices.filter(inv => {
    const overdue = isOverdue(inv.dueDate, inv.status);
    if (filter === 'All')     return true;
    if (filter === 'Overdue') return overdue;
    if (filter === 'Pending') return ['pending', 'sent'].includes(inv.status.toLowerCase()) && !overdue;
    if (filter === 'Paid')    return inv.status.toLowerCase() === 'paid';
    return true;
  });

  return (
    <div className="client-dashboard">

      <div className="dashboard-heading">
        <h1>My Invoices</h1>
        <p>All invoices issued to your account</p>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: 20 }}>
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['All', 'Pending', 'Paid', 'Overdue'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13,
              fontWeight: filter === s ? 600 : 400,
              border: '1px solid var(--border)',
              background: filter === s ? 'var(--accent)' : 'var(--surface)',
              color: filter === s ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="invoice-list">
          {filtered.length === 0 && !loading ? (
            <div className="empty-state">No invoices found.</div>
          ) : (
            filtered.map(inv => {
              const overdue     = isOverdue(inv.dueDate, inv.status);
              const statusLabel = clientDisplayStatus(inv.status, overdue);
              const statusClass = overdue ? 'overdue' : invoiceStatusClass(inv.status);
              const isPending   = ['pending', 'sent'].includes(inv.status.toLowerCase());

              return (
                <div key={inv.id} className="invoice-item">
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
                  {isPending && !overdue && (
                    <PayButton invoice={inv} onPaid={handlePaid} />
                  )}
                </div>
              );
            })
          )}
          {loading && <div className="empty-state">Loading…</div>}
        </div>

        {hasMore && !loading && filtered.length > 0 && (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <button
              onClick={loadMore}
              style={{
                padding: '8px 24px', borderRadius: 8, fontSize: 14,
                border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}