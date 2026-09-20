import {
  FiBarChart2,
  FiCalendar,
  FiChevronLeft,
  FiClock,
  FiCpu,
  FiHome,
  FiList,
  FiLogOut,
  FiSettings,
  FiShield,
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

  const primaryNavItems = [
    { to: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { to: '/tasks', icon: FiList, label: 'Tasks' },
    { to: '/calendar', icon: FiCalendar, label: 'Calendar' },
    { to: '/analytics', icon: FiBarChart2, label: 'Analytics' },
  ];

  const decisionNavItems = [
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
        className={`sidebar fixed lg:static inset-y-0 left-0 z-50 ${sidebarWidth} flex flex-col transition-all duration-250 shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className={`flex items-center ${collapsed ? 'justify-center p-4' : 'p-5'} border-b border-white/[0.08]`}>
          <Link to="/dashboard" onClick={() => setSidebarOpen(false)}>
            <Logo size={collapsed ? 'sm' : 'md'} variant="dark" />
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {!collapsed && (
            <p className="sidebar-section-label">Core Productivity</p>
          )}
          {primaryNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}

          <div className="pt-3">
            {!collapsed && (
              <p className="sidebar-section-label">Decision Support</p>
            )}
            {decisionNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
                }
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </div>

          {isAdmin && (
            <div className="pt-3">
              {!collapsed && (
                <p className="sidebar-section-label">Administration</p>
              )}
              <NavLink
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? 'Admin Portal' : undefined}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
                }
              >
                <FiShield size={18} className="shrink-0 text-[#60A5FA]" />
                {!collapsed && <span>Admin Portal</span>}
              </NavLink>
            </div>
          )}
        </nav>

        {/* User Profile & Footer Controls */}
        <div className="p-3 border-t border-white/[0.08] space-y-1">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg bg-white/[0.03]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-[#2563EB] shrink-0 shadow-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
          )}
          <Link
            to="/profile"
            title="Profile Settings"
            className={`sidebar-nav-item w-full ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <FiSettings size={17} />
            {!collapsed && <span>Settings & Profile</span>}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className={`sidebar-nav-item w-full text-slate-400 hover:text-[#EF4444] ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <FiLogOut size={17} />
            {!collapsed && <span>Sign Out</span>}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-nav-item w-full hidden lg:flex text-slate-500 hover:text-slate-300"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <FiChevronLeft size={16} className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span className="text-xs">Collapse Navigation</span>}
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
