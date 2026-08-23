import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/adminService';

export default function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({ status: '', priority_level: '' });
  const { showToast } = useToast();

  const fetchTasks = () => {
    adminService.getTasks(filters).then((res) => setTasks(res.data || []));
  };

  useEffect(() => { fetchTasks(); }, [filters]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete task "${title}"?`)) return;
    await adminService.deleteTask(id);
    showToast('Task deleted', 'success');
    fetchTasks();
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title text-2xl">Task Monitoring</h1>
          <p className="page-subtitle">View and manage all user tasks</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="input w-auto">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <select value={filters.priority_level} onChange={(e) => setFilters({ ...filters, priority_level: e.target.value })} className="input w-auto">
            <option value="">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="card p-4 flex justify-between items-center card-hover">
              <div>
                <p className="font-medium text-sm">{t.title}</p>
                <p className="text-xs text-[var(--app-text-muted)]">{t.user?.name} · Score {t.priority_score} · {t.status}</p>
              </div>
              <button type="button" onClick={() => handleDelete(t.id, t.title)} className="btn btn-ghost btn-sm text-[#EF4444]">Delete</button>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
