import { useEffect, useState } from 'react';
import { FiCheckSquare, FiFilter, FiTrash2, FiUser } from 'react-icons/fi';
import AdminLayout from '../../components/AdminLayout';
import PriorityBadge from '../../components/PriorityBadge';
import ScoreRing from '../../components/ScoreRing';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/adminService';

export default function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority_level: '' });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, task: null });
  const { showToast } = useToast();

  const fetchTasks = () => {
    setLoading(true);
    adminService
      .getTasks(filters)
      .then((res) => setTasks(res.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  const confirmDelete = async () => {
    if (!deleteConfirm.task) return;
    try {
      await adminService.deleteTask(deleteConfirm.task.id);
      showToast(`Task "${deleteConfirm.task.title}" deleted`, 'success');
      fetchTasks();
    } catch {
      showToast('Failed to delete task', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, task: null });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in max-w-7xl">
        <div className="flex justify-between items-center flex-wrap gap-4 pb-2 border-b border-[var(--app-border)]">
          <div>
            <h1 className="page-title">Global Task Monitoring</h1>
            <p className="page-subtitle text-xs sm:text-sm">
              Cross-user inspection of task backlogs, deadlines, and computed priority scores
            </p>
          </div>

          <div className="flex gap-2.5 items-center">
            <div className="flex items-center gap-1.5 text-xs text-[var(--app-text-muted)] mr-1">
              <FiFilter size={13} />
              <span className="font-semibold uppercase text-[10px]">Filter:</span>
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input w-auto text-xs py-1.5"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={filters.priority_level}
              onChange={(e) => setFilters({ ...filters, priority_level: e.target.value })}
              className="input w-auto text-xs py-1.5"
            >
              <option value="">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton variant="task-card" count={4} />
        ) : tasks.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={FiCheckSquare}
              title="No Tasks Found"
              description="No tasks match the active status and priority criteria."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="card p-4 flex items-center justify-between gap-4 card-hover shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <ScoreRing score={t.priority_score} variant="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <PriorityBadge level={t.priority_level} />
                      <span
                        className={`badge ${
                          t.status === 'completed' ? 'badge-success' : 'badge-neutral'
                        } text-[10px] uppercase`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-[var(--app-text)] truncate">{t.title}</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--app-text-muted)] mt-1">
                      <span className="flex items-center gap-1">
                        <FiUser size={12} className="text-[#2563EB]" /> {t.user?.name || 'Unknown User'}
                      </span>
                      {t.due_date && <span>· Due: {t.due_date}</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ isOpen: true, task: t })}
                  className="btn btn-ghost btn-sm text-[#EF4444] shrink-0"
                  title="Delete Task"
                >
                  <FiTrash2 size={15} />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Delete Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="Delete Task"
          message={`Are you sure you want to administratively delete "${deleteConfirm.task?.title}"?`}
          confirmLabel="Delete Task"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm({ isOpen: false, task: null })}
        />
      </div>
    </AdminLayout>
  );
}
