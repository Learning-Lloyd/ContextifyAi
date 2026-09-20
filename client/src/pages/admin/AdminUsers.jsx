import { useEffect, useState } from 'react';
import { FiEdit2, FiKey, FiSearch, FiTrash2, FiUser } from 'react-icons/fi';
import AdminLayout from '../../components/AdminLayout';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/adminService';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, user: null });
  const [form, setForm] = useState({ role: 'user', is_active: true });
  const [passwordForm, setPasswordForm] = useState({ password: '', password_confirmation: '' });
  const { showToast } = useToast();

  const fetchUsers = () => {
    setLoading(true);
    adminService
      .getUsers({ search })
      .then((res) => setUsers(res.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const handleToggle = async (id) => {
    await adminService.toggleUserActive(id);
    showToast('User status updated successfully', 'success');
    fetchUsers();
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.user) return;
    try {
      await adminService.deleteUser(deleteConfirm.user.id);
      showToast(`User "${deleteConfirm.user.name}" deleted`, 'success');
      fetchUsers();
    } catch {
      showToast('Failed to delete user', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, user: null });
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ role: user.role, is_active: user.is_active });
  };

  const saveEdit = async () => {
    await adminService.updateUser(editingUser.id, form);
    showToast('User profile & permissions updated', 'success');
    setEditingUser(null);
    fetchUsers();
  };

  const savePassword = async () => {
    if (passwordForm.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (passwordForm.password !== passwordForm.password_confirmation) {
      showToast('Passwords do not match', 'error');
      return;
    }
    await adminService.resetPassword(resetUser.id, passwordForm);
    showToast('Password successfully reset', 'success');
    setResetUser(null);
    setPasswordForm({ password: '', password_confirmation: '' });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in max-w-7xl">
        <div className="flex justify-between items-center flex-wrap gap-4 pb-2 border-b border-[var(--app-border)]">
          <div>
            <h1 className="page-title">User Account Directory</h1>
            <p className="page-subtitle text-xs sm:text-sm">
              Manage system permissions, account access states, and administrative roles
            </p>
          </div>

          <div className="relative w-64">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"
              size={15}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="input pl-9 text-xs sm:text-sm"
              aria-label="Search users"
            />
          </div>
        </div>

        {loading ? (
          <div className="table-container">
            <table className="table-modern">
              <tbody>
                <LoadingSkeleton variant="table-row" count={5} cols={6} />
              </tbody>
            </table>
          </div>
        ) : users.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={FiUser}
              title="No Users Found"
              description="No user records matched your current query."
            />
          </div>
        ) : (
          <div className="table-container shadow-sm">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>User Identity</th>
                  <th>Email</th>
                  <th>System Role</th>
                  <th>Tasks Logged</th>
                  <th>Account State</th>
                  <th className="text-right">Manage</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--app-hover)] transition-colors">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-[var(--app-text)]">{u.name}</span>
                      </div>
                    </td>
                    <td className="text-xs text-[var(--app-text-secondary)] font-mono">{u.email}</td>
                    <td>
                      <span
                        className={`badge ${
                          u.role === 'admin' ? 'badge-primary font-bold' : 'badge-neutral'
                        } text-xs uppercase tracking-wider`}
                      >
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="font-semibold text-xs font-mono">{u.tasks_count}</td>
                    <td>
                      <span
                        className={`badge ${
                          u.is_active ? 'badge-success' : 'badge-danger'
                        } text-xs font-semibold`}
                      >
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="btn btn-ghost btn-sm text-xs text-[#2563EB]"
                          title="Edit Role & Status"
                        >
                          <FiEdit2 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetUser(u)}
                          className="btn btn-ghost btn-sm text-xs text-[#14B8A6]"
                          title="Reset Password"
                        >
                          <FiKey size={13} /> Key
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(u.id)}
                          className={`btn btn-ghost btn-sm text-xs ${
                            u.is_active ? 'text-[#F59E0B]' : 'text-[#22C55E]'
                          }`}
                          title={u.is_active ? 'Disable Account' : 'Enable Account'}
                        >
                          {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm({ isOpen: true, user: u })}
                          className="btn btn-ghost btn-sm text-xs text-[#EF4444]"
                          title="Delete User"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
            <div className="card p-6 w-full max-w-md space-y-4 animate-fade-in shadow-2xl" role="dialog">
              <h3 className="text-base font-bold text-[var(--app-text)]">
                Edit Permissions: {editingUser.name}
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="label">User Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="input"
                  >
                    <option value="user">Standard User</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--app-text)] cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB]"
                  />
                  Account is enabled and active
                </label>
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t border-[var(--app-border)]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="button" onClick={saveEdit} className="btn btn-primary btn-sm">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Modal */}
        {resetUser && (
          <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
            <div className="card p-6 w-full max-w-md space-y-4 animate-fade-in shadow-2xl" role="dialog">
              <h3 className="text-base font-bold text-[var(--app-text)]">
                Reset Password: {resetUser.name}
              </h3>
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="New temporary password"
                  value={passwordForm.password}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, password: e.target.value })
                  }
                  className="input text-xs"
                />
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={passwordForm.password_confirmation}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      password_confirmation: e.target.value,
                    })
                  }
                  className="input text-xs"
                />
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t border-[var(--app-border)]">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="button" onClick={savePassword} className="btn btn-primary btn-sm">
                  Apply New Password
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="Delete User Account"
          message={`Are you sure you want to permanently delete user "${deleteConfirm.user?.name}"? All associated tasks and decision records will be removed.`}
          confirmLabel="Delete User"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm({ isOpen: false, user: null })}
        />
      </div>
    </AdminLayout>
  );
}
