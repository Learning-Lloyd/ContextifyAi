import { useCallback, useEffect, useState } from 'react';
import {
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiClock,
  FiCpu,
  FiPlus,
  FiTrendingUp,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import WeatherWidget from '../components/WeatherWidget';
import ScoreRing from '../components/ScoreRing';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useToast } from '../hooks/useToast';
import { dashboardService } from '../services/dashboardService';
import { taskService } from '../services/taskService';

const GROUP_CONFIGS = {
  overdue: {
    title: 'Overdue Attention',
    badgeClass: 'badge-danger',
    borderClass: 'border-l-4 border-l-[#EF4444]',
    icon: FiAlertCircle,
  },
  today: {
    title: "Today's Schedule",
    badgeClass: 'score-badge-high',
    borderClass: 'border-l-4 border-l-[#2563EB]',
    icon: FiClock,
  },
  tomorrow: {
    title: 'Tomorrow',
    badgeClass: 'badge-secondary',
    borderClass: 'border-l-4 border-l-[#14B8A6]',
    icon: FiCalendar,
  },
  upcoming: {
    title: 'Upcoming Commitments',
    badgeClass: 'badge-neutral',
    borderClass: 'border-l-4 border-l-[var(--app-border)]',
    icon: FiCalendar,
  },
};

