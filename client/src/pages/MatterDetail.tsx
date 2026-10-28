// src/pages/MatterDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import matterService, { MatterDto, MatterStaffDto, UpdateMatterRequest } from '../services/matterService';
import clientService, { LawyerOption } from '../services/clientService';
import calendarService, { CalendarFeedItem } from '../services/calendarService';
import DocumentsTab from '../components/matters/DocumentsTab';
import TimeTrackingTab from '../components/matters/TimeTrackingTab';
import BillingTab from '../components/matters/BillingTab';
import { useToast } from '../components/auth/Toast';
import { useConfirm } from '../components/auth/ConfirmDialog';
import { useAuth } from '../store/AuthContext';
import './Phase4.css';
import NotesTab from '../components/matters/NotesTab';

const COURT_STATIONS = [
  'Milimani Law Courts', 'Nairobi Chief Magistrate', 'Milimani Commercial Courts',
  'Milimani Children Court', 'Nairobi High Court', 'Court of Appeal Nairobi',
  'Mombasa High Court', 'Kisumu High Court', 'Nakuru High Court',
  'Eldoret High Court', 'Nyeri High Court', 'Machakos High Court', 'Other'
];

const STAFF_ROLES = ['Associate', 'Paralegal', 'Secretary'];

type TabKey = 'overview' | 'documents' | 'time' | 'billing'| 'notes' | 'timeline';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function toInputDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().split('T')[0];
}

// ── Timeline item type badge ───────────────────────────
function TypeBadge({ type, color }: { type: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
    }}>
      {type}
    </span>
  );
}

