import { Link, Navigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiCpu,
  FiMoon,
  FiSliders,
  FiSun,
  FiZap,
} from 'react-icons/fi';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const factors = [
    {
      name: 'Task Importance',
      weight: '40%',
      desc: 'Criticality and academic/professional impact evaluated via AI or rule-based heuristics.',
      color: 'border-l-[#2563EB]',
    },
    {
      name: 'Deadline Urgency',
      weight: '30%',
      desc: 'Mathematical countdown from task due dates, dynamically penalizing procrastination.',
      color: 'border-l-[#F59E0B]',
    },
    {
      name: 'Time Availability',
      weight: '20%',
      desc: 'Calendar schedule analysis determining available hours in your upcoming 7-day window.',
      color: 'border-l-[#14B8A6]',
    },
    {
      name: 'Current Workload',
      weight: '10%',
      desc: 'Total active backlog commitments across a 14-day window to prevent overload.',
      color: 'border-l-[#64748B]',
    },
  ];

  const features = [
    {
      icon: FiZap,
      title: 'Deterministic Multi-Factor Scoring',
      desc: 'Priority is computed by an exact mathematical formula, ensuring consistent, unbiased, repeatable ranking outcomes.',
    },
    {
      icon: FiSliders,
      title: 'Interactive What-If Simulator',
      desc: 'Conduct sensitivity analyses by adjusting factor sliders to observe simulated ranking shifts in real time.',
    },
    {
      icon: FiCpu,
      title: 'Explainable AI Interpretations',
      desc: 'Natural language justifications explain why tasks were prioritized without modifying mathematical rankings.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--app-bg)' }}>
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 app-header backdrop-blur-md border-b border-[var(--app-border)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-ghost btn-icon w-9 h-9 rounded-xl"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <FiSun size={17} /> : <FiMoon size={17} />}
            </button>
            <Link to="/login" className="btn btn-ghost text-xs sm:text-sm font-semibold">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary text-xs sm:text-sm font-semibold shadow-sm">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-16 sm:py-24 space-y-20">
        <div className="text-center space-y-6 max-w-3xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-[#2563EB] text-xs font-bold uppercase tracking-wider">
            <span>Decision Support System</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--app-text)] leading-[1.15]">
            Multi-Factor Contextual <br />
            <span className="text-[#2563EB]">Daily Task Prioritization</span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--app-text-secondary)] leading-relaxed max-w-2xl mx-auto">
            Contextify resolves task overwhelm by mathematically evaluating importance, deadlines, schedule availability, and environmental conditions.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/register"
              className="btn btn-primary text-sm sm:text-base px-7 py-3 font-semibold shadow-md inline-flex items-center gap-2"
            >
              Start Prioritizing Now <FiArrowRight size={17} />
            </Link>
            <Link
              to="/login"
              className="btn btn-secondary text-sm sm:text-base px-7 py-3 font-semibold"
            >
              Sign In to Workspace
            </Link>
          </div>
        </div>

        {/* 4 Contextual Factors Cards */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-[var(--app-text)]">
              Four-Factor Multi-Contextual Evaluation
            </h2>
            <p className="text-xs sm:text-sm text-[var(--app-text-muted)]">
              Tasks are scored according to deterministic weights
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {factors.map((f) => (
              <div
                key={f.name}
                className={`card p-5 border-l-4 ${f.color} space-y-2 shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--app-text)]">{f.name}</span>
                  <span className="badge badge-primary text-xs font-mono font-bold">{f.weight}</span>
                </div>
                <p className="text-xs text-[var(--app-text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Formula Showcase Banner */}
        <div className="card p-8 bg-gradient-to-br from-[var(--app-card)] to-[var(--app-muted)]/40 border border-[var(--app-border)] text-center space-y-3 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
            Core Deterministic Equation
          </span>
          <div className="text-sm sm:text-base md:text-lg font-extrabold text-[var(--app-text)] font-mono tracking-tight bg-[var(--app-surface)] py-3 px-4 rounded-xl border border-[var(--app-border)] inline-block">
            Score = (Imp × 0.40) + (Urg × 0.30) + (Time × 0.20) + (Workload × 0.10)
          </div>
          <p className="text-xs text-[var(--app-text-muted)] max-w-md mx-auto">
            100% deterministic arithmetic. AI provides explainability and keyword suggestion only.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 pt-4">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card p-6 card-hover shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#2563EB] flex items-center justify-center">
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-bold text-[var(--app-text)]">{item.title}</h3>
                <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--app-border)] py-8 px-6 text-center text-xs text-[var(--app-text-muted)] mt-auto">
        <p>Contextify · A Multi-Factor Contextual Task Prioritization Decision Support System</p>
      </footer>
    </div>
  );
}
