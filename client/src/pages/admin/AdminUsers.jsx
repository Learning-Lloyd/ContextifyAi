import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/adminService';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [form, setForm] = useState({ role: 'user', is_active: true });
  const [passwordForm, setPasswordForm] = useState({ password: '', password_confirmation: '' });
  const { showToast } = useToast();

  const fetchUsers = () => {
    setLoading(true);
    adminService.getUsers({ search }).then((res) => setUsers(res.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [search]);

  const handleToggle = async (id) => {
    await adminService.toggleUserActive(id);
    showToast('User status updated', 'success');
    fetchUsers();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    await adminService.deleteUser(id);
    showToast('User deleted', 'success');
    fetchUsers();
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ role: user.role, is_active: user.is_active });
  };

  const saveEdit = async () => {
    await adminService.updateUser(editingUser.id, form);
    showToast('User updated', 'success');
    setEditingUser(null);
    fetchUsers();
  };

  const savePassword = async () => {
    if (passwordForm.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    await adminService.resetPassword(resetUser.id, passwordForm);
    showToast('Password reset', 'success');
    setResetUser(null);
    setPasswordForm({ password: '', password_confirmation: '' });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="page-title text-2xl">User Management</h1>
            <p className="page-subtitle">Manage user accounts and permissions</p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="input w-64"
            aria-label="Search users"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Tasks</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="badge badge-neutral capitalize">{u.role}</span></td>
                    <td>{u.tasks_count}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openEdit(u)} className="text-[#2563EB] text-xs font-medium hover:underline">Edit</button>
                        <button type="button" onClick={() => setResetUser(u)} className="text-[#14B8A6] text-xs font-medium hover:underline">Reset PW</button>
                        <button type="button" onClick={() => handleToggle(u.id)} className="text-[#F59E0B] text-xs font-medium hover:underline">{u.is_active ? 'Disable' : 'Enable'}</button>
                        <button type="button" onClick={() => handleDelete(u.id, u.name)} className="text-[#EF4444] text-xs font-medium hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editingUser && (
          <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
            <div className="card p-6 w-full max-w-md space-y-4 animate-fade-in" role="dialog">
              <h3 className="section-title">Edit {editingUser.name}</h3>
              <label className="block text-sm">
                <span className="label">Role</span>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-[#2563EB]" />
                Active account
              </label>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setEditingUser(null)} className="btn btn-secondary">Cancel</button>
                <button type="button" onClick={saveEdit} className="btn btn-primary">Save</button>
              </div>
            </div>
          </div>
        )}

        {resetUser && (
          <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
            <div className="card p-6 w-full max-w-md space-y-4 animate-fade-in" role="dialog">
              <h3 className="section-title">Reset password for {resetUser.name}</h3>
              <input type="password" placeholder="New password" value={passwordForm.password} onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} className="input" />
              <input type="password" placeholder="Confirm password" value={passwordForm.password_confirmation} onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })} className="input" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setResetUser(null)} className="btn btn-secondary">Cancel</button>
                <button type="button" onClick={savePassword} className="btn btn-primary">Reset</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
