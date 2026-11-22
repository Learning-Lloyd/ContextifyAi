import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiCalendar, FiCpu, FiLock, FiMail, FiMessageSquare, FiMoon, FiSun, FiUser } from 'react-icons/fi';
import Logo from '../components/Logo';
import AuthDecorations from '../components/AuthDecorations';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Register() {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
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
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const mapped = {};
        Object.keys(apiErrors).forEach((key) => {
          mapped[key] = apiErrors[key][0];
        });
        setErrors(mapped);
      } else {
        setErrors({ general: err.response?.data?.message || 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-stage min-h-screen flex items-center justify-center p-4 sm:p-6">
      <AuthDecorations />
      {/* Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 btn btn-ghost btn-icon w-9 h-9 rounded-xl z-20"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
      </button>

      {/* Main Container */}
      <div className="auth-card w-full max-w-5xl grid md:grid-cols-2 rounded-[28px] overflow-hidden animate-fade-in">
        {/* Left Brand Panel */}
        <div className="auth-brand-panel hidden md:flex flex-col justify-between p-10 lg:p-12">
          <div>
            <Logo size="lg" variant={theme === 'dark' ? 'dark' : 'light'} />
            <div className="mt-12 space-y-4">
              <div className="auth-pill"><span aria-hidden="true">◎</span> WORKSPACE PRIORITY</div>
              <h2 className="auth-headline text-3xl font-extrabold tracking-tight leading-snug">
                Focus on what<br /><span>matters most.</span>
              </h2>
              <p className="auth-description text-sm leading-relaxed">
                Take the guesswork out of what to do next. Let mathematical multi-factor contextual analysis schedule and organize your tasks.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs auth-features">
            <div className="auth-feature-row flex items-center gap-2">
              <span className="auth-feature-icon auth-feature-icon-blue"><FiCpu size={15} /></span>
              <span>Deterministic mathematical scoring</span>
            </div>
            <div className="auth-feature-row flex items-center gap-2">
              <span className="auth-feature-icon auth-feature-icon-purple"><FiCalendar size={15} /></span>
              <span>Automated calendar context derivation</span>
            </div>
            <div className="auth-feature-row flex items-center gap-2">
              <span className="auth-feature-icon auth-feature-icon-indigo"><FiMessageSquare size={15} /></span>
              <span>Explainable AI natural justifications</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="auth-form-panel p-8 sm:p-10 lg:p-14 flex flex-col justify-center">
          <div className="mb-6 md:hidden">
            <Logo size="md" variant={theme === 'dark' ? 'dark' : 'light'} className="mb-2" />
          </div>

          <div className="mb-6">
            <h1 className="auth-form-heading text-3xl font-bold tracking-tight text-[var(--app-text)]">
              Create Account
            </h1>
            <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] mt-1">
              Start prioritizing your daily schedule with Contextify
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {errors.general && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[#EF4444] text-xs font-medium leading-relaxed">
                {errors.general}
              </div>
            )}

            <div className="space-y-1">
              <label className="label text-xs font-semibold" htmlFor="name">
                Full Name
              </label>
              <div className="leading-icon-field">
                <FiUser
                  className="input-leading-icon"
                  size={15}
                />
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input input-with-leading-icon text-xs sm:text-sm"
                  placeholder="Your Name"
                  required
                />
              </div>
              {errors.name && <p className="form-error text-xs">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <label className="label text-xs font-semibold" htmlFor="email">
                Email Address
              </label>
              <div className="leading-icon-field">
                <FiMail
                  className="input-leading-icon"
                  size={15}
                />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="input input-with-leading-icon text-xs sm:text-sm"
                  placeholder="name@organization.com"
                  required
                />
              </div>
              {errors.email && <p className="form-error text-xs">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <label className="label text-xs font-semibold" htmlFor="password">
                Password
              </label>
              <div className="leading-icon-field">
                <FiLock
                  className="input-leading-icon"
                  size={15}
                />
                <input
                  id="password"
                  type="password"
                  minLength={8}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input input-with-leading-icon text-xs sm:text-sm"
                  placeholder="Min. 8 characters"
                  required
                />
              </div>
              {errors.password && <p className="form-error text-xs">{errors.password}</p>}
            </div>

            <div className="space-y-1">
              <label className="label text-xs font-semibold" htmlFor="password_confirmation">
                Confirm Password
              </label>
              <div className="leading-icon-field">
                <FiLock
                  className="input-leading-icon"
                  size={15}
                />
                <input
                  id="password_confirmation"
                  type="password"
                  name="password_confirmation"
                  value={form.password_confirmation}
                  onChange={handleChange}
                  className="input input-with-leading-icon text-xs sm:text-sm"
                  placeholder="Repeat your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary auth-submit w-full py-3 text-xs sm:text-sm font-semibold shadow-sm mt-2"
            >
              {loading ? 'Creating Account...' : 'Get Started'}
            </button>

            <div className="pt-3 border-t border-[var(--app-border)] text-center text-xs text-[var(--app-text-secondary)]">
              Already have an account?{' '}
              <Link to="/login" className="auth-link hover:underline font-bold">
                Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