function TaskGroup({ groupKey, tasks, onToggle, onDelete, onEdit }) {
  if (!tasks?.length) return null;
  const config = GROUP_CONFIGS[groupKey] || GROUP_CONFIGS.upcoming;
  const Icon = config.icon;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className={groupKey === 'overdue' ? 'text-[#EF4444]' : 'text-[#2563EB]'} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)]">
            {config.title}
          </h2>
          <span className={`badge ${config.badgeClass} text-[11px] font-semibold`}>
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="grid gap-3">
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
    </section>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, taskId: null });
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
      showToast('Task created and prioritized successfully', 'success');
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

  const confirmDeleteTask = async () => {
    if (!deleteConfirm.taskId) return;
    try {
      await taskService.delete(deleteConfirm.taskId);
      showToast('Task deleted successfully', 'success');
      await fetchDashboard();
    } catch {
      showToast('Failed to delete task', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, taskId: null });
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-10 w-48 bg-[var(--app-muted)] rounded-lg animate-pulse" />
          <LoadingSkeleton variant="stat-card" count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <LoadingSkeleton variant="task-card" count={3} />
            </div>
            <div className="space-y-4">
              <LoadingSkeleton variant="card" count={2} />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const { user, stats, highest_priority_task, grouped_tasks, widgets } = data;

  const hasAnyTasks =
    grouped_tasks?.overdue?.length > 0 ||
    grouped_tasks?.today?.length > 0 ||
    grouped_tasks?.tomorrow?.length > 0 ||
    grouped_tasks?.upcoming?.length > 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Top Header Hero */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--app-border)]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">Welcome, {user.name}</h1>
            </div>
            <p className="page-subtitle text-xs sm:text-sm">
              Multi-factor contextual priority engine active · Focus on what matters most today
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/decision-lab" className="btn btn-secondary text-xs sm:text-sm">
              <FiCpu size={15} />
              Decision Lab
            </Link>
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
        </div>

        {/* Primary Metric KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Active Tasks"
            value={stats.total_tasks}
            type="total"
            accent
          />
          <StatCard
            title="Due Today"
            value={stats.tasks_due_today ?? 0}
            type="pending"
            subtitle={stats.tasks_due_today > 0 ? 'High urgency window' : 'No immediate due items'}
          />
          <StatCard
            title="Overdue Attention"
            value={stats.overdue_tasks ?? 0}
            type={stats.overdue_tasks > 0 ? 'pending' : 'completed'}
            subtitle={stats.overdue_tasks > 0 ? 'Needs resolution' : 'All deadlines on track'}
          />
          <StatCard
            title="Average Priority"
            value={stats.average_priority_score}
            type="average"
            subtitle={`Workload index: ${stats.current_workload ?? 0}/10`}
          />
        </div>

        {/* Today's Highest Priority Highlight Banner (if available) */}
        {highest_priority_task && (
          <div className="card p-5 bg-gradient-to-r from-[var(--app-card)] via-[var(--app-card)] to-blue-500/[0.04] border-l-4 border-l-[#2563EB] shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 min-w-0">
                <ScoreRing score={highest_priority_task.priority_score} variant="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#2563EB] bg-blue-500/10 px-2 py-0.5 rounded-full">
                      #1 Top Priority Today
                    </span>
                    {highest_priority_task.due_date && (
                      <span className="text-xs text-[var(--app-text-muted)]">
                        Due: {highest_priority_task.due_date}
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/tasks/${highest_priority_task.id}`}
                    className="text-base sm:text-lg font-bold text-[var(--app-text)] hover:text-[#2563EB] transition-colors truncate block mt-1"
                  >
                    {highest_priority_task.title}
                  </Link>
                  {highest_priority_task.description && (
                    <p className="text-xs text-[var(--app-text-secondary)] line-clamp-1 mt-0.5">
                      {highest_priority_task.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/tasks/${highest_priority_task.id}`}
                  className="btn btn-secondary btn-sm text-xs font-semibold"
                >
                  View Breakdown <FiArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main 2-Column Desktop Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Task Groups by Deadline Priority (2 columns wide) */}
          <div className="lg:col-span-2 space-y-6">
            {hasAnyTasks ? (
              Object.keys(GROUP_CONFIGS).map((key) => (
                <TaskGroup
                  key={key}
                  groupKey={key}
                  tasks={grouped_tasks?.[key]}
                  onToggle={handleToggle}
                  onDelete={(id) => setDeleteConfirm({ isOpen: true, taskId: id })}
                  onEdit={handleEdit}
                />
              ))
            ) : (
              <div className="card">
                <EmptyState
                  title="No tasks in your queue"
                  description="Add tasks with due dates to let Contextify calculate optimal execution priorities based on importance, deadlines, and your calendar."
                  action={{
                    label: 'Create First Task',
                    icon: FiPlus,
                    onClick: () => {
                      setEditingTask(null);
                      setFormOpen(true);
                    },
                  }}
                />
              </div>
            )}
          </div>

          {/* Right: Environmental Context & Decision Insights Sidebar */}
          <div className="space-y-6">
            {/* Weather Context Card */}
            <WeatherWidget weather={widgets?.weather} />

            {/* Quick Upcoming Deadlines Card */}
            {widgets?.upcoming_deadlines?.length > 0 && (
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--app-border)]">
                  <div className="flex items-center gap-2">
                    <FiCalendar size={15} className="text-[#2563EB]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--app-text)]">
                      Upcoming Deadlines
                    </h3>
                  </div>
                  <Link to="/calendar" className="text-xs text-[#2563EB] hover:underline font-medium">
                    View Calendar
                  </Link>
                </div>
                <div className="space-y-2">
                  {widgets.upcoming_deadlines.map((task) => (
                    <Link
                      key={task.id}
                      to={`/tasks/${task.id}`}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--app-border)] hover:bg-[var(--app-hover)] transition-colors text-xs group"
                    >
                      <span className="font-semibold text-[var(--app-text)] group-hover:text-[#2563EB] truncate max-w-[170px]">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[var(--app-text-muted)]">{task.due_date}</span>
                        <span className="font-bold text-[#2563EB] font-mono">
                          {task.priority_score}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Decision Lab Quick Access Card */}
            <div className="card p-5 space-y-3 bg-[var(--app-card)] border-l-4 border-l-[#14B8A6]">
              <div className="flex items-center gap-2">
                <FiTrendingUp size={15} className="text-[#14B8A6]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--app-text)]">
                  Need Help Deciding?
                </h3>
              </div>
              <p className="text-xs text-[var(--app-text-secondary)] leading-relaxed">
                Use Decision Lab to run pairwise comparisons, detect deadline collisions, or simulate what-if adjustments.
              </p>
              <Link
                to="/decision-lab"
                className="btn btn-secondary btn-sm w-full justify-between text-xs font-semibold"
              >
                <span>Launch Decision Engine</span>
                <FiArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Task Creation & Edit Modal */}
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

      {/* Custom Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete Task"
        variant="danger"
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeleteConfirm({ isOpen: false, taskId: null })}
      />
    </Layout>
  );
}
