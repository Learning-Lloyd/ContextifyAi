import { useCallback, useEffect, useState } from 'react';
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight, FiFilter, FiGrid, FiList, FiPlus, FiSearch } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import TaskCard from '../components/TaskCard';
import TaskDetailPanel from '../components/TaskDetailPanel';
import PriorityBadge from '../components/PriorityBadge';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useToast } from '../hooks/useToast';
import { taskService } from '../services/taskService';
import { getCountdownLabel } from '../utils/taskUtils';

const SORT_OPTIONS = [
  { value: 'priority_score', label: 'Priority' },
  { value: 'due_date', label: 'Deadline' },
  { value: 'created_at', label: 'Created' },
  { value: 'title', label: 'Title' },
];

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, taskId: null });
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [groupBy, setGroupBy] = useState('status');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    sort: 'due_date',
    direction: 'asc',
    status: '',
    category: '',
    priority_level: '',
    archived: false,
  });
  const { showToast } = useToast();

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setFormOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('new');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        sort: filters.sort,
        direction: filters.direction,
        archived: filters.archived ? 1 : 0,
      };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.status && filters.status !== 'overdue') params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.priority_level) params.priority_level = filters.priority_level;

      const result = await taskService.getAll(params);
      const fetchedTasks = result.tasks || [];
      setTasks(filters.status === 'overdue'
        ? fetchedTasks.filter((task) => task.status !== 'completed' && getCountdownLabel(task.due_date, task.due_time)?.startsWith('Overdue'))
        : fetchedTasks);
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
    setSelectedTask(null);
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
    const task = tasks.find((item) => item.id === id);
    if (task?.is_archived) {
      await taskService.restore(id);
      showToast('Task restored to active view', 'success');
    } else {
      await taskService.archive(id);
      showToast('Task moved to archive', 'success');
    }
    setSelectedTask(null);
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
    setSelectedTask(null);
    await fetchTasks();
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const openEdit = (task) => {
    setSelectedTask(null);
    setEditingTask(task);
    setFormOpen(true);
  };

  const requestDelete = (id) => {
    setSelectedTask(null);
    setDeleteConfirm({ isOpen: true, taskId: id });
  };

  const taskGroup = (task) => {
    if (groupBy === 'priority') {
      if (!task.analyzed) return 'Needs analysis';
      return `${task.priority_level?.charAt(0).toUpperCase()}${task.priority_level?.slice(1)} priority`;
    }
    const countdown = getCountdownLabel(task.due_date, task.due_time);
    if (task.status !== 'completed' && countdown?.startsWith('Overdue')) return 'Overdue';
    return task.status === 'completed' ? 'Completed' : 'Pending';
  };

  const groupedTasks = tasks.reduce((groups, task) => {
    const label = taskGroup(task);
    groups[label] = [...(groups[label] || []), task];
    return groups;
  }, {});
  const groupOrder = groupBy === 'status'
    ? ['Overdue', 'Pending', 'Completed']
    : ['High priority', 'Medium priority', 'Low priority', 'Needs analysis'];
  const orderedGroups = [...groupOrder.filter((label) => groupedTasks[label]?.length), ...Object.keys(groupedTasks).filter((label) => !groupOrder.includes(label))];

  const tasksByDate = tasks.reduce((byDate, task) => {
    if (!task.due_date) return byDate;
    byDate[task.due_date] = [...(byDate[task.due_date] || []), task];
    return byDate;
  }, {});
  const monthYear = calendarMonth.getFullYear();
  const monthIndex = calendarMonth.getMonth();
  const monthDays = new Date(monthYear, monthIndex + 1, 0).getDate();
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const day = index - new Date(monthYear, monthIndex, 1).getDay() + 1;
    return day >= 1 && day <= monthDays ? day : null;
  });

  return (
    <Layout>
      <div className="task-workbench animate-fade-in">
        {/* Page Header */}
        <div className="task-page-heading">
          <div>
            <h1 className="page-title">Tasks</h1>
            <p className="page-subtitle">Manage your tasks and deadlines.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setFormOpen(true);
            }}
            className="btn btn-primary task-add-button"
          >
            <FiPlus size={16} />
            Add task
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="queue-controls">
          {/* Row 1: Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch className="input-leading-icon" size={16} aria-hidden="true" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search tasks…"
                className="input input-with-leading-icon text-xs sm:text-sm"
                aria-label="Search tasks"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto shrink-0">
              <select
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="input text-sm w-full sm:w-44"
                aria-label="Sort tasks by"
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
                className="input text-sm w-full sm:w-28"
                aria-label="Sort direction"
              >
                <option value="asc">Soonest first</option>
                <option value="desc">Latest first</option>
              </select>
            </div>
          </div>

          {/* Row 2: Status and Category Filters */}
          <div className="flex flex-wrap gap-2.5 items-center pt-2 text-xs">
            <div className="flex items-center gap-1.5 text-[var(--app-text-muted)] mr-1">
              <FiFilter size={14} />
              <span className="font-semibold">Filters</span>
            </div>

            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="input w-auto text-xs py-1.5 px-2.5"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="input w-auto text-xs py-1.5 px-2.5"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
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
              aria-label="Filter by priority"
            >
              <option value="">All priorities</option>
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>

            <label className="flex items-center gap-2 text-xs font-medium text-[var(--app-text-secondary)] ml-auto cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.archived}
                onChange={(e) => updateFilter('archived', e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#111111] focus:ring-zinc-500 cursor-pointer"
              />
              Show archived
            </label>
          </div>
        </div>

        <div className="task-view-toolbar">
          <div className="task-view-tabs" role="tablist" aria-label="Task views">
            <button type="button" role="tab" aria-selected={viewMode === 'table'} className={viewMode === 'table' ? 'is-active' : ''} onClick={() => setViewMode('table')}><FiList /> Table</button>
            <button type="button" role="tab" aria-selected={viewMode === 'kanban'} className={viewMode === 'kanban' ? 'is-active' : ''} onClick={() => setViewMode('kanban')}><FiGrid /> Kanban</button>
            <button type="button" role="tab" aria-selected={viewMode === 'calendar'} className={viewMode === 'calendar' ? 'is-active' : ''} onClick={() => setViewMode('calendar')}><FiCalendar /> Calendar</button>
            <button type="button" role="tab" aria-selected={viewMode === 'timeline'} className={viewMode === 'timeline' ? 'is-active' : ''} onClick={() => setViewMode('timeline')}><FiCalendar /> Timeline</button>
          </div>
          {viewMode === 'table' && <label className="task-group-select">Group by
            <select className="input" value={groupBy} onChange={(event) => setGroupBy(event.target.value)} aria-label="Group tasks by">
              <option value="status">Status</option>
              <option value="priority">Priority</option>
            </select>
          </label>}
        </div>

        {/* Task List Content */}
        {loading ? (
          <LoadingSkeleton variant="task-card" count={4} />
        ) : tasks.length === 0 ? (
          <div className="queue-empty-state">
            <EmptyState
              title="No tasks match your criteria"
                description="Try another search or clear your filters."
              action={{
                label: 'Add task',
                icon: FiPlus,
                onClick: () => {
                  setEditingTask(null);
                  setFormOpen(true);
                },
              }}
            />
          </div>
        ) : viewMode === 'table' ? (
          <div className="task-board-scroll">
            <table className="task-board" aria-label="My tasks">
              <thead>
                <tr>
                  <th scope="col">Task</th>
                  <th scope="col">Status</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Deadline</th>
                  <th scope="col">Time remaining</th>
                  <th scope="col">Category</th>
                  <th scope="col">Estimate</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              {orderedGroups.map((group) => (
                <tbody key={group} className="task-board-group">
                  <tr className="task-board-group-heading">
                    <th colSpan="8">
                      <button type="button" onClick={() => setCollapsedGroups((previous) => ({ ...previous, [group]: !previous[group] }))} aria-expanded={!collapsedGroups[group]}>
                        <FiChevronDown className={collapsedGroups[group] ? 'is-collapsed' : ''} />
                        <span>{group}</span><small>{groupedTasks[group].length} {groupedTasks[group].length === 1 ? 'task' : 'tasks'}</small>
                      </button>
                    </th>
                  </tr>
                  {!collapsedGroups[group] && groupedTasks[group].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onOpen={setSelectedTask}
                      onToggle={handleToggle}
                      onDelete={requestDelete}
                      onEdit={openEdit}
                      onArchive={handleArchive}
                      onRestore={handleRestore}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="task-kanban-board">
            {[
              { key: 'pending', label: 'Pending', items: tasks.filter((task) => task.status !== 'completed') },
              { key: 'completed', label: 'Completed', items: tasks.filter((task) => task.status === 'completed') },
            ].map((column) => (
              <section className="task-kanban-column" key={column.key} aria-label={`${column.label} tasks`}>
                <header><h2>{column.label}</h2><span>{column.items.length}</span></header>
                {column.items.length ? column.items.map((task) => {
                  const countdown = getCountdownLabel(task.due_date, task.due_time);
                  const overdue = column.key === 'pending' && countdown?.startsWith('Overdue');
                  return <article className="task-kanban-card" key={task.id}>
                    <div className="task-kanban-card-top"><span className={`task-status-tag ${overdue ? 'is-overdue' : column.key === 'completed' ? 'is-complete' : 'is-pending'}`}>{overdue ? 'Overdue' : column.label}</span>{task.analyzed && <PriorityBadge level={task.priority_level} />}</div>
                    <button type="button" className="task-kanban-title" onClick={() => setSelectedTask(task)}>{task.title}</button>
                    {task.description && <p>{task.description}</p>}
                    <div className="task-kanban-meta">{task.due_date ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No deadline'}{countdown && <span className={overdue ? 'is-overdue' : ''}>{countdown}</span>}</div>
                    <div className="task-kanban-actions"><button type="button" onClick={() => handleToggle(task.id)}>{column.key === 'completed' ? 'Reopen' : 'Complete'}</button><button type="button" onClick={() => openEdit(task)}>Edit</button><button type="button" onClick={() => setSelectedTask(task)}>Details</button></div>
                  </article>;
                }) : <p className="task-kanban-empty">No {column.label.toLowerCase()} tasks.</p>}
              </section>
            ))}
          </div>
        ) : viewMode === 'calendar' ? (
          <section className="task-calendar-view" aria-label="Task deadline calendar">
            <header><div><p className="eyebrow">DEADLINES</p><h2>{calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2></div><div className="task-calendar-nav"><button type="button" className="btn btn-secondary btn-sm" onClick={() => setCalendarMonth(new Date(monthYear, monthIndex - 1, 1))} aria-label="Previous month"><FiChevronLeft /></button><button type="button" className="btn btn-secondary btn-sm" onClick={() => setCalendarMonth(new Date())}>Today</button><button type="button" className="btn btn-secondary btn-sm" onClick={() => setCalendarMonth(new Date(monthYear, monthIndex + 1, 1))} aria-label="Next month"><FiChevronRight /></button></div></header>
            <div className="task-calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div className="task-calendar-weekday" key={day}>{day}</div>)}
              {calendarCells.map((day, index) => {
                const dateKey = day ? `${monthYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                const dayTasks = dateKey ? tasksByDate[dateKey] || [] : [];
                return <div key={`${dateKey || 'empty'}-${index}`} className={`task-calendar-cell ${day ? '' : 'is-empty'}`}>
                  {day && <><span className="task-calendar-date">{day}</span><div className="task-calendar-items">{dayTasks.map((task) => <button key={task.id} type="button" onClick={() => setSelectedTask(task)} className={`task-calendar-item ${task.status === 'completed' ? 'is-complete' : ''}`} title={task.title}>{task.title}</button>)}</div></>}
                </div>;
              })}
            </div>
            <section className="task-calendar-undated">
              <h3>No deadline set <span>{tasks.filter((task) => !task.due_date).length}</span></h3>
              {tasks.filter((task) => !task.due_date).length ? <ul>{tasks.filter((task) => !task.due_date).map((task) => <li key={task.id}><button type="button" onClick={() => setSelectedTask(task)}>{task.title}</button></li>)}</ul> : <p>All tasks with deadlines appear on the calendar above.</p>}
            </section>
            <p className="task-calendar-note">Calendar placement uses each task’s actual due date. Select a task to see its details.</p>
          </section>
        ) : (
          <section className="task-timeline-unavailable">
            <p className="eyebrow">TIMELINE VIEW</p>
            <h2>Start dates are not available</h2>
            <p>Tasks currently store due dates but no start dates or durations as date ranges. A timeline cannot place task spans accurately without that information, so this view is unavailable. Use Calendar to see tasks by their actual deadlines.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setViewMode('calendar')}><FiCalendar /> Open Calendar</button>
          </section>
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

      <TaskDetailPanel
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onEdit={openEdit}
        onToggle={handleToggle}
        onDelete={requestDelete}
        onArchive={handleArchive}
        onDuplicate={handleDuplicate}
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
