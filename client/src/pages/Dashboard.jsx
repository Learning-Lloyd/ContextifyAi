import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiArrowUpRight, FiCalendar, FiCheckCircle, FiClock, FiPlus, FiZap } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import TaskForm from '../components/TaskForm';
import WeatherWidget from '../components/WeatherWidget';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useToast } from '../hooks/useToast';
import { dashboardService } from '../services/dashboardService';
import { taskService } from '../services/taskService';
import { goalsService } from '../services/goalsService';
import { getCountdownLabel } from '../utils/taskUtils';
import { formatMinutesAsHours } from '../utils/duration';
import { createTaskSuggestions } from '../utils/taskSuggestions';


const factors = [
  { key: 'importance', label: 'Importance', weight: '40%' },
  { key: 'urgency', label: 'Deadline', weight: '30%' },
  { key: 'time_availability', label: 'Available time', weight: '20%' },
  { key: 'current_workload', label: 'Workload', weight: '10%' },
];

const PRODUCTIVE_MINUTES_PER_DAY = 480;

function getTimeFit(task, tasks) {
  const estimate = Number(task?.estimated_time_minutes || 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizonDays = 7;
  const busyByDate = new Map();

  tasks.forEach((item) => {
    if (item.id === task.id || item.status !== 'pending' || !item.due_date) return;
    const date = new Date(`${item.due_date}T00:00:00`);
    const dayOffset = Math.floor((date - today) / 86400000);
    if (dayOffset < 0 || dayOffset >= horizonDays) return;
    const dateKey = item.due_date;
    busyByDate.set(dateKey, Math.min(PRODUCTIVE_MINUTES_PER_DAY,
      (busyByDate.get(dateKey) || 0) + Number(item.estimated_time_minutes || 60)));
  });

  let available = 0;
  for (let day = 0; day < horizonDays; day += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + day);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    available += PRODUCTIVE_MINUTES_PER_DAY - (busyByDate.get(key) || 0);
  }

  return { estimate: estimate || null, available };
}

