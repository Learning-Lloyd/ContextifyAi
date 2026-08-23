import { useCallback, useEffect, useState } from 'react';
import { FiArchive, FiCopy, FiFilter, FiPlus, FiRotateCcw, FiSearch } from 'react-icons/fi';
import Layout from '../components/Layout';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import { useToast } from '../hooks/useToast';
import { taskService } from '../services/taskService';

const SORT_OPTIONS = [
  { value: 'priority_score', label: 'Priority Score' },
  { value: 'due_date', label: 'Deadline' },
  { value: 'importance', label: 'Importance' },
  { value: 'urgency', label: 'Urgency' },
  { value: 'created_at', label: 'Created Date' },
  { value: 'title', label: 'Title' },
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
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

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await taskService.delete(id);
      showToast('Task deleted', 'success');
      await fetchTasks();
    }
  };

  const handleArchive = async (id) => {
    await taskService.archive(id);
    showToast('Task archived', 'success');
    await fetchTasks();
  };

  const handleRestore = async (id) => {
    await taskService.restore(id);
    showToast('Task restored', 'success');
    await fetchTasks();
  };

  const handleDuplicate = async (id) => {
    await taskService.duplicate(id);
    showToast('Task duplicated', 'success');
    await fetchTasks();
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Tasks</h1>
            <p className="page-subtitle">Search, sort, and filter your task list</p>
          </div>
          <button
            type="button"
            onClick={() => { setEditingTask(null); setFormOpen(true); }}
            className="btn btn-primary"
          >
            <FiPlus size={16} />
            New Task
          </button>
        </div>

        <div className="card p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" size={16} />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search title, description, category, notes..."
                className="input pl-9"
              />
            </div>
            <select
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="input lg:w-44"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={filters.direction}
              onChange={(e) => updateFilter('direction', e.target.value)}
              className="input lg:w-32"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <FiFilter className="text-[var(--app-text-muted)]" size={16} />
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="input w-auto min-w-[120px]"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="input w-auto min-w-[140px]"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={filters.priority_level}
              onChange={(e) => updateFilter('priority_level', e.target.value)}
              className="input w-auto min-w-[140px]"
            >
              <option value="">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-[var(--app-text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={filters.archived}
                onChange={(e) => updateFilter('archived', e.target.checked)}
                className="accent-[#2563EB]"
              />
              Show archived
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="spinner" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[var(--app-text-secondary)]">No tasks match your filters.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => (
              <div key={task.id} className="relative">
                <TaskCard
                  task={task}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={(t) => { setEditingTask(t); setFormOpen(true); }}
                />
                <div className="flex gap-2 mt-2 ml-2">
                  {task.is_archived ? (
                    <button
                      type="button"
                      onClick={() => handleRestore(task.id)}
                      className="btn btn-ghost text-xs py-1 px-2"
                    >
                      <FiRotateCcw size={12} /> Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleArchive(task.id)}
                      className="btn btn-ghost text-xs py-1 px-2"
                    >
                      <FiArchive size={12} /> Archive
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDuplicate(task.id)}
                    className="btn btn-ghost text-xs py-1 px-2"
                  >
                    <FiCopy size={12} /> Duplicate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskForm
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditingTask(null); }}
        onSubmit={editingTask ? handleUpdate : handleCreate}
        task={editingTask}
        loading={formLoading}
      />
    </Layout>
  );
}
