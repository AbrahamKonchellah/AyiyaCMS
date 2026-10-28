// src/pages/ClientProfile.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import clientService, { ClientDto } from '../services/clientService';
import { MatterDto } from '../services/matterService';
import { useToast } from '../components/auth/Toast';
import { useAuth } from '../store/AuthContext';
import './Phase4.css';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function ClientProfile() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast    = useToast();
  const { user } = useAuth();

  const canManage = user?.role === 'Admin' || user?.role === 'Partner';

  const [client, setClient]   = useState<ClientDto | null>(null);
  const [matters, setMatters] = useState<MatterDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    clientService.getById(id)
      .then(({ client, matters }) => { setClient(client); setMatters(matters); })
      .catch(() => toast.error('Failed to load client', 'Please try again.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="detail-page">
        <div className="skeleton-block" style={{ height: 24, width: 120, marginBottom: 24 }} />
        <div className="skeleton-block" style={{ height: 36, width: 260, marginBottom: 8 }} />
        <div className="skeleton-block" style={{ height: 16, width: 180, marginBottom: 32 }} />
        <div className="skeleton-block" style={{ height: 200, borderRadius: 6 }} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="detail-page">
        <div className="empty-state">
          <h3>Client not found</h3>
          <p>This client may have been removed.</p>
          <button className="btn-secondary" style={{ marginTop: 16 }}
            onClick={() => navigate('/clients')}>
            Back to Clients
          </button>
        </div>
      </div>
    );
  }

  const activeMatters = matters.filter(m => m.status === 'Active');
  const closedMatters = matters.filter(m => m.status !== 'Active');

  return (
    <div className="detail-page">
      <Link to="/clients" className="back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to Clients
      </Link>

      {/* Header */}
      <div className="detail-header">
        <div className="detail-header-left">
          <h1>{client.name}</h1>
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <span className="badge badge-active">{activeMatters.length} active</span>
            {closedMatters.length > 0 && (
              <span className="badge badge-closed">{closedMatters.length} closed</span>
            )}
          </div>
        </div>
        {canManage && (
          <div className="detail-header-actions">
            <button
              className="btn-primary"
              onClick={() => navigate(`/matters/new?clientId=${client.id}&clientName=${encodeURIComponent(client.name)}`)}>
              + New Matter
            </button>
          </div>
        )}
      </div>

      <div className="detail-grid">
        {/* Left — matters */}
        <div>
          {/* Active matters */}
          <div className="info-card">
            <div className="info-card-header">
              <h3>Active Matters</h3>
            </div>
            {activeMatters.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 20px' }}>
                <p>No active matters for this client.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Matter</th>
                    <th>Court / Station</th>
                    <th>Next Hearing</th>
                    <th>Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMatters.map(m => (
                    <tr key={m.id} onClick={() => navigate(`/matters/${m.id}`)}>
                      <td style={{ fontWeight: 600, color: 'var(--green-900)' }}>
                        <div>{m.title}</div>
                        {m.jicmsCaseNumber && (
                          <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 2 }}>
                            {m.jicmsCaseNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-mid)' }}>{m.courtStation || '—'}</td>
                      <td>
                        {m.hearingDate ? (
                          <span className="badge badge-gold">{formatDate(m.hearingDate)}</span>
                        ) : '—'}
                      </td>
                      <td style={{ color: 'var(--text-mid)' }}>{m.assignedLawyerName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Closed matters */}
          {closedMatters.length > 0 && (
            <div className="info-card">
              <div className="info-card-header">
                <h3>Closed Matters</h3>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Matter</th>
                    <th>Court / Station</th>
                    <th>Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {closedMatters.map(m => (
                    <tr key={m.id} onClick={() => navigate(`/matters/${m.id}`)}>
                      <td style={{ color: 'var(--text-mid)' }}>{m.title}</td>
                      <td style={{ color: 'var(--text-mid)' }}>{m.courtStation || '—'}</td>
                      <td style={{ color: 'var(--text-soft)', fontSize: 12.5 }}>
                        {formatDate(m.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right — client details */}
        <div>
          <div className="info-card">
            <div className="info-card-header">
              <h3>Client Details</h3>
              {canManage && (
                <button className="btn-ghost" style={{ fontSize: 12 }}
                  onClick={() => navigate(`/clients/${client.id}/edit`)}>
                  Edit
                </button>
              )}
            </div>
            <div className="info-card-body">
              <div className="info-row">
                <span className="info-label">Email</span>
                <span className="info-value">
                  <a href={`mailto:${client.email}`}
                    style={{ color: 'var(--green-700)', textDecoration: 'none' }}>
                    {client.email}
                  </a>
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Phone</span>
                <span className="info-value">{client.phone || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Address</span>
                <span className="info-value" style={{ whiteSpace: 'pre-line' }}>
                  {client.address || '—'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Client since</span>
                <span className="info-value">{formatDate(client.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}