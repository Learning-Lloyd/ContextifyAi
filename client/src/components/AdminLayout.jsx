import {
  FiActivity,
  FiBell,
  FiCheckSquare,
  FiChevronLeft,
  FiFileText,
  FiHome,
  FiLogOut,
  FiPieChart,
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
    { to: '/admin/users', icon: FiUsers, label: 'User Management' },
    { to: '/admin/tasks', icon: FiCheckSquare, label: 'Task Monitoring' },
    { to: '/admin/decisions', icon: FiShield, label: 'Decision Logs' },
    { to: '/admin/analytics', icon: FiPieChart, label: 'Platform Analytics' },
    { to: '/admin/audit-logs', icon: FiActivity, label: 'Audit Trail' },
    { to: '/admin/notifications', icon: FiBell, label: 'Alerts & Notices' },
    { to: '/admin/reports', icon: FiFileText, label: 'Export Reports' },
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
        {/* Admin Brand Header */}
        <div className={`${collapsed ? 'p-4 flex justify-center' : 'p-5'} border-b border-white/[0.08]`}>
          <Link to="/admin" onClick={() => setSidebarOpen(false)}>
            {collapsed ? (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#2563EB]/20 text-[#60A5FA]">
                <FiShield size={18} />
              </div>
            ) : (
              <div className="space-y-1">
                <Logo size="md" variant="dark" />
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]" />
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Admin Portal
                  </span>
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Admin navigation">
          {!collapsed && (
            <p className="sidebar-section-label">System Administration</p>
          )}
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
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}

          <div className="pt-4 mt-2 border-t border-white/[0.08]">
            <Link
              to="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-nav-item text-slate-400 hover:text-white ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? 'User Dashboard' : undefined}
            >
              {!collapsed && <span className="text-xs">← Exit to User Dashboard</span>}
              {collapsed && <FiHome size={18} />}
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.08] space-y-1">
          {!collapsed && (
            <p className="text-xs font-semibold text-slate-300 px-2 py-1 truncate">
              {user?.name}
            </p>
          )}
          <button
            type="button"
            onClick={handleLogout}
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
          isAdmin
        />
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
