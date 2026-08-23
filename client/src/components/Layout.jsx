import {
  FiBarChart2,
  FiCalendar,
  FiChevronLeft,
  FiCpu,
  FiHome,
  FiList,
  FiLogOut,
  FiSettings,
  FiShield,
  FiClock,
  FiTrendingUp,
} from 'react-icons/fi';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppHeader from './AppHeader';
import Logo from './Logo';

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed);
  }, [collapsed]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { to: '/tasks', icon: FiList, label: 'Tasks' },
    { to: '/calendar', icon: FiCalendar, label: 'Calendar' },
    { to: '/analytics', icon: FiBarChart2, label: 'Analytics' },
    { to: '/decision-lab', icon: FiCpu, label: 'Decision Lab' },
    { to: '/decision-insights', icon: FiTrendingUp, label: 'Decision Insights' },
    { to: '/decision-history', icon: FiClock, label: 'Decision Timeline' },
  ];

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-64';

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--app-bg)' }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 modal-overlay z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar fixed lg:static inset-y-0 left-0 z-50 ${sidebarWidth} flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center p-4' : 'p-5'} border-b border-white/10`}>
          <Link to="/dashboard" onClick={() => setSidebarOpen(false)}>
            <Logo size={collapsed ? 'sm' : 'md'} />
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}

          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? 'Admin Panel' : undefined}
              className={({ isActive }) =>
                `sidebar-nav-item mt-2 ${isActive ? 'sidebar-nav-item-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <FiShield size={20} className="shrink-0" />
              {!collapsed && <span>Admin Panel</span>}
            </NavLink>
          )}
        </nav>

        <div className="p-3 border-t border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-3 px-2 py-2 mb-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #2563EB, #14B8A6)' }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
          )}
          <Link
            to="/profile"
            title="Profile"
            className={`sidebar-nav-item w-full ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <FiSettings size={18} />
            {!collapsed && <span>Profile</span>}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className={`sidebar-nav-item w-full text-slate-400 hover:text-red-400 ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <FiLogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-nav-item w-full mt-1 hidden lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <FiChevronLeft size={18} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <AppHeader
          onMenuClick={() => setSidebarOpen(true)}
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed(!collapsed)}
          isAdmin={isAdmin}
        />
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