function dateLabel(value) {
  if (!value) return 'No deadline set';
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { user: authUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTaskSuggestion, setSelectedTaskSuggestion] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsUnavailable, setGoalsUnavailable] = useState(false);
  const { showToast } = useToast();
  const taskSuggestions = useMemo(
    () => createTaskSuggestions(authUser?.workspace_preferences),
    [authUser?.workspace_preferences],
  );

  const fetchDashboard = useCallback(async () => {
    try {
      setData(await dashboardService.getDashboard());
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      showToast('Could not load your workspace. Check your connection and try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const fetchGoals = useCallback(async () => {
    setGoalsUnavailable(false);
    try {
      setGoals(await goalsService.list() || []);
    } catch {
      setGoalsUnavailable(true);
    } finally {
      setGoalsLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  useEffect(() => {
    if (!isAdmin && authUser && !authUser.onboarding_completed_at) navigate('/onboarding', { replace: true });
  }, [isAdmin, authUser, navigate]);

  const handleSave = async (formData) => {
    setFormLoading(true);
    try {
      const created = await taskService.create(formData);
      showToast('Task saved successfully', 'success');
      setSelectedTaskSuggestion(null);
      await fetchDashboard();
      return created;
    } catch (error) {
      showToast('Could not save this task', 'error');
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await taskService.toggleComplete(id);
      await Promise.all([fetchDashboard(), fetchGoals()]);
    } catch {
      showToast('Could not update task status', 'error');
    }
  };

  const openSuggestedTask = (suggestion) => {
    setSelectedTaskSuggestion(suggestion);
    setFormOpen(true);
  };

  const queue = useMemo(() => {
    const groups = data?.grouped_tasks || {};
    const allTasks = data?.tasks?.length ? data.tasks : Object.values(groups).flat();
    return allTasks.filter((task) => task.status !== 'completed');
  }, [data]);

  if (loading) return <Layout><div className="workspace-loading"><p className="eyebrow">Preparing your day</p><LoadingSkeleton variant="task-card" count={3} /></div></Layout>;
  if (!data) return <Layout><div className="workspace-error"><p className="eyebrow">Workspace unavailable</p><h1 className="page-title">We couldn’t load your day.</h1><button type="button" className="btn btn-primary" onClick={fetchDashboard}>Try again</button></div></Layout>;

  const { user, stats = {}, highest_priority_task: highestPriorityTask, widgets = {} } = data;
  const focusTask = queue.find((task) => task.id === highestPriorityTask?.id) || queue[0] || null;
  const timeFit = focusTask ? getTimeFit(focusTask, queue) : null;
  const topReasonLabels = focusTask
    ? [...factors]
      .sort((a, b) => (Number(focusTask[b.key] || 0) * parseFloat(b.weight)) - (Number(focusTask[a.key] || 0) * parseFloat(a.weight)))
      .slice(0, 2)
      .map((factor) => factor.label.toLowerCase())
    : [];
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const weeklyGoals = goals;

  return (
    <Layout>
      <div className="daily-workspace animate-fade-in">
        <div className="daily-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> DAILY BRIEF · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1>{greeting}, <em>{user?.name?.split(' ')[0] || 'there'}.</em></h1>
          </div>
        </div>

        <section className="dashboard-task-progress card" aria-label="Task progress">
          <div className="dashboard-task-progress-heading">
            <strong>Task Progress</strong>
            <span>{stats.completed_tasks ?? 0} done · {stats.pending_tasks ?? 0} remaining · <b>{stats.completion_percent || 0}%</b></span>
            {stats.unread_notifications > 0 && <Link to="/notifications" className="dashboard-task-reminders">{stats.unread_notifications} reminder{stats.unread_notifications === 1 ? '' : 's'} <FiArrowRight className="inline" /></Link>}
          </div>
          <div className="dashboard-task-progress-track" role="progressbar" aria-label="Task completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.max(0, Math.min(100, stats.completion_percent || 0))}>
            <span className="daily-progress-fill" style={{ width: `${Math.max(0, Math.min(100, stats.completion_percent || 0))}%` }} />
          </div>
        </section>

        <section className="dashboard-goal-progress" aria-labelledby="weekly-goals-heading">
          <div className="dashboard-goal-heading">
            <h2 id="weekly-goals-heading">Weekly Goal</h2>
            <Link to="/profile" state={{ openGoals: true }} className="dashboard-goal-manage">Manage goals <FiArrowUpRight /></Link>
          </div>
          {goalsLoading ? <p className="dashboard-goal-loading">Loading your goals…</p> : goalsUnavailable ? (
            <p className="dashboard-goal-loading" role="status">Goal progress is temporarily unavailable.</p>
          ) : weeklyGoals.length ? (
            <div className="dashboard-goal-list">
              {weeklyGoals.map((goal) => (
                <article className="dashboard-goal-item" key={goal.id}>
                  <div className="dashboard-goal-item-heading"><strong>{goal.title}</strong><span>{goal.completed_count} / {goal.target_count} · {goal.progress}%</span></div>
                  <div className="dashboard-goal-track" role="progressbar" aria-label={`${goal.title} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.max(0, Math.min(100, goal.progress || 0))}>
                    <span style={{ width: `${Math.max(0, Math.min(100, goal.progress || 0))}%` }} />
                  </div>
                  <p className="dashboard-goal-interpretation" role="status">{goal.feedback_message || goal.summary}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="dashboard-goal-empty">
              <p>No weekly goal set. Set a small target to start tracking your progress.</p>
              <Link to="/profile" state={{ openGoals: true }} className="btn btn-secondary btn-sm">Set goal <FiArrowRight /></Link>
            </div>
          )}
        </section>

        {!isAdmin && (
          <section className="card p-5 space-y-4" aria-labelledby="suggested-tasks-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="eyebrow">A PLACE TO START</p><h2 id="suggested-tasks-heading" className="mt-1 text-lg font-bold text-[var(--app-text)]">Suggested tasks for you</h2><p className="mt-1 text-sm text-[var(--app-text-muted)]">Ideas based on your workspace preferences. They do not affect priority scores.</p></div>
              <Link to="/onboarding" className="text-action">{authUser?.workspace_preferences?.focus?.length || authUser?.workspace_preferences?.categories?.length ? 'Manage preferences' : 'Personalize ideas'} <FiArrowUpRight /></Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {taskSuggestions.slice(0, 4).map((suggestion) => (
                <article key={`${suggestion.title}-${suggestion.category}`} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-muted)]/30 p-3">
                  <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-semibold text-[var(--app-text)]">{suggestion.title}</h3>{suggestion.category && <span className="task-category-tag shrink-0">{suggestion.category}</span>}</div>
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--app-text-muted)]">{suggestion.description}</p>
                  <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={() => openSuggestedTask(suggestion)}><FiPlus size={13} /> Use idea</button>
                </article>
              ))}
            </div>
          </section>
        )}

        {focusTask ? (
          <section className="focus-workspace" aria-labelledby="focus-heading">
            <div className="focus-main">
              <div className="focus-label"><FiZap size={14} /> CONTEXTIFY RECOMMENDS <span>#{focusTask.rank || 1} · {focusTask.priority_level} · {focusTask.priority_score != null ? `${Number(focusTask.priority_score).toFixed(1)}/10` : 'score unavailable'}</span></div>
              <Link to={`/tasks/${focusTask.id}`} className="focus-title-link"><h2 id="focus-heading">{focusTask.title}</h2></Link>
              {focusTask.description && <p className="focus-description">{focusTask.description}</p>}
              <div className="focus-metadata">
                <span><FiCalendar /> {dateLabel(focusTask.due_date)}{focusTask.due_time ? ` · ${focusTask.due_time.slice(0, 5)}` : ''}</span>
                {getCountdownLabel(focusTask.due_date, focusTask.due_time) && <span className="task-countdown">{getCountdownLabel(focusTask.due_date, focusTask.due_time)}</span>}
                {focusTask.estimated_time_minutes && <span><FiClock /> {formatMinutesAsHours(focusTask.estimated_time_minutes, true)}</span>}
                {focusTask.category && <span className="category-label">{focusTask.category}</span>}
              </div>
              <div className="focus-actions">
                <Link to={`/tasks/${focusTask.id}`} className="btn btn-primary">Open task <FiArrowRight /></Link>
                <button type="button" className="btn btn-quiet" onClick={() => handleToggle(focusTask.id)}><FiCheckCircle /> Mark complete</button>
              </div>
            </div>
            <aside className="focus-reasoning" aria-label="Recommendation details">
              <p className="text-sm text-[var(--app-text-secondary)] mb-3">Most influenced by {topReasonLabels.join(' and ')}.</p>
              <details>
              <summary className="reasoning-caption cursor-pointer">Why recommended?</summary>
              <div className="factor-list mt-3">
                {factors.map(({ key, label, weight }) => {
                  const value = Math.max(0, Math.min(10, Number(focusTask[key] || 0)));
                  return <div className="factor-row" key={key}><div className="factor-label"><span>{label}</span><span>{weight}</span></div><div className="factor-track"><span style={{ width: `${value * 10}%` }} /></div><span className="factor-value">{value.toFixed(1)}<small> / 10</small></span></div>;
                })}
              </div>
              <Link to="/decision-lab" className="reasoning-link mt-3">View analysis <FiArrowUpRight /></Link>
              </details>
            </aside>
          </section>
        ) : (
          <section className="first-task-prompt">
            <div className="first-task-mark">01</div>
            <div><p className="eyebrow">START WITH ONE THING</p><h2>Your day is still unwritten.</h2><p>Add a task and Contextify will weigh its importance, deadline, available time, and current workload.</p><button type="button" className="btn btn-primary" onClick={() => { setSelectedTaskSuggestion(null); setFormOpen(true); }}><FiPlus /> Create your first task</button></div>
          </section>
        )}

        {focusTask && timeFit && (
          <section className="time-fit-strip" aria-label="Estimated time fit">
            <div className="time-fit-mark"><FiClock /></div>
            <div className="time-fit-copy">
              <p className="eyebrow">TIME FIT</p>
              <strong>{timeFit.estimate ? `${formatMinutesAsHours(timeFit.estimate)} estimated` : 'Add an estimate to check time fit'}</strong>
              <span>About {formatMinutesAsHours(timeFit.available)} available this week.</span>
            </div>
            {timeFit.estimate && <span className={`time-fit-status ${timeFit.estimate <= timeFit.available ? 'is-fit' : 'is-tight'}`}>
              {timeFit.estimate <= timeFit.available ? 'Fits the estimate' : 'May need more time'}
            </span>}
          </section>
        )}

        <div className="workspace-lower-grid">
          <section className="priority-queue" aria-labelledby="queue-heading">
            <div className="queue-heading-row"><div><p className="eyebrow">UP NEXT</p><h2 id="queue-heading">Priority tasks <span>{queue.length}</span></h2></div><Link to="/tasks" className="text-action">View all <FiArrowRight /></Link></div>
            {queue.length > (focusTask ? 1 : 0) ? <ol className="queue-list">{queue.slice(focusTask ? 1 : 0, focusTask ? 6 : 5).map((task, index) => <li key={task.id} className="queue-item"><span className="queue-index">{String(index + (focusTask ? 2 : 1)).padStart(2, '0')}</span><div className="queue-copy"><Link to={`/tasks/${task.id}`}>{task.title}</Link><span>{dateLabel(task.due_date)}{task.category ? ` · ${task.category}` : ''}</span></div><button type="button" aria-label={`Mark ${task.title} complete`} className="queue-complete" onClick={() => handleToggle(task.id)}><FiCheckCircle /></button></li>)}</ol> : <div className="queue-empty">{queue.length ? 'One task at a time. You’ve got this.' : 'Add a task to start your task list.'}</div>}
          </section>

          <aside className="day-context">
            <div className="context-heading"><span className="eyebrow">CAPACITY CHECK</span><Link to="/calendar" aria-label="Open calendar"><FiArrowUpRight /></Link></div>
            <div className="capacity-number">{stats.current_workload ?? 0}<small> / 10</small></div>
            <p className="capacity-caption">Workload</p>
            <div className="capacity-rule"><span style={{ width: `${Math.max(0, Math.min(100, Number(stats.current_workload || 0) * 10))}%` }} /></div>
            <div className="context-pair"><span>Due today</span><strong>{stats.tasks_due_today ?? 0}</strong></div>
            <div className="context-pair"><span>Needs attention</span><strong>{stats.overdue_tasks ?? 0}</strong></div>
            {widgets.weather && <div className="weather-context"><WeatherWidget weather={widgets.weather} /></div>}
            <Link to="/decision-lab" className="context-link">Open Decision Lab <FiArrowRight /></Link>
          </aside>
        </div>

        <section className="card p-5 space-y-3" aria-labelledby="recent-activity-heading">
          <div className="flex items-center justify-between"><div><p className="eyebrow">YOUR WORKSPACE</p><h2 id="recent-activity-heading" className="text-lg font-bold text-[var(--app-text)] mt-1">Recent activity</h2></div><Link to="/tasks" className="text-action">Tasks <FiArrowRight /></Link></div>
          {widgets.recent_activity?.length ? <ul className="divide-y divide-[var(--app-border)]">{widgets.recent_activity.map((activity) => <li key={activity.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-medium text-[var(--app-text-secondary)]">{activity.label}</span><time className="text-xs text-[var(--app-text-muted)] shrink-0">{new Date(activity.created_at).toLocaleString()}</time></li>)}</ul> : <p className="text-sm text-[var(--app-text-muted)] py-3">Your task updates will appear here.</p>}
        </section>

        <div className="daily-footer-note"><Link to="/help">How priorities work <FiArrowUpRight /></Link></div>
      </div>

      <TaskForm isOpen={formOpen} onClose={() => { setFormOpen(false); setSelectedTaskSuggestion(null); }} onSubmit={handleSave} loading={formLoading} suggestions={taskSuggestions} initialSuggestion={selectedTaskSuggestion} />
    </Layout>
  );
}
