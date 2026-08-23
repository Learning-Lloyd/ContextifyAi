import {
  FiBarChart2,
  FiBell,
  FiChevronLeft,
  FiClipboard,
  FiHome,
  FiLogOut,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppHeader from './AppHeader';
import Logo from './Logo';

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('admin-sidebar-collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', collapsed);
  }, [collapsed]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', icon: FiHome, label: 'Dashboard', end: true },
    { to: '/admin/users', icon: FiUsers, label: 'Users' },
    { to: '/admin/tasks', icon: FiClipboard, label: 'Tasks' },
    { to: '/admin/decisions', icon: FiShield, label: 'Decisions' },
    { to: '/admin/analytics', icon: FiBarChart2, label: 'Analytics' },
    { to: '/admin/audit-logs', icon: FiClipboard, label: 'Audit Logs' },
    { to: '/admin/notifications', icon: FiBell, label: 'Notifications' },
    { to: '/admin/reports', icon: FiBarChart2, label: 'Reports' },
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
        <div className={`${collapsed ? 'p-4 flex justify-center' : 'p-5'} border-b border-white/10`}>
          <Link to="/admin" onClick={() => setSidebarOpen(false)}>
            {collapsed ? (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#2563EB]/20">
                <FiShield className="text-[#60A5FA]" size={18} />
              </div>
            ) : (
              <div>
                <Logo size="md" />
                <p className="text-sm font-semibold text-white mt-1">Admin Panel</p>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Admin navigation">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
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

          <Link
            to="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={`sidebar-nav-item mt-4 text-slate-400 ${collapsed ? 'justify-center px-0' : ''}`}
            title={collapsed ? 'User Dashboard' : undefined}
          >
            {!collapsed && <span>← User Dashboard</span>}
            {collapsed && <FiHome size={20} />}
          </Link>
        </nav>

        <div className="p-3 border-t border-white/10">
          {!collapsed && (
            <p className="text-sm text-slate-300 px-2 py-2 truncate">{user?.name}</p>
          )}
          <button
            type="button"
            onClick={handleLogout}
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
          isAdmin
        />
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
