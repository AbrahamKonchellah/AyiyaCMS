// src/components/matters/TimeTrackingTab.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import timeEntryService, { TimeEntryDto } from '../../services/timeEntryService';
import { useToast } from '../auth/Toast';
import { useConfirm } from '../auth/ConfirmDialog';
import { useAuth } from '../../store/AuthContext';
import './TimeTrackingTab.css';

interface Props {
  matterId: string;
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function formatMoney(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayInputDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default function TimeTrackingTab({ matterId }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const canLog    = user?.role === 'Partner' || user?.role === 'Associate' || user?.role === 'Paralegal';
  const canManage = user?.role === 'Admin' || user?.role === 'Partner';

  const [entries, setEntries]   = useState<TimeEntryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stopwatch
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef   = useRef<number | null>(null);

  // Entry form — populated either by the stopwatch or typed directly
  const [description, setDescription] = useState('');
  const [hoursInput, setHoursInput]   = useState('');
  const [rateInput, setRateInput]     = useState(() => localStorage.getItem('ayiyacms_last_rate') || '');
  const [entryDate, setEntryDate]     = useState(todayInputDate());
  const [isSaving, setIsSaving]       = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);

  const storageKey = `ayiyacms_stopwatch_${matterId}`;

  useEffect(() => { loadEntries(); }, [matterId]);

  // Restores a running stopwatch after a page refresh — so a lawyer
  // switching tabs mid-task doesn't lose accumulated time.
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const startedAt = parseInt(saved, 10);
      if (!isNaN(startedAt)) {
        startTimeRef.current = startedAt;
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
        setIsRunning(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        if (startTimeRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [isRunning]);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      setEntries(await timeEntryService.getForMatter(matterId));
    } catch {
      toast.error('Failed to load time entries', 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = () => {
    const now = Date.now();
    startTimeRef.current = now;
    localStorage.setItem(storageKey, String(now));
    setElapsedSeconds(0);
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
    localStorage.removeItem(storageKey);
    setHoursInput((elapsedSeconds / 3600).toFixed(2));
    setEntryDate(todayInputDate());
    document.getElementById('time-entry-description')?.focus();
  };

  const handleDiscardStopwatch = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    startTimeRef.current = null;
    localStorage.removeItem(storageKey);
  };

  const resetForm = () => {
    setDescription('');
    setHoursInput('');
    setEntryDate(todayInputDate());
    setEditingId(null);
  };

  const handleSave = async () => {
    const hours = parseFloat(hoursInput);
    const rate  = parseFloat(rateInput);

    if (!description.trim()) { toast.warning('Description required', 'Briefly describe the work done.'); return; }
    if (!hours || hours <= 0) { toast.warning('Hours required', 'Enter the time spent, or use the stopwatch.'); return; }
    if (!rate || rate <= 0)   { toast.warning('Rate required', 'Enter the hourly rate for this entry.'); return; }

    setIsSaving(true);
    try {
      if (editingId) {
        await timeEntryService.update(editingId, { description: description.trim(), hours, rate, entryDate });
        toast.success('Time entry updated', '');
      } else {
        await timeEntryService.create({ matterId, description: description.trim(), hours, rate, entryDate });
        toast.success('Time entry logged', `${formatHours(hours)} added.`);
      }
      localStorage.setItem('ayiyacms_last_rate', rateInput);
      resetForm();
      await loadEntries();
    } catch (err: any) {
      toast.error('Save failed', err?.response?.data?.message ?? 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (entry: TimeEntryDto) => {
    setEditingId(entry.id);
    setDescription(entry.description);
    setHoursInput(String(entry.hours));
    setRateInput(String(entry.rate));
    setEntryDate(entry.entryDate.split('T')[0]);
  };

  const handleDelete = async (entry: TimeEntryDto) => {
    const confirmed = await confirm({
      title: 'Delete Time Entry',
      message: `This will permanently delete this ${formatHours(entry.hours)} entry. This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await timeEntryService.delete(entry.id);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      toast.success('Time entry deleted', '');
    } catch (err: any) {
      toast.error('Delete failed', err?.response?.data?.message ?? 'Please try again.');
    }
  };

  const handleMarkBilled = async (entry: TimeEntryDto) => {
    const confirmed = await confirm({
      title: 'Mark as Billed',
      message: 'This entry will be excluded from future fee notes. This cannot be undone.',
      confirmLabel: 'Mark as Billed',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      await timeEntryService.markBilled(entry.id);
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, isBilled: true } : e));
    } catch {
      toast.error('Failed to update', 'Please try again.');
    }
  };

  const totals = useMemo(() => {
    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
    const unbilled = entries.filter(e => !e.isBilled);
    return {
      totalHours,
      unbilledHours: unbilled.reduce((sum, e) => sum + e.hours, 0),
      unbilledAmount: unbilled.reduce((sum, e) => sum + e.amount, 0),
    };
  }, [entries]);

  return (
    <div className="time-tracking-tab">
      {canLog && (
        <div className="stopwatch-card">
          <div className="stopwatch-display">{formatElapsed(elapsedSeconds)}</div>
          <div className="stopwatch-controls">
            {!isRunning ? (
              <button className="btn-primary" onClick={handleStart}>Start</button>
            ) : (
              <button className="btn-danger" onClick={handleStop}>Stop</button>
            )}
            {!isRunning && elapsedSeconds > 0 && (
              <button className="btn-secondary" onClick={handleDiscardStopwatch}>Discard</button>
            )}
          </div>
        </div>
      )}

      {canLog && (
        <div className="time-entry-form">
          <div className="form-row">
            <div className="form-group">
              <label>Description *</label>
              <input
                id="time-entry-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Drafted and filed defence"
              />
            </div>
            <div className="form-group" style={{ maxWidth: 110 }}>
              <label>Hours *</label>
              <input type="number" step="0.05" min="0" value={hoursInput} onChange={e => setHoursInput(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ maxWidth: 160 }}>
              <label>Rate (KES/hr) *</label>
              <input type="number" step="100" min="0" value={rateInput} onChange={e => setRateInput(e.target.value)} placeholder="0" />
            </div>
            <div className="form-group" style={{ maxWidth: 160 }}>
              <label>Date *</label>
              <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </div>
            <div className="form-group time-entry-form-actions">
              {editingId && <button className="btn-secondary" onClick={resetForm} disabled={isSaving}>Cancel</button>}
              <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving…' : editingId ? 'Update Entry' : 'Log Time'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th><th>Description</th><th>Logged By</th><th>Duration</th><th>Amount</th><th>Status</th><th style={{ width: 130 }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="skeleton-block" style={{ height: 18 }} /></td></tr>
              ))
            ) : entries.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <h3>No time logged yet</h3>
                  <p>Use the stopwatch or log time manually above.</p>
                </div>
              </td></tr>
            ) : (
              entries.map(entry => {
                const canEditThis = !entry.isBilled && (entry.userId === user?.id || canManage);
                return (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.entryDate)}</td>
                    <td>{entry.description}</td>
                    <td>{entry.userName}</td>
                    <td>{formatHours(entry.hours)}</td>
                    <td>{formatMoney(entry.amount)}</td>
                    <td>
                      <span className={`badge ${entry.isBilled ? 'badge-closed' : 'badge-gold'}`}>
                        {entry.isBilled ? 'Billed' : 'Unbilled'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {canEditThis && (
                          <button className="doc-icon-btn" title="Edit" onClick={() => handleEdit(entry)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4h2m-9 16h12M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                        )}
                        {canManage && !entry.isBilled && (
                          <button className="doc-icon-btn" title="Mark as billed" onClick={() => handleMarkBilled(entry)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </button>
                        )}
                        {canEditThis && (
                          <button className="doc-icon-btn doc-icon-btn-danger" title="Delete" onClick={() => handleDelete(entry)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 7h16M9 7V4h6v3m-7 0 1 13h8l1-13" />
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

      {entries.length > 0 && (
        <div className="time-totals">
          <div className="time-total-item"><span>Total logged</span><strong>{formatHours(totals.totalHours)}</strong></div>
          <div className="time-total-item"><span>Unbilled</span><strong>{formatHours(totals.unbilledHours)}</strong></div>
          <div className="time-total-item time-total-highlight"><span>Unbilled value</span><strong>{formatMoney(totals.unbilledAmount)}</strong></div>
        </div>
      )}
    </div>
  );
}