// ── Timeline tab ──────────────────────────────────────
function TimelineTab({ matterId }: { matterId: string }) {
  const [items, setItems]         = useState<CalendarFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    calendarService.getMatterTimeline(matterId)
      .then(setItems)
      .catch(() => toast.error('Failed to load timeline', 'Please try again.'))
      .finally(() => setIsLoading(false));
  }, [matterId]);

  if (isLoading) {
    return (
      <div style={{ padding: '20px 0' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-block" style={{ height: 56, marginBottom: 12, borderRadius: 6 }} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '40px 0' }}>
        <div className="empty-state-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        </div>
        <h3>No timeline events</h3>
        <p>Events and tasks linked to this matter will appear here.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {items.map(item => (
        <div key={item.id} style={{
          display: 'flex',
          gap: 14,
          padding: '14px 0',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            flexShrink: 0,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: item.color,
            marginTop: 5,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>
                {item.title}
              </span>
              <TypeBadge type={item.kind} color={item.color} />
              {item.isCompleted && (
                <span style={{
                  fontSize: 11, color: 'var(--green-700)', fontWeight: 600,
                  background: 'var(--green-50)', padding: '1px 6px', borderRadius: 999,
                }}>
                  ✓ Done
                </span>
              )}
              {item.priority && (
                <span style={{
                  fontSize: 11,
                  color: item.priority === 'High' ? '#B91C1C' : item.priority === 'Normal' ? '#1A5C52' : '#888',
                  fontWeight: 600,
                }}>
                  {item.priority}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 3 }}>
              {formatDateTime(item.date)}
              {item.location && ` · ${item.location}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Staff section (inside overview tab) ───────────────
function StaffSection({ matterId, initialStaff, allUsers, canManage }: {
  matterId: string;
  initialStaff: MatterStaffDto[];
  allUsers: LawyerOption[];
  canManage: boolean;
}) {
  const toast    = useToast();
  const confirm  = useConfirm();
  const [staff, setStaff]           = useState<MatterStaffDto[]>(initialStaff);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole]     = useState('Paralegal');
  const [isAdding, setIsAdding]     = useState(false);

  // Filter out users already on this matter
  const assignedIds = new Set(staff.map(s => s.userId));
  const available   = allUsers.filter(u => !assignedIds.has(u.id));

  const handleAdd = async () => {
    if (!selectedUserId) { toast.warning('Select a person', 'Please choose a staff member.'); return; }
    setIsAdding(true);
    try {
      await matterService.addStaff(matterId, { userId: selectedUserId, role: selectedRole });
      const updated = await matterService.getStaff(matterId);
      setStaff(updated);
      setSelectedUserId('');
      toast.success('Staff added', 'The team member has been assigned to this matter.');
    } catch (err: any) {
      toast.error('Failed to add staff', err?.response?.data?.message ?? 'Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (member: MatterStaffDto) => {
    const confirmed = await confirm({
      title:        'Remove staff member',
      message:      `Remove ${member.name} from this matter?`,
      confirmLabel: 'Remove',
      variant:      'danger',
    });
    if (!confirmed) return;
    try {
      await matterService.removeStaff(matterId, member.userId);
      setStaff(prev => prev.filter(s => s.userId !== member.userId));
      toast.success('Staff removed', `${member.name} has been removed from this matter.`);
    } catch {
      toast.error('Failed to remove staff', 'Please try again.');
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div className="info-card-header" style={{ paddingTop: 0 }}>
        <h3>Matter Team</h3>
      </div>

      {/* Current staff list */}
      {staff.length === 0 ? (
        <div style={{ padding: '12px 0', color: 'var(--text-soft)', fontSize: 13 }}>
          No additional staff assigned.
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {staff.map(member => (
            <div key={member.userId} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{member.name}</span>
                <span style={{
                  marginLeft: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'var(--green-50)',
                  color: 'var(--green-700)',
                }}>
                  {member.role}
                </span>
              </div>
              {canManage && (
                <button
                  className="doc-icon-btn doc-icon-btn-danger"
                  title="Remove"
                  onClick={() => handleRemove(member)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add staff row — Partners/Admins only */}
      {canManage && available.length > 0 && (
        <div className="form-row" style={{ marginTop: 8, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label>Add team member</label>
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
              <option value="">Select person…</option>
              {available.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Role</label>
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
              {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <button
              className="btn-primary"
              onClick={handleAdd}
              disabled={isAdding || !selectedUserId}
              style={{ marginBottom: 0 }}
            >
              {isAdding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────
export default function MatterDetail() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast    = useToast();
  const confirm  = useConfirm();
  const { user } = useAuth();

  const canManage = user?.role === 'Admin' || user?.role === 'Partner';
  const isAdmin   = user?.role === 'Admin';

  const [matter, setMatter]       = useState<MatterDto | null>(null);
  const [lawyers, setLawyers]     = useState<LawyerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const [form, setForm]           = useState<UpdateMatterRequest | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    if (!id) return;
    Promise.all([matterService.getById(id), clientService.getLawyers()])
      .then(([m, l]) => { setMatter(m); setLawyers(l); })
      .catch(() => toast.error('Failed to load matter', 'Please try again.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const startEdit = () => {
    if (!matter) return;
    setForm({
      title:            matter.title,
      jicmsCaseNumber:  matter.jicmsCaseNumber,
      courtStation:     matter.courtStation,
      status:           matter.status,
      assignedLawyerId: matter.assignedLawyerId,
      hearingDate:      toInputDate(matter.hearingDate),
      filingDeadline:   toInputDate(matter.filingDeadline),
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!form || !id) return;
    if (!form.title.trim()) { toast.warning('Title required', 'Please enter a matter title.'); return; }
    setIsSaving(true);
    try {
      const updated = await matterService.update(id, {
        ...form,
        hearingDate:    form.hearingDate    || null,
        filingDeadline: form.filingDeadline || null,
      });
      setMatter(updated);
      setIsEditing(false);
      toast.success('Matter updated', 'Changes have been saved.');
    } catch (err: any) {
      toast.error('Update failed', err?.response?.data?.message ?? 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = async () => {
    if (!matter || !id) return;
    const confirmed = await confirm({
      title:        'Close Matter',
      message:      `"${matter.title}" will be marked as closed. You can reopen it later if needed.`,
      confirmLabel: 'Close Matter',
      variant:      'warning',
    });
    if (!confirmed) return;
    try {
      await matterService.close(id);
      setMatter({ ...matter, status: 'Closed' });
      toast.success('Matter closed', `"${matter.title}" has been closed.`);
    } catch {
      toast.error('Failed to close matter', 'Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!matter || !id) return;
    const confirmed = await confirm({
      title:        'Delete Matter',
      message:      `This will permanently delete "${matter.title}" and all associated data. This action cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant:      'danger',
    });
    if (!confirmed) return;
    try {
      await matterService.delete(id);
      toast.success('Matter deleted', `"${matter.title}" has been removed.`);
      navigate('/matters');
    } catch {
      toast.error('Delete failed', 'Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="detail-page">
        <div className="skeleton-block" style={{ height: 24, width: 120, marginBottom: 24 }} />
        <div className="skeleton-block" style={{ height: 36, width: 320, marginBottom: 8 }} />
        <div className="skeleton-block" style={{ height: 16, width: 180, marginBottom: 32 }} />
        <div className="skeleton-block" style={{ height: 280, borderRadius: 6 }} />
      </div>
    );
  }

  if (!matter) {
    return (
      <div className="detail-page">
        <div className="empty-state">
          <h3>Matter not found</h3>
          <p>This matter may have been deleted.</p>
          <button className="btn-secondary" style={{ marginTop: 16 }}
            onClick={() => navigate('/matters')}>Back to Matters</button>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <Link to="/matters" className="back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to Matters
      </Link>

      {/* Header */}
      <div className="detail-header">
        <div className="detail-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1>{matter.title}</h1>
            <span className={`badge ${matter.status === 'Active' ? 'badge-active' : 'badge-closed'}`}>
              {matter.status}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 6 }}>
            {matter.clientName}
            {matter.jicmsCaseNumber && ` · ${matter.jicmsCaseNumber}`}
          </div>
        </div>

        {canManage && !isEditing && (
          <div className="detail-header-actions">
            <button className="btn-secondary" onClick={startEdit}>Edit</button>
            {matter.status === 'Active' && (
              <button className="btn-secondary" onClick={handleClose}>Close Matter</button>
            )}
            {isAdmin && (
              <button className="btn-danger" onClick={handleDelete}>Delete</button>
            )}
          </div>
        )}

        {isEditing && (
          <div className="detail-header-actions">
            <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-strip">
        {(['overview','documents','time','billing' ,'notes','timeline'] as TabKey[]).map(tab => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="info-card">
          <div className="info-card-header"><h3>Matter Details</h3></div>
          <div className="info-card-body">
            {isEditing && form ? (
              <>
                <div className="form-group">
                  <label>Matter Title *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                  />
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
                      {COURT_STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
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
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assigned Lawyer</label>
                    <select
                      value={form.assignedLawyerId ?? ''}
                      onChange={e => setForm({ ...form, assignedLawyerId: e.target.value || null })}
                    >
                      <option value="">Unassigned</option>
                      {lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="info-row">
                  <span className="info-label">Client</span>
                  <span className="info-value">
                    <Link to={`/clients/${matter.clientId}`}
                      style={{ color: 'var(--green-700)', textDecoration: 'none' }}>
                      {matter.clientName}
                    </Link>
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">JICMS Case No.</span>
                  <span className="info-value">{matter.jicmsCaseNumber || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Court Station</span>
                  <span className="info-value">{matter.courtStation || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Next Hearing</span>
                  <span className="info-value">
                    {matter.hearingDate
                      ? <span className="badge badge-gold">{formatDate(matter.hearingDate)}</span>
                      : '—'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Filing Deadline</span>
                  <span className="info-value">
                    {matter.filingDeadline
                      ? <span className="badge badge-gold">{formatDate(matter.filingDeadline)}</span>
                      : '—'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Lead Lawyer</span>
                  <span className="info-value">{matter.assignedLawyerName || 'Unassigned'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Opened</span>
                  <span className="info-value">{formatDate(matter.createdAt)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Last Updated</span>
                  <span className="info-value">{formatDate(matter.updatedAt)}</span>
                </div>
              </>
            )}

            {/* ── Matter Team (always visible, not edit-mode gated) ── */}
            {!isEditing && (
              <StaffSection
                matterId={matter.id}
                initialStaff={matter.staff ?? []}
                allUsers={lawyers}
                canManage={canManage}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="info-card">
          <div className="info-card-header"><h3>Documents</h3></div>
          <div style={{ padding: '0 20px 20px' }}>
            <DocumentsTab
              matterId={matter.id}
              canUpload={canManage}
              canDelete={isAdmin || user?.role === 'Partner'}
            />
          </div>
        </div>
      )}

      {activeTab === 'time' && (
        <div className="info-card">
          <div className="info-card-header"><h3>Time Tracking</h3></div>
          <div style={{ padding: '0 20px 20px' }}>
            <TimeTrackingTab matterId={matter.id} />
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="info-card">
          <div className="info-card-header"><h3>Billing</h3></div>
          <div style={{ padding: '0 20px 20px' }}>
            <BillingTab matterId={matter.id} />
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="info-card">
         <div className="info-card-header"><h3>Notes & Messages</h3></div>
         <div style={{ padding: '0 20px 20px' }}>
          <NotesTab matterId={matter.id} />
       </div>
      </div>
   )}

      {activeTab === 'timeline' && (
        <div className="info-card">
          <div className="info-card-header"><h3>Timeline</h3></div>
          <div style={{ padding: '0 20px 20px' }}>
            <TimelineTab matterId={matter.id} />
          </div>
        </div>
      )}
    </div>
  );
}