// src/pages/Clients.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import clientService, { ClientDto, CreateClientRequest } from '../services/clientService';
import { useToast } from '../components/auth/Toast';
import { useConfirm } from '../components/auth/ConfirmDialog';
import { useAuth } from '../store/AuthContext';
import './Phase4.css';

const EMPTY_FORM: CreateClientRequest = {
  name: '', email: '', phone: '', address: '',
};

export default function Clients() {
  const navigate = useNavigate();
  const toast    = useToast();
  const confirm  = useConfirm();
  const { user } = useAuth();

  const canManage = user?.role === 'Admin' || user?.role === 'Partner';

  const [clients, setClients]         = useState<ClientDto[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [search, setSearch]           = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [editingClient, setEditingClient] = useState<ClientDto | null>(null);
  const [form, setForm]               = useState<CreateClientRequest>(EMPTY_FORM);
  const [isSaving, setIsSaving]       = useState(false);

  const loadClients = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await clientService.getAll(search || undefined);
      setClients(data);
    } catch {
      toast.error('Failed to load clients', 'Please refresh and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(loadClients, 300);
    return () => clearTimeout(t);
  }, [loadClients]);

  const openCreate = () => {
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (client: ClientDto, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
    setForm({ name: client.name, email: client.email, phone: client.phone, address: client.address });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.warning('Required fields missing', 'Name and email address are required.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingClient) {
        await clientService.update(editingClient.id, form);
        toast.success('Client updated', `${form.name}'s details have been saved.`);
      } else {
        await clientService.create(form);
        toast.success('Client added', `${form.name} has been added to the system.`);
      }
      setShowModal(false);
      loadClients();
    } catch (err: any) {
      toast.error(
        editingClient ? 'Update failed' : 'Could not add client',
        err?.response?.data?.message ?? 'Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (client: ClientDto, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title:        'Delete Client',
      message:      `This will permanently remove ${client.name} from the system. This action cannot be undone. Clients with active matters cannot be deleted.`,
      confirmLabel: 'Delete Client',
      variant:      'danger',
    });
    if (!confirmed) return;
    try {
      await clientService.delete(client.id);
      toast.success('Client deleted', `${client.name} has been removed.`);
      loadClients();
    } catch (err: any) {
      toast.error('Delete failed', err?.response?.data?.message ?? 'Please try again.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <div className="page-header-meta">
            {isLoading ? 'Loading…' : `${clients.length} client${clients.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={openCreate}>+ Add Client</button>
        )}
      </div>

      {/* Search */}
      <div className="toolbar">
        <div className="search-input-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21 21-4.34-4.34M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
          </svg>
          <input
            className="search-input"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="data-table-wrapper" style={{ padding: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-block"
              style={{ height: 48, marginBottom: 8, opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="data-table-wrapper">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
              </svg>
            </div>
            <h3>{search ? 'No clients found' : 'No clients yet'}</h3>
            <p>{search ? 'Try a different search term.' : 'Add your first client to get started.'}</p>
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Matters</th>
                <th>Added</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id} onClick={() => navigate(`/clients/${client.id}`)}>
                  <td style={{ fontWeight: 600, color: 'var(--green-900)' }}>{client.name}</td>
                  <td style={{ color: 'var(--text-mid)' }}>{client.email}</td>
                  <td style={{ color: 'var(--text-mid)' }}>{client.phone || '—'}</td>
                  <td>
                    <span className={`badge ${client.matterCount > 0 ? 'badge-active' : 'badge-closed'}`}>
                      {client.matterCount} {client.matterCount === 1 ? 'matter' : 'matters'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-soft)', fontSize: 12.5 }}>
                    {new Date(client.createdAt).toLocaleDateString('en-KE', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </td>
                  {canManage && (
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-ghost" onClick={e => openEdit(client, e)}>Edit</button>
                        {user?.role === 'Admin' && (
                          <button className="btn-danger" style={{ padding: '5px 12px', fontSize: 12 }}
                            onClick={e => handleDelete(client, e)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
            <p className="modal-sub">
              {editingClient
                ? 'Update the client\'s details below.'
                : 'Enter the client\'s details. They can be linked to a user account later.'}
            </p>

            <div className="form-group">
              <label>Full Name / Organisation *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Wanjiku Kamau or Lakeside Developers Ltd"
              />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="client@example.co.ke"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+254 700 000 000"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Physical or postal address"
                rows={2}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving…' : editingClient ? 'Save Changes' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}