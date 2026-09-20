import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiCheck, FiLock, FiMail, FiMoon, FiSun } from 'react-icons/fi';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const mapped = {};
        Object.keys(apiErrors).forEach((key) => {
          mapped[key] = apiErrors[key][0];
        });
        setErrors(mapped);
      } else {
        setErrors({ general: err.response?.data?.message || 'Invalid credentials. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ background: 'var(--app-bg)' }}>
      {/* Theme Toggle in Corner */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 btn btn-ghost btn-icon w-9 h-9 rounded-xl z-20"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
      </button>

      {/* Main Container */}
      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border border-[var(--app-border)] bg-[var(--app-card)] animate-fade-in">
        {/* Left Brand Panel (Desktop) */}
        <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#1D4ED8] text-white">
          <div>
            <Logo size="lg" variant="dark" />
            <div className="mt-12 space-y-4">
              <h2 className="text-2xl font-extrabold tracking-tight leading-snug">
                Personalized Decision Support for Daily Priorities
              </h2>
              <p className="text-blue-100 text-sm leading-relaxed">
                Experience explainable, multi-factor contextual ranking designed to resolve task ambiguity and workload overload.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-blue-100">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center text-white">
                <FiCheck size={12} />
              </span>
              <span>Deterministic mathematical scoring formula</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center text-white">
                <FiCheck size={12} />
              </span>
              <span>Automated calendar & deadline context derivation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center text-white">
                <FiCheck size={12} />
              </span>
              <span>Explainable AI natural-language justifications</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6 md:hidden">
            <Logo size="md" variant="light" className="mb-2" />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--app-text)]">
              Sign In
            </h1>
            <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] mt-1">
              Enter your credentials to access your prioritized workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[#EF4444] text-xs font-medium leading-relaxed">
                {errors.general}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="label text-xs font-semibold" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <FiMail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"
                  size={15}
                />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="input pl-9 text-xs sm:text-sm"
                  placeholder="name@organization.com"
                  required
                />
              </div>
              {errors.email && <p className="form-error text-xs">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="label text-xs font-semibold" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <FiLock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"
                  size={15}
                />
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input pl-9 text-xs sm:text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
              {errors.password && <p className="form-error text-xs">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 text-xs sm:text-sm font-semibold shadow-sm mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
            </button>

            <div className="pt-4 border-t border-[var(--app-border)] text-center text-xs text-[var(--app-text-secondary)]">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-[#2563EB] hover:underline font-bold">
                Create Account
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
