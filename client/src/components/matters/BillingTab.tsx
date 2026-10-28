// src/components/matters/BillingTab.tsx
import { useState, useEffect } from 'react';
import feeNoteService, { FeeNoteDto } from '../../services/feeNoteService';
import invoiceService, { InvoiceDto } from '../../services/InvoiceService';
import { useToast } from '../auth/Toast';
import { useConfirm } from '../auth/ConfirmDialog';
import { useAuth } from '../../store/AuthContext';
import './BillingTab.css';

interface Props {
  matterId: string;
}

function formatMoney(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14); // 14 days standard terms
  return d.toISOString().split('T')[0];
}

function invoiceStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Paid':    return 'badge-active';
    case 'Sent':    return 'badge-gold';
    case 'Overdue': return 'badge-red';
    default:        return 'badge-closed'; // Draft
  }
}

export default function BillingTab({ matterId }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const canGenerate = user?.role === 'Partner' || user?.role === 'Associate' || user?.role === 'Paralegal';
  const canApprove  = user?.role === 'Partner' || user?.role === 'Admin';
  // Per the plan: Paralegals can draft invoices, but only Partners (or Admin) can send them
  const canDraftInvoice = user?.role === 'Partner' || user?.role === 'Associate' || user?.role === 'Paralegal';
  const canSendInvoice  = user?.role === 'Partner' || user?.role === 'Admin';

  const [feeNotes, setFeeNotes]     = useState<FeeNoteDto[]>([]);
  const [invoices, setInvoices]     = useState<InvoiceDto[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Invoice generation modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedFeeNoteId, setSelectedFeeNoteId] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  useEffect(() => { loadAll(); }, [matterId]);

  const loadAll = async () => {
    try {
      setIsLoading(true);
      const [fn, inv] = await Promise.all([
        feeNoteService.getForMatter(matterId),
        invoiceService.getForMatter(matterId),
      ]);
      setFeeNotes(fn);
      setInvoices(inv);
    } catch {
      toast.error('Failed to load billing data', 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Fee note actions ──────────────────────────────
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const feeNote = await feeNoteService.generate(matterId);
      toast.success('Fee note generated', `${feeNote.feeNoteNumber} — ${formatMoney(feeNote.totalAmount)}`);
      await loadAll();
    } catch (err: any) {
      toast.error('Could not generate fee note', err?.response?.data?.message ?? 'Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (feeNote: FeeNoteDto) => {
    const confirmed = await confirm({
      title: 'Approve Fee Note',
      message: `Approve ${feeNote.feeNoteNumber} for ${formatMoney(feeNote.totalAmount)}? Once approved, it's ready to invoice.`,
      confirmLabel: 'Approve',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      await feeNoteService.approve(feeNote.id);
      toast.success('Fee note approved', '');
      await loadAll();
    } catch (err: any) {
      toast.error('Approval failed', err?.response?.data?.message ?? 'Please try again.');
    }
  };

  const handleDownloadFeeNote = async (feeNote: FeeNoteDto) => {
    try {
      const url = await feeNoteService.getDownloadUrl(feeNote.id);
      window.open(url, '_blank');
    } catch {
      toast.error('Download failed', 'Could not generate a download link.');
    }
  };

  // ── Invoice actions ───────────────────────────────
  const approvedUninvoicedFeeNotes = feeNotes.filter(fn =>
    fn.status === 'Approved' && !invoices.some(inv => inv.feeNoteId === fn.id)
  );

  const openInvoiceModal = () => {
    if (approvedUninvoicedFeeNotes.length === 0) {
      toast.warning('No fee notes available', 'Approve a fee note first, or all approved fee notes already have invoices.');
      return;
    }
    setSelectedFeeNoteId(approvedUninvoicedFeeNotes[0].id);
    setDueDate(defaultDueDate());
    setShowInvoiceModal(true);
  };

  const handleCreateInvoice = async () => {
    if (!selectedFeeNoteId || !dueDate) {
      toast.warning('Missing information', 'Select a fee note and due date.');
      return;
    }
    setIsCreatingInvoice(true);
    try {
      const invoice = await invoiceService.generate({
        feeNoteId: selectedFeeNoteId,
        dueDate: new Date(dueDate).toISOString(),
      });
      toast.success('Invoice created', `${invoice.invoiceNumber} — ${formatMoney(invoice.amount)}`);
      setShowInvoiceModal(false);
      await loadAll();
    } catch (err: any) {
      toast.error('Could not create invoice', err?.response?.data?.message ?? 'Please try again.');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleSendInvoice = async (invoice: InvoiceDto) => {
    const confirmed = await confirm({
      title: 'Send Invoice',
      message: `Mark ${invoice.invoiceNumber} as sent to ${invoice.clientName}? The client will be able to pay it via the client portal.`,
      confirmLabel: 'Mark as Sent',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      await invoiceService.markSent(invoice.id);
      toast.success('Invoice sent', `${invoice.invoiceNumber} is now visible to the client.`);
      await loadAll();
    } catch (err: any) {
      toast.error('Failed to send invoice', err?.response?.data?.message ?? 'Please try again.');
    }
  };

  const handleMarkPaid = async (invoice: InvoiceDto) => {
    const confirmed = await confirm({
      title: 'Record Payment',
      message: `Mark ${invoice.invoiceNumber} as paid manually? Use this only for payments received outside M-Pesa (e.g. bank transfer or cheque).`,
      confirmLabel: 'Mark as Paid',
      variant: 'default',
    });
    if (!confirmed) return;
    try {
      await invoiceService.markPaid(invoice.id);
      toast.success('Payment recorded', `${invoice.invoiceNumber} marked as paid.`);
      await loadAll();
    } catch {
      toast.error('Failed to record payment', 'Please try again.');
    }
  };

  const handleDownloadInvoice = async (invoice: InvoiceDto) => {
    try {
      const url = await invoiceService.getDownloadUrl(invoice.id);
      window.open(url, '_blank');
    } catch {
      toast.error('Download failed', 'Could not generate a download link.');
    }
  };

  return (
    <div className="billing-tab">

      {/* ── Fee Notes section ── */}
      <div className="billing-section-header">
        <h3>Fee Notes</h3>
      </div>

      {canGenerate && (
        <div className="billing-generate-row">
          <button className="btn-primary" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating…' : 'Generate Fee Note'}
          </button>
          <span className="billing-generate-hint">
            Collects every unbilled time entry on this matter into one fee note.
          </span>
        </div>
      )}

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fee Note</th>
              <th>Date</th>
              <th>Generated By</th>
              <th>Subtotal</th>
              <th>VAT</th>
              <th>Total</th>
              <th>Status</th>
              <th style={{ width: 130 }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={8}><div className="skeleton-block" style={{ height: 18 }} /></td></tr>
              ))
            ) : feeNotes.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <h3>No fee notes yet</h3>
                  <p>{canGenerate ? 'Generate one from the unbilled time logged on this matter.' : 'No fee notes have been generated on this matter.'}</p>
                </div>
              </td></tr>
            ) : (
              feeNotes.map(feeNote => (
                <tr key={feeNote.id}>
                  <td className="fee-note-number">{feeNote.feeNoteNumber}</td>
                  <td>{formatDate(feeNote.generatedAt)}</td>
                  <td>{feeNote.generatedByName}</td>
                  <td>{formatMoney(feeNote.subtotal)}</td>
                  <td>{formatMoney(feeNote.vatAmount)}</td>
                  <td className="fee-note-total">{formatMoney(feeNote.totalAmount)}</td>
                  <td>
                    <span className={`badge ${feeNote.status === 'Approved' ? 'badge-active' : 'badge-gold'}`}>
                      {feeNote.status === 'Approved' ? 'Approved' : 'Pending Approval'}
                    </span>
                    {feeNote.status === 'Approved' && feeNote.approvedByName && (
                      <div className="fee-note-approved-by">by {feeNote.approvedByName}</div>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="doc-icon-btn" title="Download" onClick={() => handleDownloadFeeNote(feeNote)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3v12m0 0-4-4m4 4 4-4M5 19h14" />
                        </svg>
                      </button>
                      {canApprove && feeNote.status === 'PendingApproval' && (
                        <button className="doc-icon-btn" title="Approve" onClick={() => handleApprove(feeNote)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Invoices section ── */}
      <div className="billing-section-header" style={{ marginTop: 32 }}>
        <h3>Invoices</h3>
      </div>

      {canDraftInvoice && (
        <div className="billing-generate-row">
          <button className="btn-primary" onClick={openInvoiceModal}>
            + Create Invoice
          </button>
          <span className="billing-generate-hint">
            Generates an invoice from an approved fee note.
          </span>
        </div>
      )}

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Issued</th>
              <th>Due Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th style={{ width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <tr key={i}><td colSpan={6}><div className="skeleton-block" style={{ height: 18 }} /></td></tr>
              ))
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <h3>No invoices yet</h3>
                  <p>{canDraftInvoice ? 'Create one from an approved fee note above.' : 'No invoices have been issued on this matter.'}</p>
                </div>
              </td></tr>
            ) : (
              invoices.map(invoice => (
                <tr key={invoice.id}>
                  <td className="fee-note-number">{invoice.invoiceNumber}</td>
                  <td>{formatDate(invoice.issuedAt)}</td>
                  <td>{formatDate(invoice.dueDate)}</td>
                  <td className="fee-note-total">{formatMoney(invoice.amount)}</td>
                  <td>
                    <span className={`badge ${invoiceStatusBadgeClass(invoice.status)}`}>
                      {invoice.status}
                    </span>
                    {invoice.status === 'Paid' && invoice.mpesaReceiptNumber && (
                      <div className="fee-note-approved-by">M-Pesa: {invoice.mpesaReceiptNumber}</div>
                    )}
                    {invoice.status === 'Sent' && invoice.sentByName && (
                      <div className="fee-note-approved-by">by {invoice.sentByName}</div>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="doc-icon-btn" title="Download" onClick={() => handleDownloadInvoice(invoice)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3v12m0 0-4-4m4 4 4-4M5 19h14" />
                        </svg>
                      </button>
                      {canSendInvoice && invoice.status === 'Draft' && (
                        <button className="doc-icon-btn" title="Send to client" onClick={() => handleSendInvoice(invoice)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 12 3.27 3.94a.75.75 0 0 1 1.05-.9l16.5 8.25a.75.75 0 0 1 0 1.34L4.32 20.94a.75.75 0 0 1-1.05-.9L6 12Zm0 0h12" />
                          </svg>
                        </button>
                      )}
                      {canApprove && (invoice.status === 'Sent' || invoice.status === 'Overdue') && (
                        <button className="doc-icon-btn" title="Record manual payment" onClick={() => handleMarkPaid(invoice)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Create invoice modal ── */}
      {showInvoiceModal && (
        <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create Invoice</h2>
            <p className="modal-sub">Generate a formal invoice from an approved fee note.</p>

            <div className="form-group">
              <label>Fee Note</label>
              <select
                value={selectedFeeNoteId}
                onChange={e => setSelectedFeeNoteId(e.target.value)}
              >
                {approvedUninvoicedFeeNotes.map(fn => (
                  <option key={fn.id} value={fn.id}>
                    {fn.feeNoteNumber} — {formatMoney(fn.totalAmount)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowInvoiceModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateInvoice} disabled={isCreatingInvoice}>
                {isCreatingInvoice ? 'Creating…' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}