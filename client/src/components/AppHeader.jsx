import { useEffect, useRef, useState } from 'react';
import {
  FiBell,
  FiChevronRight,
  FiLogOut,
  FiMenu,
  FiMoon,
  FiSearch,
  FiSun,
  FiUser,
} from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ROUTE_LABELS = {
  '/dashboard': 'Dashboard',
  '/calendar': 'Calendar',
  '/analytics': 'Analytics',
  '/decision-lab': 'Decision Lab',
  '/decision-insights': 'Decision Insights',
  '/decision-history': 'Decision Timeline',
  '/admin': 'Admin Dashboard',
  '/admin/users': 'Users',
  '/admin/tasks': 'Tasks',
  '/admin/decisions': 'Decisions',
  '/admin/analytics': 'Analytics',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/notifications': 'Notifications',
  '/admin/reports': 'Reports',
};

function getBreadcrumbs(pathname) {
  if (pathname.startsWith('/tasks/')) {
    return [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Task Detail', to: null },
    ];
  }

  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [];
  let path = '';

  segments.forEach((seg) => {
    path += `/${seg}`;
    const label = ROUTE_LABELS[path];
    if (label) crumbs.push({ label, to: path });
  });

  return crumbs;
}

export default function AppHeader({ onMenuClick, sidebarCollapsed, onToggleSidebar, isAdmin = false }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const profileRef = useRef(null);

  const breadcrumbs = getBreadcrumbs(location.pathname);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/dashboard?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="app-header sticky top-0 z-30 flex items-center gap-4 px-4 lg:px-6 h-14 shrink-0">
      <button
        type="button"
        onClick={onMenuClick}
        className="btn btn-ghost btn-icon lg:hidden"
        aria-label="Open menu"
      >
        <FiMenu size={20} />
      </button>

      <button
        type="button"
        onClick={onToggleSidebar}
        className="btn btn-ghost btn-icon hidden lg:flex"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <FiMenu size={18} />
      </button>

      <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1 text-sm min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.label} className="flex items-center gap-1 min-w-0">
            {i > 0 && <FiChevronRight size={14} className="text-[var(--app-text-muted)] shrink-0" />}
            {crumb.to && i < breadcrumbs.length - 1 ? (
              <Link
                to={crumb.to}
                className="text-[var(--app-text-secondary)] hover:text-[var(--app-text)] transition-colors truncate"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-[var(--app-text)] truncate">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      <form onSubmit={handleSearch} className="hidden md:block relative w-56 lg:w-72">
        <FiSearch
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks..."
          className="input pl-9 py-2 text-sm"
          aria-label="Search tasks"
        />
      </form>

      <button
        type="button"
        onClick={toggleTheme}
        className="btn btn-ghost btn-icon"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
          className="btn btn-ghost btn-icon relative"
          aria-label="Notifications"
        >
          <FiBell size={18} />
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 card p-4 animate-fade-in z-50">
            <p className="section-title text-sm mb-2">Notifications</p>
            <p className="text-sm text-[var(--app-text-secondary)]">No new notifications</p>
          </div>
        )}
      </div>

      <div className="relative" ref={profileRef}>
        <button
          type="button"
          onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--app-hover)] transition-colors"
          aria-label="Profile menu"
          aria-expanded={profileOpen}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #2563EB, #14B8A6)' }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="hidden lg:block text-sm font-medium text-[var(--app-text)] max-w-[120px] truncate">
            {user?.name}
          </span>
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 card py-2 animate-fade-in z-50">
            <div className="px-4 py-2 border-b border-[var(--app-border)]">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-[var(--app-text-secondary)] truncate">{user?.email}</p>
            </div>
            <Link
              to="/dashboard"
              onClick={() => setProfileOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] transition-colors"
            >
              <FiUser size={16} />
              Profile
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] transition-colors"
              >
                Admin Panel
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)] hover:text-[#EF4444] transition-colors"
            >
              <FiLogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
