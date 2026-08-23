import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiMail } from 'react-icons/fi';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FiMoon, FiSun } from 'react-icons/fi';

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
        setErrors({ general: err.response?.data?.message || 'Login failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--app-bg)' }}>
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 btn btn-ghost btn-icon"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
      </button>

      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <Logo size="xl" className="mb-4" />
          <p className="text-[var(--app-text-secondary)]">Sign in to prioritize your day</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          {errors.general && <div className="form-alert-error">{errors.general}</div>}

          <div>
            <label className="label" htmlFor="email">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" size={16} />
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input pl-9"
                placeholder="you@example.com"
                required
              />
            </div>
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" size={16} />
              <input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input pl-9"
                placeholder="••••••••"
                required
              />
            </div>
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-[var(--app-text-secondary)] text-sm">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-[#2563EB] hover:underline font-medium">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
