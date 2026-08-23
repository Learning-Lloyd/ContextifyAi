import { useCallback, useEffect, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import WeatherWidget from '../components/WeatherWidget';
import { useToast } from '../hooks/useToast';
import { dashboardService } from '../services/dashboardService';
import { taskService } from '../services/taskService';

const GROUP_LABELS = {
  overdue: { title: 'Overdue', color: 'text-[#EF4444]' },
  today: { title: 'Today', color: 'text-[#2563EB]' },
  tomorrow: { title: 'Tomorrow', color: 'text-[#14B8A6]' },
  upcoming: { title: 'Upcoming', color: 'text-[var(--app-text-secondary)]' },
};

function TaskGroup({ groupKey, tasks, onToggle, onDelete, onEdit }) {
  if (!tasks?.length) return null;
  const { title, color } = GROUP_LABELS[groupKey];

  return (
    <div>
      <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${color}`}>
        <span className="w-2 h-2 rounded-full bg-current" />
        {title} ({tasks.length})
      </h2>
      <div className="grid gap-4">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const { showToast } = useToast();

  const fetchDashboard = useCallback(async () => {
    try {
      const result = await dashboardService.getDashboard();
      setData(result);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      showToast('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleCreate = async (formData) => {
    setFormLoading(true);
    try {
      await taskService.create(formData);
      showToast('Task created successfully', 'success');
      await fetchDashboard();
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
      await fetchDashboard();
    } catch {
      showToast('Failed to update task', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (id) => {
    await taskService.toggleComplete(id);
    await fetchDashboard();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await taskService.delete(id);
      showToast('Task deleted', 'success');
      await fetchDashboard();
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  const { user, stats, highest_priority_task, grouped_tasks, widgets } = data;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Welcome, {user.name}</h1>
            <p className="page-subtitle">Your prioritized task overview</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/decision-lab" className="btn btn-secondary">
              Open Decision Lab
            </Link>
            <button
              type="button"
              onClick={() => { setEditingTask(null); setFormOpen(true); }}
              className="btn btn-primary"
            >
              <FiPlus size={16} />
              New Task
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard title="Total Tasks" value={stats.total_tasks} type="total" />
            <StatCard title="Due Today" value={stats.tasks_due_today ?? 0} type="pending" />
            <StatCard title="Overdue" value={stats.overdue_tasks ?? 0} type="completed" />
            <StatCard title="Avg. Score" value={stats.average_priority_score} type="average" />
            <StatCard title="Workload" value={stats.current_workload ?? 0} type="highest" />
            <StatCard
              title="Highest Priority"
              value={highest_priority_task?.priority_score ?? '—'}
              type="highest"
              subtitle={highest_priority_task?.title}
            />
            <StatCard
              title="Decisions Saved"
              value={widgets?.decision_history_summary?.total_saved ?? 0}
              type="total"
            />
          </div>
          <WeatherWidget weather={widgets?.weather} />
        </div>

        {widgets?.upcoming_deadlines?.length > 0 && (
          <div className="card p-6">
            <h2 className="section-title mb-4">Upcoming Deadlines</h2>
            <div className="space-y-2">
              {widgets.upcoming_deadlines.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--app-border)] hover:bg-[var(--app-hover)] transition-colors text-sm"
                >
                  <span className="font-medium">{task.title}</span>
                  <span className="text-[var(--app-text-secondary)]">{task.due_date} · Score {task.priority_score}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {widgets?.highest_priority_tasks?.length > 0 && (
          <div className="card p-6">
            <h2 className="section-title mb-4">Highest Priority Tasks</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {widgets.highest_priority_tasks.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="card-kpi card-hover block"
                >
                  <p className="font-medium truncate text-sm">{task.title}</p>
                  <p className="text-2xl font-bold text-[#2563EB] mt-1">{task.priority_score}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-8">
          {Object.keys(GROUP_LABELS).map((key) => (
            <TaskGroup
              key={key}
              groupKey={key}
              tasks={grouped_tasks?.[key]}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}

          {!grouped_tasks?.overdue?.length &&
            !grouped_tasks?.today?.length &&
            !grouped_tasks?.tomorrow?.length &&
            !grouped_tasks?.upcoming?.length && (
            <div className="card p-12 text-center">
              <p className="text-[var(--app-text-secondary)]">No tasks yet. Create your first task to get started!</p>
            </div>
          )}
        </div>
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
