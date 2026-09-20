import { useEffect, useRef, useState } from 'react';
import {
  FiBell,
  FiChevronRight,
  FiLogOut,
  FiMenu,
  FiMoon,
  FiSearch,
  FiShield,
  FiSun,
  FiUser,
} from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ROUTE_LABELS = {
  '/dashboard': 'Dashboard',
  '/tasks': 'Tasks',
  '/calendar': 'Calendar',
  '/analytics': 'Analytics',
  '/decision-lab': 'Decision Lab',
  '/decision-insights': 'Decision Insights',
  '/decision-history': 'Decision Timeline',
  '/profile': 'Profile Settings',
  '/admin': 'Admin Dashboard',
  '/admin/users': 'User Management',
  '/admin/tasks': 'Task Monitoring',
  '/admin/decisions': 'Decision Monitoring',
  '/admin/analytics': 'Platform Analytics',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/notifications': 'Notifications',
  '/admin/reports': 'Reports Center',
};

function getBreadcrumbs(pathname) {
  if (pathname.startsWith('/tasks/')) {
    return [
      { label: 'Tasks', to: '/tasks' },
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
  const notifRef = useRef(null);

  const breadcrumbs = getBreadcrumbs(location.pathname);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
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
      navigate(`/tasks?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="app-header sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-6 h-14 shrink-0 transition-colors">
      {/* Mobile drawer toggle */}
      <button
        type="button"
        onClick={onMenuClick}
        className="btn btn-ghost btn-icon lg:hidden w-8 h-8 rounded-lg"
        aria-label="Open menu"
      >
        <FiMenu size={18} />
      </button>

      {/* Desktop collapse toggle */}
      <button
        type="button"
        onClick={onToggleSidebar}
        className="btn btn-ghost btn-icon hidden lg:flex w-8 h-8 rounded-lg"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <FiMenu size={16} />
      </button>

      {/* Breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.label} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <FiChevronRight size={12} className="text-[var(--app-text-muted)] shrink-0" />}
            {crumb.to && i < breadcrumbs.length - 1 ? (
              <Link
                to={crumb.to}
                className="text-[var(--app-text-secondary)] hover:text-[#2563EB] transition-colors truncate font-medium"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="font-semibold text-[var(--app-text)] truncate">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Quick Search */}
      <form onSubmit={handleSearch} className="hidden md:block relative w-52 lg:w-64">
        <FiSearch
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks (Press Enter)..."
          className="input pl-8 py-1.5 text-xs rounded-lg"
          aria-label="Search tasks"
        />
      </form>

      {/* Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="btn btn-ghost btn-icon w-8 h-8 rounded-lg text-[var(--app-text-secondary)] hover:text-[var(--app-text)]"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
      </button>

      {/* Notification Dropdown */}
      <div className="relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => {
            setNotifOpen(!notifOpen);
            setProfileOpen(false);
          }}
          className="btn btn-ghost btn-icon w-8 h-8 rounded-lg relative text-[var(--app-text-secondary)] hover:text-[var(--app-text)]"
          aria-label="Notifications"
          title="Notifications"
        >
          <FiBell size={16} />
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 card p-4 animate-fade-in z-50 shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--app-border)]">
              <p className="text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider">
                Notifications
              </p>
              <span className="text-[10px] text-[var(--app-text-muted)]">Real-time</span>
            </div>
            <p className="text-xs text-[var(--app-text-secondary)] py-3 text-center">
              No new unread alerts
            </p>
          </div>
        )}
      </div>

      {/* User Profile Menu */}
      <div className="relative" ref={profileRef}>
        <button
          type="button"
          onClick={() => {
            setProfileOpen(!profileOpen);
            setNotifOpen(false);
          }}
          className="flex items-center gap-2 rounded-lg p-1 hover:bg-[var(--app-hover)] transition-colors"
          aria-label="Profile menu"
          aria-expanded={profileOpen}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-[#2563EB] shadow-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="hidden lg:block text-xs font-semibold text-[var(--app-text)] max-w-[110px] truncate">
            {user?.name}
          </span>
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 card py-1.5 animate-fade-in z-50 shadow-xl">
            <div className="px-3.5 py-2 border-b border-[var(--app-border)]">
              <p className="text-xs font-semibold text-[var(--app-text)] truncate">{user?.name}</p>
              <p className="text-[11px] text-[var(--app-text-secondary)] truncate">{user?.email}</p>
              {isAdmin && (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#2563EB] bg-blue-500/10 px-1.5 py-0.5 rounded">
                  <FiShield size={10} /> Administrator
                </span>
              )}
            </div>
            <div className="py-1">
              <Link
                to="/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] transition-colors"
              >
                <FiUser size={14} />
                Profile Settings
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)] hover:text-[#2563EB] transition-colors"
                >
                  <FiShield size={14} />
                  Admin Panel
                </Link>
              )}
            </div>
            <div className="pt-1 border-t border-[var(--app-border)]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[#EF4444] hover:bg-red-500/10 transition-colors text-left"
              >
                <FiLogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
