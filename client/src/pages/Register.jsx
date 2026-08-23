import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiMail, FiMoon, FiSun, FiUser } from 'react-icons/fi';
import Logo from '../components/Logo';
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
        setErrors({ general: err.response?.data?.message || 'Registration failed. Please try again.' });
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
          <h1 className="page-title text-2xl">Create Account</h1>
          <p className="page-subtitle">Join Contextify today</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          {errors.general && <div className="form-alert-error">{errors.general}</div>}

          <div>
            <label className="label" htmlFor="name">Name</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" size={16} />
              <input
                id="name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input pl-9"
                placeholder="Your name"
                required
              />
            </div>
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

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
                placeholder="Min. 6 characters"
                required
              />
            </div>
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>

          <div>
            <label className="label" htmlFor="password_confirmation">Confirm Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" size={16} />
              <input
                id="password_confirmation"
                type="password"
                name="password_confirmation"
                value={form.password_confirmation}
                onChange={handleChange}
                className="input pl-9"
                placeholder="Confirm password"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Creating account...' : 'Register'}
          </button>

          <p className="text-center text-[var(--app-text-secondary)] text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-[#2563EB] hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
