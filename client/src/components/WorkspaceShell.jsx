import { useEffect, useRef, useState } from 'react';
import { FiAward, FiChevronDown, FiClock, FiCommand, FiCompass, FiLogOut, FiMessageSquare, FiMoon, FiPlus, FiSearch, FiShield, FiSun, FiTrendingUp, FiUser } from 'react-icons/fi';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CommandPalette from './CommandPalette';
import Logo from './Logo';

const mainNav = [
  { to: '/dashboard', label: 'Today', end: true },
  { to: '/tasks', label: 'Queue' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/decision-lab', label: 'Decision lab' },
];

const decisionNav = [
  { to: '/decision-lab', label: 'Decision Lab', description: 'Compare priorities and run What-If analysis', icon: FiAward, end: true },
  { to: '/decision-insights', label: 'Decision Insights', description: 'Explore patterns in your saved decisions', icon: FiTrendingUp },
  { to: '/decision-history', label: 'Decision Timeline', description: 'Browse your past analyses and comparisons', icon: FiClock },
  { to: '/feedback', label: 'Feedback', description: 'Share feedback with the Contextify team', icon: FiMessageSquare },
];

export default function WorkspaceShell({ children, admin = false }) {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [decisionMenuOpen, setDecisionMenuOpen] = useState(false);
  const decisionMenuRef = useRef(null);
  const mobileDecisionMenuRef = useRef(null);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === 'Escape') {
        setProfileOpen(false);
        setDecisionMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setDecisionMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      const inDesktopMenu = decisionMenuRef.current?.contains(event.target);
      const inMobileMenu = mobileDecisionMenuRef.current?.contains(event.target);
      if (!inDesktopMenu && !inMobileMenu) setDecisionMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentLabel = admin ? 'Administration' : mainNav.find((item) => (
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  ))?.label || decisionNav.find((item) => item.to === location.pathname)?.label || 'Workspace';
  const decisionActive = decisionNav.some((item) => item.to === location.pathname);

  return (
    <div className={`workspace-app ${admin ? 'workspace-app-admin' : ''}`}>
      <header className="workspace-topbar">
        <Link to={isAdmin && admin ? '/admin' : '/dashboard'} className="workspace-brand" aria-label="Contextify home">
          <Logo size="sm" variant="light" />
          <span className="brand-divider" />
          <span className="brand-workspace">Decision workspace</span>
        </Link>

        <nav className="workspace-nav" aria-label="Primary navigation">
          {mainNav.slice(0, 3).map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `workspace-nav-link ${isActive ? 'is-active' : ''}`}>
              {label}
            </NavLink>
          ))}
          <div className="decision-nav-menu" ref={decisionMenuRef}>
            <button
              type="button"
              className={`workspace-nav-link decision-nav-trigger ${decisionActive ? 'is-active' : ''}`}
              aria-haspopup="menu"
              aria-expanded={decisionMenuOpen}
              onClick={() => setDecisionMenuOpen((open) => !open)}
            >
              Decision Lab <FiChevronDown size={14} aria-hidden="true" />
            </button>
            {decisionMenuOpen && (
              <div className="decision-nav-dropdown" role="menu" aria-label="Decision Lab pages">
                {decisionNav.map(({ to, label, description, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    role="menuitem"
                    className={({ isActive }) => `decision-nav-option ${isActive ? 'is-active' : ''}`}
                    onClick={() => setDecisionMenuOpen(false)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span><strong>{label}</strong><small>{description}</small></span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
          {isAdmin && <NavLink to="/admin" className={({ isActive }) => `workspace-nav-link workspace-nav-admin ${isActive || admin ? 'is-active' : ''}`}><FiShield size={14} /> Admin</NavLink>}
        </nav>

        <div className="workspace-tools">
          <button type="button" className="command-trigger" onClick={() => setPaletteOpen(true)} aria-label="Search tasks or navigate (Control K)">
            <FiSearch size={16} />
            <span>Search or jump to…</span>
            <kbd><FiCommand size={11} /> K</kbd>
          </button>
          {!admin && <button type="button" className="create-task-trigger" onClick={() => navigate('/tasks?new=1')}><FiPlus size={16} /><span>New task</span></button>}
          <button type="button" className="workspace-icon-button theme-trigger" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title="Toggle theme">
            {theme === 'dark' ? <FiSun size={17} /> : <FiMoon size={17} />}
          </button>
          <div className="profile-anchor">
            <button type="button" className="profile-trigger" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-label="Open account menu">
              <span className="profile-monogram">{user?.name?.charAt(0)?.toUpperCase() || <FiUser size={15} />}</span>
              <span className="profile-name">{user?.name?.split(' ')[0]}</span>
            </button>
            {profileOpen && <div className="profile-menu" role="menu">
              <div className="profile-menu-person"><strong>{user?.name}</strong><span>{user?.email}</span></div>
              <Link role="menuitem" to="/profile"><FiUser size={15} /> Profile & preferences</Link>
              {isAdmin && <Link role="menuitem" to="/admin"><FiShield size={15} /> Administration</Link>}
              <button type="button" role="menuitem" onClick={handleLogout}><FiLogOut size={15} /> Sign out</button>
            </div>}
          </div>
        </div>
      </header>

      <div className="workspace-mobile-context"><FiCompass size={15} /><span>{currentLabel}</span><button type="button" onClick={() => setPaletteOpen(true)} aria-label="Open navigation and search"><FiSearch size={17} /></button></div>
      <main className="workspace-main" id="main-content">{children}</main>

      <nav className="workspace-mobile-nav" aria-label="Mobile navigation">
        <NavLink to="/dashboard" end className={({ isActive }) => isActive ? 'is-active' : ''}><span className="mobile-nav-glyph">01</span><span>Today</span></NavLink>
        <NavLink to="/tasks" className={({ isActive }) => isActive ? 'is-active' : ''}><span className="mobile-nav-glyph">02</span><span>Queue</span></NavLink>
        <div className="mobile-decision-menu" ref={mobileDecisionMenuRef}>
          {decisionMenuOpen && (
            <div className="decision-nav-dropdown" role="menu" aria-label="Decision Lab pages">
              {decisionNav.map(({ to, label, description, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} role="menuitem" className={({ isActive }) => `decision-nav-option ${isActive ? 'is-active' : ''}`} onClick={() => setDecisionMenuOpen(false)}>
                  <Icon size={16} aria-hidden="true" />
                  <span><strong>{label}</strong><small>{description}</small></span>
                </NavLink>
              ))}
            </div>
          )}
          <button type="button" aria-haspopup="menu" aria-expanded={decisionMenuOpen} className={decisionActive ? 'is-active' : ''} onClick={() => setDecisionMenuOpen((open) => !open)}><span className="mobile-nav-glyph">03</span><span>Decide <FiChevronDown size={11} /></span></button>
        </div>
        <button type="button" onClick={() => setPaletteOpen(true)}><span className="mobile-nav-glyph"><FiCommand size={15} /></span><span>Explore</span></button>
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} isAdmin={isAdmin} />
    </div>
  );
}
