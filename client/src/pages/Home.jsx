import { Link, Navigate } from 'react-router-dom';
import { FiArrowRight, FiBarChart2, FiList, FiMoon, FiSun, FiZap } from 'react-icons/fi';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: FiZap,
      title: 'Weighted Scoring',
      description: 'Transparent priority formula based on importance, urgency, time, and workload.',
      color: 'icon-box-blue',
    },
    {
      icon: FiList,
      title: 'Smart Prioritization',
      description: 'Tasks automatically sorted from highest to lowest priority score.',
      color: 'icon-box-teal',
    },
    {
      icon: FiBarChart2,
      title: 'Analytics Dashboard',
      description: 'Visual insights into your task completion and priority patterns.',
      color: 'icon-box-green',
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <Logo size="lg" />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-ghost btn-icon"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
          <Link to="/login" className="btn btn-ghost">
            Sign In
          </Link>
          <Link to="/register" className="btn btn-primary">
            Get Started
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="text-center animate-fade-in max-w-3xl mx-auto">
          <Logo size="xl" className="justify-center mb-8" />
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-[var(--app-text)]">
            Prioritize Smarter,
            <br />
            <span className="text-[#2563EB]">Not Harder</span>
          </h1>
          <p className="text-lg text-[var(--app-text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Contextify is your personalized decision support system for daily task prioritization
            using a transparent weighted scoring formula.
          </p>
          <Link to="/register" className="btn btn-primary text-base px-8 py-3">
            Start Prioritizing
            <FiArrowRight size={18} />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-20">
          {features.map(({ icon: Icon, title, description, color }) => (
            <div key={title} className="card p-8 card-hover animate-fade-in">
              <div className={`icon-box ${color} mb-4`}>
                <Icon />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-[var(--app-text-secondary)] text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 card p-8 text-center">
          <h3 className="text-xl font-bold mb-3">Priority Formula</h3>
          <p className="text-[var(--app-text-secondary)] font-mono text-sm md:text-base">
            Score = (Importance × 0.40) + (Urgency × 0.30) + (Time × 0.20) + (Workload × 0.10)
          </p>
        </div>
      </main>
    </div>
  );
}
