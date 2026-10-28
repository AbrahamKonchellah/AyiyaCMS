// src/pages/AdminPanel.tsx
import { useState, useEffect } from 'react';
import adminService, { UserDto, InviteUserRequest } from '../services/adminService';
import { useToast } from '../components/auth/Toast';
import { useConfirm } from '../components/auth/ConfirmDialog';
import './AdminPanel.css';

const ROLES = ['Admin', 'Partner', 'Associate', 'Paralegal', 'Client', 'Auditor'];

export default function AdminPanel() {
  const toast   = useToast();
  const confirm = useConfirm();

  const [users, setUsers]               = useState<UserDto[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm]     = useState<InviteUserRequest>({
    firstName: '', lastName: '', email: '', role: 'Associate',
  });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getUsers();
      setUsers(data);
    } catch {
      toast.error('Failed to load users', 'Please refresh the page and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.firstName || !inviteForm.lastName || !inviteForm.email) {
      toast.warning('Incomplete form', 'Please fill in all fields before sending the invitation.');
      return;
    }
    try {
      await adminService.inviteUser(inviteForm);
      toast.success(
        'Invitation sent',
        `A password setup email has been sent to ${inviteForm.email}.`
      );
      setShowInviteForm(false);
      setInviteForm({ firstName: '', lastName: '', email: '', role: 'Associate' });
      loadUsers();
    } catch {
      toast.error(
        'Invitation failed',
        'A user with this email address may already exist.'
      );
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await adminService.updateRole(id, role);
      setUsers(users.map(u => u.id === id ? { ...u, role } : u));
      toast.success('Role updated', `User role changed to ${role}.`);
    } catch {
      toast.error('Failed to update role', 'Please try again.');
    }
  };

  const handleToggleActive = async (user: UserDto) => {
    const action   = user.isActive ? 'deactivate' : 'reactivate';
    const fullName = `${user.firstName} ${user.lastName}`;

    const confirmed = await confirm({
      title:        user.isActive ? 'Deactivate User' : 'Reactivate User',
      message:      user.isActive
        ? `${fullName} will lose access to AyiyaCMS immediately. You can reactivate them at any time.`
        : `${fullName} will regain access to AyiyaCMS with their previous role.`,
      confirmLabel: user.isActive ? 'Deactivate' : 'Reactivate',
      cancelLabel:  'Cancel',
      variant:      user.isActive ? 'danger' : 'default',
    });

    if (!confirmed) return;

    try {
      if (user.isActive) {
        await adminService.deactivateUser(user.id);
      } else {
        await adminService.reactivateUser(user.id);
      }
      setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
      toast.success(
        user.isActive ? 'User deactivated' : 'User reactivated',
        `${fullName}'s account has been ${action}d.`
      );
    } catch {
      toast.error(`Failed to ${action} user`, 'Please try again.');
    }
  };

  const handleResetPassword = async (user: UserDto) => {
    const fullName = `${user.firstName} ${user.lastName}`;

    const confirmed = await confirm({
      title:        'Reset Password',
      message:      `A password reset link will be emailed to ${fullName} at ${user.email}. Their current password will be invalidated immediately.`,
      confirmLabel: 'Send Reset Link',
      cancelLabel:  'Cancel',
      variant:      'warning',
    });

    if (!confirmed) return;

    try {
      await adminService.resetPassword(user.id);
      toast.success(
        'Reset link sent',
        `A password reset email has been sent to ${user.email}.`
      );
    } catch {
      toast.error('Reset failed', 'Please try again or contact support.');
    }
  };

  return (
    <div className="admin-panel">

      <div className="admin-header">
        <h1>User Management</h1>
        <button className="btn-primary" onClick={() => setShowInviteForm(true)}>
          + Invite User
        </button>
      </div>

      {/* Invite modal */}
      {showInviteForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Invite New User</h2>
            <p>A secure password setup link will be emailed to them directly.</p>
            <div className="form-group">
              <label>First Name</label>
              <input
                value={inviteForm.firstName}
                onChange={e => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                placeholder="Jane"
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                value={inviteForm.lastName}
                onChange={e => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                placeholder="Doe"
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="jane@lawfirm.co.ke"
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={inviteForm.role}
                onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowInviteForm(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleInvite}>
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-row" style={{ opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>MFA</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className={!user.isActive ? 'inactive-row' : ''}>
                  <td style={{ fontWeight: 500 }}>{user.firstName} {user.lastName}</td>
                  <td style={{ color: 'var(--text-mid)' }}>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${user.mfaEnabled ? 'badge-green' : 'badge-gray'}`}>
                      {user.mfaEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.isActive ? 'badge-green' : 'badge-red'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="action-buttons">
                    <button
                      className={user.isActive ? 'btn-warning' : 'btn-success'}
                      onClick={() => handleToggleActive(user)}
                    >
                      {user.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleResetPassword(user)}
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}