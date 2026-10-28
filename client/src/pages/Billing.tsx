// src/pages/Billing.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import invoiceService, { InvoiceDto } from '../services/InvoiceService';
import { useToast } from '../components/auth/Toast';
import { useConfirm } from '../components/auth/ConfirmDialog';
import './Billing.css';

// ── Helpers ───────────────────────────────────────────
function formatKes(amount: number): string {
  return 'KES ' + amount.toLocaleString('en-KE', { minimumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function isOverdue(dueDate: string, status: string): boolean {
  return status === 'Sent' && new Date(dueDate).getTime() < Date.now();
}

function statusClass(status: string, overdue: boolean): string {
  if (overdue)           return 'overdue';
  if (status === 'Paid') return 'paid';
  if (status === 'Sent') return 'sent';
  if (status === 'Draft') return 'draft';
  return 'overdue';
}

function statusLabel(status: string, overdue: boolean): string {
  if (overdue) return 'Overdue';
  return status;
}

const FILTERS = ['All', 'Draft', 'Sent', 'Paid', 'Overdue'];

// ── Summary strip ─────────────────────────────────────
function SummaryStrip({ invoices }: { invoices: InvoiceDto[] }) {
  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const collected     = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const outstanding   = invoices
    .filter(i => i.status === 'Sent' || i.status === 'Overdue')
    .reduce((s, i) => s + i.amount, 0);
  const overdueCount  = invoices.filter(i =>
    i.status === 'Overdue' || isOverdue(i.dueDate, i.status)
  ).length;

  return (
    <div className="billing-summary">
      <div className="billing-summary-card">
        <div className="bsc-label">Total Invoiced</div>
        <div className="bsc-value">{formatKes(totalInvoiced)}</div>
        <div className="bsc-sub">{invoices.length} invoices</div>
      </div>
      <div className="billing-summary-card">
        <div className="bsc-label">Collected</div>
        <div className="bsc-value green">{formatKes(collected)}</div>
        <div className="bsc-sub">{invoices.filter(i => i.status === 'Paid').length} paid</div>
      </div>
      <div className="billing-summary-card">
        <div className="bsc-label">Outstanding</div>
        <div className="bsc-value gold">{formatKes(outstanding)}</div>
        <div className="bsc-sub">awaiting payment</div>
      </div>
      <div className={`billing-summary-card ${overdueCount > 0 ? 'danger' : ''}`}>
        <div className="bsc-label">Overdue</div>
        <div className="bsc-value red">{overdueCount}</div>
        <div className="bsc-sub">{overdueCount > 0 ? 'require attention' : 'none overdue'}</div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────
export default function Billing() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const toast     = useToast();
  const confirm   = useConfirm();

  const isPartnerOrAdmin = user?.role === 'Partner' || user?.role === 'Admin';

  const [allInvoices, setAllInvoices] = useState<InvoiceDto[]>([]);
  const [filter, setFilter]           = useState('All');
  const [loading, setLoading]         = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoiceService.getAll();
      setAllInvoices(data);
    } catch {
      toast.error('Failed to load invoices', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleDownload = async (inv: InvoiceDto) => {
    try {
      const url = await invoiceService.getDownloadUrl(inv.id);
      window.open(url, '_blank');
    } catch {
      toast.error('Download failed', 'Could not retrieve the invoice PDF.');
    }
  };

  const handleMarkPaid = async (inv: InvoiceDto) => {
    const confirmed = await confirm({
      title: 'Mark as Paid',
      message: `Mark ${inv.invoiceNumber} (${formatKes(inv.amount)}) as manually paid? This cannot be undone.`,
      confirmLabel: 'Mark Paid',
      variant: 'default',
    });
    if (!confirmed) return;

    setActioningId(inv.id);
    try {
      await invoiceService.markPaid(inv.id);
      toast.success('Invoice marked as paid', inv.invoiceNumber);
      fetchInvoices();
    } catch {
      toast.error('Failed to mark as paid', 'Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  const handleMarkSent = async (inv: InvoiceDto) => {
    const confirmed = await confirm({
      title: 'Mark as Sent',
      message: `Mark ${inv.invoiceNumber} as sent to ${inv.clientName}?`,
      confirmLabel: 'Mark Sent',
      variant: 'default',
    });
    if (!confirmed) return;

    setActioningId(inv.id);
    try {
      await invoiceService.markSent(inv.id);
      toast.success('Invoice marked as sent', inv.invoiceNumber);
      fetchInvoices();
    } catch {
      toast.error('Failed to mark as sent', 'Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  const filtered = allInvoices.filter(inv => {
    if (filter === 'All')     return true;
    if (filter === 'Overdue') return inv.status === 'Overdue' || isOverdue(inv.dueDate, inv.status);
    return inv.status === filter;
  });

  return (
    <div className="billing-page">

      <div className="dashboard-heading">
        <div>
          <h1>Billing</h1>
          <p>Firm-wide invoice ledger</p>
        </div>
      </div>

      {/* ── Summary ── */}
      {!loading && <SummaryStrip invoices={allInvoices} />}

      {/* ── Filter tabs ── */}
      <div className="billing-filters">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`billing-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
            {f !== 'All' && (
              <span className="billing-filter-count">
                {f === 'Overdue'
                  ? allInvoices.filter(i => i.status === 'Overdue' || isOverdue(i.dueDate, i.status)).length
                  : allInvoices.filter(i => i.status === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="billing-table-wrap">
        <table className="billing-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Client</th>
              <th>Matter</th>
              <th>Amount</th>
              <th>Issued</th>
              <th>Due</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="billing-skeleton-row">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}>
                      <div className="skeleton-block" style={{ width: '75%', height: 13 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="billing-empty">
                  No invoices match this filter.
                </td>
              </tr>
            ) : (
              filtered.map(inv => {
                const overdue = isOverdue(inv.dueDate, inv.status);
                const canPay  = isPartnerOrAdmin &&
                  (inv.status === 'Sent' || inv.status === 'Overdue');
                const canSend = isPartnerOrAdmin && inv.status === 'Draft';
                const acting  = actioningId === inv.id;

                return (
                  <tr
                    key={inv.id}
                    className={overdue ? 'billing-row-overdue' : ''}
                  >
                    <td className="billing-td-number">
                      {inv.invoiceNumber}
                    </td>
                    <td className="billing-td-client">{inv.clientName}</td>
                    <td className="billing-td-matter">
                      {inv.matterId ? (
                        <button
                          className="billing-matter-link"
                          onClick={() => navigate(`/matters/${inv.matterId}`)}
                        >
                          {inv.matterTitle ?? '—'}
                        </button>
                      ) : (
                        <span className="billing-td-soft">General</span>
                      )}
                    </td>
                    <td className="billing-td-amount">{formatKes(inv.amount)}</td>
                    <td className="billing-td-date">{formatDate(inv.issuedAt)}</td>
                    <td className={`billing-td-date ${overdue ? 'billing-td-overdue' : ''}`}>
                      {formatDate(inv.dueDate)}
                    </td>
                    <td>
                      <span className={`billing-status-badge ${statusClass(inv.status, overdue)}`}>
                        {statusLabel(inv.status, overdue)}
                      </span>
                      {inv.mpesaReceiptNumber && (
                        <div className="billing-receipt">
                          M-Pesa: {inv.mpesaReceiptNumber}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="billing-actions">
                        {/* Download PDF */}
                        <button
                          className="billing-action-btn"
                          onClick={() => handleDownload(inv)}
                          title="Download PDF"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        </button>

                        {/* Mark as Sent */}
                        {canSend && (
                          <button
                            className="billing-action-btn send"
                            onClick={() => handleMarkSent(inv)}
                            disabled={acting}
                            title="Mark as Sent"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2.2"
                              strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                          </button>
                        )}

                        {/* Mark as Paid (manual) */}
                        {canPay && (
                          <button
                            className="billing-action-btn paid"
                            onClick={() => handleMarkPaid(inv)}
                            disabled={acting}
                            title="Mark as Paid"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2.2"
                              strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}