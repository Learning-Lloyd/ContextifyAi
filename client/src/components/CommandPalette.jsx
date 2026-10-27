import { useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowUp, FiCornerDownLeft, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { taskService } from '../services/taskService';

const pages = [
  { label: 'Daily workspace', description: 'See what deserves attention now', to: '/dashboard', group: 'Workspace' },
  { label: 'Task queue', description: 'Search, sort, and manage tasks', to: '/tasks', group: 'Workspace' },
  { label: 'Calendar', description: 'Review deadlines and availability', to: '/calendar', group: 'Workspace' },
  { label: 'Analytics', description: 'Explore task and completion trends', to: '/analytics', group: 'Explore' },
  { label: 'Decision Lab', description: 'Compare tasks and run simulations', to: '/decision-lab', group: 'Explore' },
  { label: 'Decision insights', description: 'Patterns from saved decisions', to: '/decision-insights', group: 'Explore' },
  { label: 'Decision history', description: 'Browse previous decisions', to: '/decision-history', group: 'Explore' },
  { label: 'Feedback', description: 'Send a note to the Contextify team', to: '/feedback', group: 'Account' },
  { label: 'Profile and preferences', description: 'Edit your profile and location', to: '/profile', group: 'Account' },
  { label: 'Admin overview', description: 'Open system administration', to: '/admin', group: 'Administration', admin: true },
  { label: 'Manage users', description: 'Review user accounts', to: '/admin/users', group: 'Administration', admin: true },
  { label: 'Monitor tasks', description: 'Review platform task data', to: '/admin/tasks', group: 'Administration', admin: true },
  { label: 'Decision records', description: 'Review platform decision logs', to: '/admin/decisions', group: 'Administration', admin: true },
  { label: 'Platform analytics', description: 'Explore system usage', to: '/admin/analytics', group: 'Administration', admin: true },
  { label: 'Audit trail', description: 'Review recorded actions', to: '/admin/audit-logs', group: 'Administration', admin: true },
  { label: 'Notifications', description: 'Review system alerts', to: '/admin/notifications', group: 'Administration', admin: true },
  { label: 'Feedback inbox', description: 'Review and respond to feedback', to: '/admin/feedback', group: 'Administration', admin: true },
  { label: 'Reports', description: 'Export supported reports', to: '/admin/reports', group: 'Administration', admin: true },
];

export default function CommandPalette({ open, onClose, isAdmin }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [taskMatches, setTaskMatches] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const availablePages = useMemo(() => pages.filter((page) => !page.admin || isAdmin), [isAdmin]);
  const filteredPages = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return availablePages;
    return availablePages.filter((page) => `${page.label} ${page.description}`.toLowerCase().includes(value));
  }, [availablePages, query]);
  const options = useMemo(() => [
    ...filteredPages.map((page) => ({ ...page, kind: 'page' })),
    ...taskMatches.map((task) => ({
      label: task.title,
      description: `Task · Priority ${Number(task.priority_score || 0).toFixed(2)}${task.due_date ? ` · Due ${task.due_date}` : ''}`,
      to: `/tasks/${task.id}`,
      kind: 'task',
    })),
  ], [filteredPages, taskMatches]);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setTaskMatches([]);
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setTaskMatches([]);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      taskService.getAll({ search: query.trim() })
        .then((result) => { if (!cancelled) setTaskMatches(result.tasks || []); })
        .catch(() => { if (!cancelled) setTaskMatches([]); });
    }, 200);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [open, query]);

  useEffect(() => setActiveIndex(0), [query, options.length]);

  const choose = (option) => {
    if (!option) return;
    navigate(option.to);
    onClose();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.max(options.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + Math.max(options.length, 1)) % Math.max(options.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(options[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="command-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="command-dialog" role="dialog" aria-modal="true" aria-label="Navigate or search tasks">
        <div className="command-search-row">
          <FiSearch aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find a page or search your tasks…"
            aria-label="Find a page or search tasks"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-options"
            aria-activedescendant={options[activeIndex] ? `command-option-${activeIndex}` : undefined}
            aria-autocomplete="list"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-results" id="command-options" role="listbox" aria-label="Navigation and task results">
          {options.map((option, index) => (
            <button
              type="button"
              id={`command-option-${index}`}
              key={`${option.kind}-${option.to}`}
              role="option"
              aria-selected={activeIndex === index}
              className={`command-option ${activeIndex === index ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              <span className="command-option-copy">
                <span className="command-option-title">{option.label}</span>
                <span className="command-option-description">{option.description}</span>
              </span>
              <span className="command-option-meta">{option.kind === 'task' ? 'Open task' : option.group}</span>
            </button>
          ))}
          {query.trim().length >= 2 && options.length === 0 && <p className="command-empty">No matching pages or tasks.</p>}
          {query.trim().length >= 2 && taskMatches.length === 0 && <p className="command-hint">Searching your task queue…</p>}
        </div>
        <footer className="command-footer">
          <span><FiArrowUp aria-hidden="true" /> <span>Navigate</span></span>
          <span><FiCornerDownLeft aria-hidden="true" /> <span>Open</span></span>
          <span>Search uses your task list and current account permissions.</span>
        </footer>
      </section>
    </div>
  );
}
