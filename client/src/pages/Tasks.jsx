import { useCallback, useEffect, useState } from 'react';
import {
  FiArchive,
  FiCopy,
  FiFilter,
  FiPlus,
  FiRotateCcw,
  FiSearch,
} from 'react-icons/fi';
import Layout from '../components/Layout';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useToast } from '../hooks/useToast';
import { taskService } from '../services/taskService';

const SORT_OPTIONS = [
  { value: 'priority_score', label: 'Priority Score' },
  { value: 'due_date', label: 'Deadline Proximity' },
  { value: 'importance', label: 'Importance' },
  { value: 'urgency', label: 'Urgency' },
  { value: 'created_at', label: 'Created Date' },
  { value: 'title', label: 'Alphabetical Title' },
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, taskId: null });
  const [filters, setFilters] = useState({
    search: '',
    sort: 'priority_score',
    direction: 'desc',
    status: '',
    category: '',
    priority_level: '',
    archived: false,
  });
  const { showToast } = useToast();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        sort: filters.sort,
        direction: filters.direction,
        archived: filters.archived ? 1 : 0,
      };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.priority_level) params.priority_level = filters.priority_level;

      const result = await taskService.getAll(params);
      setTasks(result.tasks || []);
      setCategories(result.categories || []);
    } catch {
      showToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    const timer = setTimeout(fetchTasks, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchTasks, filters.search]);

  const handleCreate = async (formData) => {
    setFormLoading(true);
    try {
      await taskService.create(formData);
      showToast('Task created successfully', 'success');
      await fetchTasks();
    } catch {
      showToast('Failed to create task', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (formData) => {
    setFormLoading(true);
    try {
      await taskService.update(editingTask.id, formData);
      showToast('Task updated successfully', 'success');
      await fetchTasks();
    } catch {
      showToast('Failed to update task', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (id) => {
    await taskService.toggleComplete(id);
    await fetchTasks();
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.taskId) return;
    try {
      await taskService.delete(deleteConfirm.taskId);
      showToast('Task deleted successfully', 'success');
      await fetchTasks();
    } catch {
      showToast('Failed to delete task', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, taskId: null });
    }
  };

  const handleArchive = async (id) => {
    await taskService.archive(id);
    showToast('Task moved to archive', 'success');
    await fetchTasks();
  };

  const handleRestore = async (id) => {
    await taskService.restore(id);
    showToast('Task restored to active view', 'success');
    await fetchTasks();
  };

  const handleDuplicate = async (id) => {
    await taskService.duplicate(id);
    showToast('Task cloned with recalculated factors', 'success');
    await fetchTasks();
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--app-border)]">
          <div>
            <h1 className="page-title">Tasks Management</h1>
            <p className="page-subtitle text-xs sm:text-sm">
              Search, filter, organize, and inspect all contextual priority scores
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setFormOpen(true);
            }}
            className="btn btn-primary text-xs sm:text-sm shadow-sm"
          >
            <FiPlus size={16} />
            New Task
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="card p-4 space-y-3.5 shadow-sm">
          {/* Row 1: Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"
                size={16}
              />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search title, description, category, location..."
                className="input pl-9 text-xs sm:text-sm"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <select
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="input text-xs sm:text-sm w-44"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.direction}
                onChange={(e) => updateFilter('direction', e.target.value)}
                className="input text-xs sm:text-sm w-28"
              >
                <option value="desc">High → Low</option>
                <option value="asc">Low → High</option>
              </select>
            </div>
          </div>

          {/* Row 2: Status, Category, Priority Filters */}
          <div className="flex flex-wrap gap-2.5 items-center pt-2 border-t border-[var(--app-border)] text-xs">
            <div className="flex items-center gap-1.5 text-[var(--app-text-muted)] mr-1">
              <FiFilter size={14} />
              <span className="font-semibold uppercase tracking-wider text-[10px]">Filter:</span>
            </div>

            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="input w-auto text-xs py-1.5 px-2.5"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="input w-auto text-xs py-1.5 px-2.5"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={filters.priority_level}
              onChange={(e) => updateFilter('priority_level', e.target.value)}
              className="input w-auto text-xs py-1.5 px-2.5"
            >
              <option value="">All Priorities</option>
              <option value="high">High Priority (≥8.0)</option>
              <option value="medium">Medium Priority (5.0–7.9)</option>
              <option value="low">Low Priority (&lt;5.0)</option>
            </select>

            <label className="flex items-center gap-2 text-xs font-medium text-[var(--app-text-secondary)] ml-auto cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.archived}
                onChange={(e) => updateFilter('archived', e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#2563EB] focus:ring-blue-500 cursor-pointer"
              />
              Show archived
            </label>
          </div>
        </div>

        {/* Task List Content */}
        {loading ? (
          <LoadingSkeleton variant="task-card" count={4} />
        ) : tasks.length === 0 ? (
          <div className="card">
            <EmptyState
              title="No tasks match your criteria"
              description="Try adjusting your search terms or clearing your filters to see active tasks."
              action={{
                label: 'Create New Task',
                icon: FiPlus,
                onClick: () => {
                  setEditingTask(null);
                  setFormOpen(true);
                },
              }}
            />
          </div>
        ) : (
          <div className="space-y-3.5">
            {tasks.map((task) => (
              <div key={task.id} className="group relative">
                <TaskCard
                  task={task}
                  onToggle={handleToggle}
                  onDelete={(id) => setDeleteConfirm({ isOpen: true, taskId: id })}
                  onEdit={(t) => {
                    setEditingTask(t);
                    setFormOpen(true);
                  }}
                />
                {/* Secondary Quick Action Bar */}
                <div className="flex items-center gap-2 mt-1.5 ml-4 text-[11px] text-[var(--app-text-muted)]">
                  {task.is_archived ? (
                    <button
                      type="button"
                      onClick={() => handleRestore(task.id)}
                      className="hover:text-[#2563EB] inline-flex items-center gap-1 transition-colors"
                    >
                      <FiRotateCcw size={11} /> Restore Task
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleArchive(task.id)}
                      className="hover:text-[var(--app-text)] inline-flex items-center gap-1 transition-colors"
                    >
                      <FiArchive size={11} /> Archive
                    </button>
                  )}
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(task.id)}
                    className="hover:text-[#2563EB] inline-flex items-center gap-1 transition-colors"
                  >
                    <FiCopy size={11} /> Duplicate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleUpdate : handleCreate}
        task={editingTask}
        loading={formLoading}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Task"
        message="Are you sure you want to delete this task? This will remove its contextual scoring record."
        confirmLabel="Delete Task"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, taskId: null })}
      />
    </Layout>
  );
}
