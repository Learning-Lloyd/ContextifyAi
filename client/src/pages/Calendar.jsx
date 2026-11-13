import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiInfo,
} from 'react-icons/fi';
import Layout from '../components/Layout';
import ScheduleSuggestions from '../components/ScheduleSuggestions';
import { calendarService } from '../services/calendarService';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function taskState(task, today) {
  if (task.status === 'completed') return { label: 'Completed', color: '#168A68', tone: 'complete' };
  if (task.due_date && task.due_date < today) return { label: 'Overdue', color: '#D5425D', tone: 'overdue' };
  return { label: 'Pending', color: '#D39A00', tone: 'pending' };
}

function priorityName(task) {
  const level = String(task.priority_level || 'medium').toLowerCase();
  return ['high', 'medium', 'low'].includes(level) ? level : 'medium';
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({ tasks: [], calendar: [] });
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    calendarService
      .getCalendar()
      .then(setCalendarData)
      .catch(() => setCalendarData({ tasks: [], calendar: [] }))
      .finally(() => setLoading(false));
  }, []);

  const tasksByDate = (calendarData.tasks || []).reduce((acc, task) => {
    if (!task.due_date) return acc;
    acc[task.due_date] = acc[task.due_date] || [];
    acc[task.due_date].push(task);
    return acc;
  }, {});

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthLabel = currentDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-10 w-48 bg-[var(--app-muted)] rounded animate-pulse" />
          <div className="card p-6 h-96 bg-[var(--app-muted)] rounded-xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <Layout>
      <div className="calendar-workspace max-w-6xl mx-auto animate-fade-in">
        {/* Calendar Header with Month Navigation */}
        <div className="calendar-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--app-border)]">
          <div>
            <h1 className="page-title">Calendar</h1>
            <p className="page-subtitle text-sm">Deadlines and schedule suggestions.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="btn btn-secondary btn-sm text-xs font-semibold"
            >
              Today
            </button>
            <div className="flex items-center rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] p-0.5">
              <button
                type="button"
                onClick={prevMonth}
                className="btn btn-ghost btn-icon w-8 h-8 rounded-md"
                aria-label="Previous Month"
              >
                <FiChevronLeft size={16} />
              </button>
              <span className="font-bold text-xs sm:text-sm min-w-[140px] text-center text-[var(--app-text)] px-2">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="btn btn-ghost btn-icon w-8 h-8 rounded-md"
                aria-label="Next Month"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <ScheduleSuggestions />

        <details className="calendar-workload-note rounded-xl border border-[var(--app-border)] px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--app-text)]">How workload is estimated</summary>
          <p className="mt-2 text-sm text-[var(--app-text-secondary)]">Tasks with nearby deadlines affect available time and workload.</p>
        </details>
        {/* Informational Context Banner */}
        <div className="calendar-info-banner hidden sm:flex p-3.5 rounded-xl bg-zinc-500/[0.04] border border-[#111111]/20 items-center justify-between text-sm text-[var(--app-text-secondary)]">
          <div className="flex items-center gap-2">
            <FiInfo size={14} className="text-[#111111] shrink-0" />
            <span>Deadline density affects available time and workload.</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-[var(--app-text-muted)]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> High priority
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" /> Low
            </span>
          </div>
        </div>

        {/* Mobile deadline list */}
        <div className="calendar-mobile-list sm:hidden card p-4 space-y-3">
          {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = tasksByDate[dateStr] || [];
            if (!dayTasks.length && dateStr !== todayStr) return null;
            return (
              <section key={dateStr} className="border-b border-[var(--app-border)] pb-3 last:border-0">
                <h2 className="text-sm font-semibold text-[var(--app-text)]">{new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{dateStr === todayStr ? ' · Today' : ''}</h2>
                {dayTasks.length ? <ul className="mt-2 space-y-2">{dayTasks.map((task) => { const state = taskState(task, todayStr); const priority = priorityName(task); return <li key={task.id}><Link to={`/tasks/${task.id}`} className={`calendar-task-chip calendar-task-chip--${state.tone}`} style={{ borderColor: state.color }}>{task.title}<span>{task.category || 'Uncategorized'} · {state.label} · <b className={`calendar-priority-label calendar-priority-label--${priority}`}>{priority} priority</b></span></Link></li>; })}</ul> : <p className="mt-1 text-sm text-[var(--app-text-muted)]">No deadlines today.</p>}
              </section>
            );
          })}
        </div>

        {/* Desktop monthly grid */}
        <div className="calendar-grid-card hidden sm:block card p-4 sm:p-6 shadow-sm overflow-hidden">
          {/* Weekday headers */}
          <div className="calendar-weekdays grid grid-cols-7 gap-1.5 mb-2">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells grid */}
          <div className="calendar-days-grid grid grid-cols-7 gap-1.5">
            {cells.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="calendar-day-cell is-empty min-h-[100px] rounded-xl border border-transparent bg-transparent"
                  />
                );
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayTasks = tasksByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const hasHighWorkload = dayTasks.length >= 3;

              return (
                <div
                  key={dateStr}
                  className={`calendar-day-cell min-h-[100px] p-2 rounded-xl border flex flex-col justify-between transition-all ${isToday ? 'is-today' : ''} ${hasHighWorkload ? 'has-high-workload' : ''}`}
                >
                  {/* Day Header Row */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`calendar-day-number text-xs font-bold leading-none ${isToday ? 'is-today w-5 h-5 rounded-full flex items-center justify-center' : 'text-[var(--app-text-secondary)]'}`}
                    >
                      {day}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-semibold text-[var(--app-text-muted)] font-mono">
                        {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>

                  {/* Task Chips Strip */}
                  <div className="space-y-1 my-1 flex-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((task) => (
                      <Link
                        key={task.id}
                        to={`/tasks/${task.id}`}
                        className={`calendar-task-chip calendar-task-chip--${taskState(task, todayStr).tone}`}
                        style={{ borderColor: taskState(task, todayStr).color }}
                        title={`${task.title} · ${priorityName(task)} priority`}
                      >
                        <span className="font-semibold">{task.title}</span>
                        <span>{task.category || 'Uncategorized'} · {taskState(task, todayStr).label} · <b className={`calendar-priority-label calendar-priority-label--${priorityName(task)}`}>{priorityName(task)} priority</b></span>
                      </Link>
                    ))}
                    {dayTasks.length > 2 && (
                      <p className="calendar-more-count text-[10px] font-semibold pl-1">
                        +{dayTasks.length - 2} more...
                      </p>
                    )}
                  </div>

                  {/* Empty Footer Space */}
                  <div />
                </div>
              );
            })}
          </div>
        </div>

        {/* All Scheduled Tasks Master List */}
        {calendarData.tasks?.length > 0 && (
          <div className="calendar-deadlines-card card p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--app-border)]">
              <div>
                <h2 className="text-base font-bold text-[var(--app-text)]">
                  Deadlines · {calendarData.tasks.length}
                </h2>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {calendarData.tasks.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-hover)] transition-colors text-xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-semibold text-sm text-[var(--app-text)] group-hover:text-[#111111] truncate">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--app-text-muted)] shrink-0">
                    <span className="inline-flex items-center gap-1 font-medium text-[var(--app-text-secondary)]">
                      <FiCalendar size={12} className="text-[#111111]" />
                      {task.due_date}
                      {task.due_time && ` at ${task.due_time}`}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
