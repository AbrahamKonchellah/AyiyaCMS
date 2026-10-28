// src/pages/Matters.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import matterService, { MatterDto, CreateMatterRequest } from '../services/matterService';
import clientService, { ClientDto, LawyerOption } from '../services/clientService';
import { useToast } from '../components/auth/Toast';
import { useAuth } from '../store/AuthContext';
import './Phase4.css';

const COURT_STATIONS = [
  'Milimani Law Courts', 'Nairobi Chief Magistrate', 'Milimani Commercial Courts',
  'Milimani Children Court', 'Nairobi High Court', 'Court of Appeal Nairobi',
  'Mombasa High Court', 'Kisumu High Court', 'Nakuru High Court',
  'Eldoret High Court', 'Nyeri High Court', 'Machakos High Court', 'Other'
];

const EMPTY_FORM: CreateMatterRequest = {
  title: '', jicmsCaseNumber: '', courtStation: '',
  clientId: '', assignedLawyerId: null,
  hearingDate: null, filingDeadline: null,
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function urgencyClass(iso: string | null) {
  if (!iso) return '';
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days <= 1) return 'badge-red';
  if (days <= 7) return 'badge-gold';
  return 'badge-active';
}

export default function Matters() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const toast           = useToast();
  const { user }        = useAuth();

  const canManage = user?.role === 'Admin' || user?.role === 'Partner';

  const [matters, setMatters]     = useState<MatterDto[]>([]);
  const [clients, setClients]     = useState<ClientDto[]>([]);
  const [lawyers, setLawyers]     = useState<LawyerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Active');
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState<CreateMatterRequest>({
    ...EMPTY_FORM,
    clientId: searchParams.get('clientId') ?? '',
  });
  const [isSaving, setIsSaving]   = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [m, c, l] = await Promise.all([
        matterService.getAll(),
        clientService.getAll(),
        clientService.getLawyers(),
      ]);
      setMatters(m);
      setClients(c);
      setLawyers(l);
    } catch {
      toast.error('Failed to load matters', 'Please refresh and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pre-open modal if coming from client profile
  useEffect(() => {
    if (searchParams.get('clientId')) setShowModal(true);
  }, []);

  const filtered = matters.filter(m => {
    const matchStatus = statusFilter === 'All' || m.status === statusFilter;
    const matchSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.clientName.toLowerCase().includes(search.toLowerCase()) ||
      m.jicmsCaseNumber.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleCreate = async () => {
    if (!form.title.trim() || !form.clientId) {
      toast.warning('Required fields missing', 'Matter title and client are required.');
      return;
    }
    setIsSaving(true);
    try {
      const matter = await matterService.create(form);
      toast.success('Matter opened', `"${matter.title}" has been created.`);
      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
      navigate(`/matters/${matter.id}`);
    } catch (err: any) {
      toast.error('Failed to create matter', err?.response?.data?.message ?? 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Matters</h1>
          <div className="page-header-meta">
            {isLoading ? 'Loading…' : `${filtered.length} matter${filtered.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}>
            + New Matter
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-input-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21 21-4.34-4.34M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
          </svg>
          <input
            className="search-input"
            placeholder="Search by title, client or case number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="data-table-wrapper" style={{ padding: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-block"
              style={{ height: 52, marginBottom: 8, opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="data-table-wrapper">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
              </svg>
            </div>
            <h3>{search ? 'No matters found' : 'No matters yet'}</h3>
            <p>{search ? 'Try a different search term.' : 'Open your first matter to get started.'}</p>
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Matter</th>
                <th>Client</th>
                <th>Status</th>
                <th>Next Hearing</th>
                <th>Filing Deadline</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} onClick={() => navigate(`/matters/${m.id}`)}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--green-900)' }}>{m.title}</div>
                    {m.jicmsCaseNumber && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 2 }}>
                        {m.jicmsCaseNumber} · {m.courtStation}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-mid)' }}>{m.clientName}</td>
                  <td>
                    <span className={`badge ${m.status === 'Active' ? 'badge-active' : 'badge-closed'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    {m.hearingDate
                      ? <span className={`badge ${urgencyClass(m.hearingDate)}`}>{formatDate(m.hearingDate)}</span>
                      : <span style={{ color: 'var(--text-soft)' }}>—</span>}
                  </td>
                  <td>
                    {m.filingDeadline
                      ? <span className={`badge ${urgencyClass(m.filingDeadline)}`}>{formatDate(m.filingDeadline)}</span>
                      : <span style={{ color: 'var(--text-soft)' }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--text-mid)' }}>{m.assignedLawyerName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create matter modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <h2>Open New Matter</h2>
            <p className="modal-sub">Create a new matter and link it to a client.</p>

            <div className="form-group">
              <label>Matter Title *</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Wanjiku v. Kenya Revenue Authority"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Client *</label>
                <select
                  value={form.clientId}
                  onChange={e => setForm({ ...form, clientId: e.target.value })}
                >
                  <option value="">Select client…</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Assigned Lawyer</label>
                <select
                  value={form.assignedLawyerId ?? ''}
                  onChange={e => setForm({ ...form, assignedLawyerId: e.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {lawyers.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>JICMS Case Number</label>
                <input
                  value={form.jicmsCaseNumber}
                  onChange={e => setForm({ ...form, jicmsCaseNumber: e.target.value })}
                  placeholder="e.g. ELC/E/001/2024"
                />
              </div>
              <div className="form-group">
                <label>Court Station</label>
                <select
                  value={form.courtStation}
                  onChange={e => setForm({ ...form, courtStation: e.target.value })}
                >
                  <option value="">Select court…</option>
                  {COURT_STATIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Next Hearing Date</label>
                <input
                  type="date"
                  value={form.hearingDate ?? ''}
                  onChange={e => setForm({ ...form, hearingDate: e.target.value || null })}
                />
              </div>
              <div className="form-group">
                <label>Filing Deadline</label>
                <input
                  type="date"
                  value={form.filingDeadline ?? ''}
                  onChange={e => setForm({ ...form, filingDeadline: e.target.value || null })}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreate} disabled={isSaving}>
                {isSaving ? 'Opening matter…' : 'Open Matter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}