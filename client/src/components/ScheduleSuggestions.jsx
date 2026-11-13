import { useEffect, useState } from 'react';
import { FiClock } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import LoadingSkeleton from './LoadingSkeleton';
import { scheduleService } from '../services/scheduleService';

function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function ScheduleSuggestions() {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    scheduleService.getSuggestions(todayDate())
      .then(setSchedule)
      .catch(() => setSchedule(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="schedule-suggestions card p-5"><LoadingSkeleton variant="task-card" count={2} /></div>;
  if (schedule?.setup_required) {
    return <div className="schedule-suggestions card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h2 className="font-bold text-[var(--app-text)]">Set your daily availability</h2><p className="text-sm text-[var(--app-text-secondary)] mt-1">Add your available time and start time to get a plan.</p></div><Link to="/profile" className="btn btn-secondary btn-sm">Set availability</Link></div>;
  }
  if (!schedule) return null;

  const plannedCount = (schedule.days || []).reduce((count, day) => count + day.items.length, 0);
  const issueLabels = {
    overdue: 'Overdue',
    no_deadline: 'No deadline',
    missing_duration: 'Duration needed',
    cannot_fit: 'Does not fit available time',
  };
  const issuesByType = (schedule.unplanned_tasks || []).reduce((groups, item) => {
    const key = item.issue_type || 'needs_attention';
    groups[key] = [...(groups[key] || []), item];
    return groups;
  }, {});
  const issueCounts = Object.entries(issuesByType).map(([type, items]) => ({ type, count: items.length }));
  return (
    <section className="schedule-suggestions card p-5" aria-labelledby="schedule-suggestions-heading">
      <div><h2 id="schedule-suggestions-heading" className="text-lg font-bold text-[var(--app-text)]">Next 7 days</h2><p className="text-sm text-[var(--app-text-secondary)] mt-1">{plannedCount} tasks planned · {schedule.daily_available_minutes} min/day from {schedule.workday_start_time}</p></div>
      <div className="grid sm:grid-cols-2 gap-3">
        {schedule.days.filter((day) => day.items.length > 0).map((day) => (
          <div key={day.date} className="rounded-lg border border-[var(--app-border)] p-3">
            <div className="flex items-center justify-between text-sm font-bold text-[var(--app-text)]"><span>{new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><span className="text-[var(--app-text-muted)]">{day.scheduled_minutes}/{day.available_minutes} min</span></div>
            <ul className="mt-2 space-y-2">{day.items.map((item) => <li key={item.task_id} className="flex items-start gap-2 text-sm"><FiClock className="mt-0.5 text-[#111111] shrink-0" /><span><Link to={`/tasks/${item.task_id}`} className="font-semibold text-[var(--app-text)] hover:underline">{item.title}</Link><small className="block text-xs text-[var(--app-text-muted)] mt-0.5">{item.start_time}–{item.end_time} · {item.duration_minutes} min</small></span></li>)}</ul>
          </div>
        ))}
      </div>
      {plannedCount === 0 && <p className="text-sm text-[var(--app-text-muted)]">No tasks fit this plan yet.</p>}
      {schedule.unplanned_tasks?.length > 0 && (
        <div className="border-t border-[var(--app-border)] pt-3">
          <div className="mb-2 flex flex-wrap gap-2" aria-label="Scheduling attention summary">
            {issueCounts.map(({ type, count }) => (
              <span key={type} className="rounded-full border border-[var(--app-border)] bg-[var(--app-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--app-text-secondary)]">
                {issueLabels[type] || 'Needs attention'}: {count}
              </span>
            ))}
          </div>
          <details>
          <summary className="cursor-pointer text-sm font-semibold text-[var(--app-text)]">{schedule.unplanned_tasks.length} tasks need attention</summary>
          <div className="mt-3 space-y-3">
            {Object.entries(issuesByType).map(([type, items]) => (
              <div key={type}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--app-text-secondary)]">{issueLabels[type] || 'Needs attention'} ({items.length})</h3>
                <ul className="mt-1 space-y-1">
                  {items.map((task) => (
                    <li key={task.id} className="text-sm text-[var(--app-text-secondary)]">
                      <Link to={`/tasks/${task.id}`} className="font-semibold text-[var(--app-text)] hover:underline">{task.title}</Link>: {task.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          </details>
        </div>
      )}
      <details><summary className="cursor-pointer text-sm text-[var(--app-text-muted)]">About these suggestions</summary><p className="mt-1 text-sm text-[var(--app-text-muted)]">They use your stated daily capacity, task durations, and deadlines. Actual calendar appointments are not checked. Suggestions don’t change your tasks or priority settings.</p></details>
    </section>
  );
}
