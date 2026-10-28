import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './Phase4.css';

interface AuditEntry {
  id: string;
  performedBy: string;
  action: string;
  entityName: string;
  entityId: string;
  changes: string;
  performedAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AuditLogs() {
  const [logs, setLogs]           = useState<AuditEntry[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [actions, setActions]     = useState<string[]>([]);

  const [filterUser, setFilterUser]     = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom, setFilterFrom]     = useState('');
  const [filterTo, setFilterTo]         = useState('');

  const PAGE_SIZE = 50;

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (filterUser)   params.user   = filterUser;
      if (filterAction) params.action = filterAction;
      if (filterFrom)   params.from   = filterFrom;
      if (filterTo)     params.to     = filterTo;

      const { data } = await api.get('/audit-logs', { params });
      setLogs(data.logs);
      setTotal(data.total);
    } finally {
      setIsLoading(false);
    }
  }, [page, filterUser, filterAction, filterFrom, filterTo]);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => {
    api.get('/audit-logs/actions').then(r => setActions(r.data));
  }, []);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <div>
          <h1>Audit Log</h1>
          <div className="page-header-meta">{total.toLocaleString()} entries · read-only</div>
        </div>
      </div>

      <div className="toolbar" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="search-input-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input className="search-input" placeholder="Filter by user…" value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(1); }} />
        </div>
        <select className="filter-select" value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}>
          <option value="">All actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" className="filter-select" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(1); }} style={{ paddingRight: 11 }} />
        <input type="date" className="filter-select" value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(1); }} style={{ paddingRight: 11 }} />
        {(filterUser || filterAction || filterFrom || filterTo) && (
          <button className="btn-secondary" onClick={() => { setFilterUser(''); setFilterAction(''); setFilterFrom(''); setFilterTo(''); setPage(1); }}>Clear</button>
        )}
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}><td colSpan={5}><div className="skeleton-block" style={{ height: 18 }} /></td></tr>
              ))
            ) : logs.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><h3>No entries found</h3><p>Try adjusting your filters.</p></div></td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{formatDate(log.performedAt)}</td>
                  <td>{log.performedBy}</td>
                  <td><span className="badge badge-closed">{log.action}</span></td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{log.entityName}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-soft)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.changes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
          <span style={{ lineHeight: '36px', fontSize: 13, color: 'var(--text-soft)' }}>Page {page} of {totalPages}</span>
          <button className="btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
        </div>
      )}
    </div>
  );
}