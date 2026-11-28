import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiMail, FiMoon, FiSun } from 'react-icons/fi';
import Logo from '../components/Logo';
import { authService } from '../services/authService';
import { useTheme } from '../context/ThemeContext';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState(() => location.state?.email || sessionStorage.getItem('contextify-pending-verification-email') || '');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(() => Number(location.state?.resendAfterSeconds || 0));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await authService.verifyEmail({ email: email.trim(), code });
      sessionStorage.removeItem('contextify-pending-verification-email');
      navigate('/login', { replace: true, state: { verified: true, email: email.trim(), message: result.message } });
    } catch (err) {
      setError(err.response?.data?.errors?.code?.[0] || err.response?.data?.message || 'We could not verify that code. Check it and try again.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError('');
    setMessage('');
    try {
      const result = await authService.resendVerificationCode({ email: email.trim() });
      setMessage(result.message);
      setCooldown(Number(result.retry_after_seconds || 60));
    } catch (err) {
      setError(err.response?.data?.message || 'We could not send a new code. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="auth-stage min-h-screen flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 btn btn-ghost btn-icon w-9 h-9 rounded-xl z-20"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
      </button>
      <section className="auth-card w-full max-w-md rounded-[24px] p-6 sm:p-9">
        <Logo size="md" variant={theme === 'dark' ? 'dark' : 'light'} className="mb-7" />
        <div className="mb-6">
          <div className="mb-3 inline-flex rounded-xl bg-blue-500/10 p-3 text-blue-600"><FiMail size={20} /></div>
          <h1 className="auth-form-heading text-2xl font-bold text-[var(--app-text)]">Verify your email</h1>
          <p className="mt-2 text-sm text-[var(--app-text-secondary)]">
            Enter the six-digit code sent to your address. If you closed this page, enter the email you registered with.
          </p>
        </div>
        {message && <p role="status" className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1.5 text-xs font-semibold text-[var(--app-text-secondary)]" htmlFor="verify-email-address">
            EMAIL ADDRESS
            <input
              id="verify-email-address"
              type="email"
              autoComplete="email"
              required
              maxLength={255}
              className="input w-full text-sm"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-xs font-semibold text-[var(--app-text-secondary)]" htmlFor="verification-code">
            SIX-DIGIT CODE
            <input
              id="verification-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              className="input w-full text-center text-lg tracking-[0.4em]"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-describedby="verification-code-help"
            />
            <span id="verification-code-help" className="block text-xs font-normal text-[var(--app-text-muted)]">The code expires 10 minutes after it was sent.</span>
          </label>
          <button type="submit" className="btn btn-primary w-full" disabled={loading || code.length !== 6}>
            {loading ? 'Verifying…' : <><FiCheckCircle className="mr-2 inline" /> Verify code</>}
          </button>
        </form>
        <button
          type="button"
          className="btn btn-secondary mt-3 w-full"
          disabled={resending || cooldown > 0 || !email.trim()}
          onClick={resend}
        >
          {resending ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
        <Link to="/login" className="mt-5 inline-flex items-center gap-2 text-sm auth-link hover:underline">
          <FiArrowLeft size={14} /> Return to sign in
        </Link>
      </section>
    </main>
  );
}
