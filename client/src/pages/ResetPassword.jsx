import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await authService.resetPassword({ token, email, password, password_confirmation: confirmation });
      setMessage(result.message);
    } catch (err) {
      setError(err.response?.data?.errors?.token?.[0] || err.response?.data?.errors?.password?.[0] || err.response?.data?.message || 'This reset link is invalid or expired. Request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--app-bg)' }}>
      <section className="w-full max-w-md p-8 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-xl">
        <h1 className="text-2xl font-bold text-[var(--app-text)]">Choose a new password</h1>
        <p className="mt-2 mb-6 text-sm text-[var(--app-text-secondary)]">Resetting password for {email || 'your account'}.</p>
        {message ? <><p role="status" className="mb-4 text-sm text-emerald-600">{message}</p><Link className="text-sm text-[#2563EB] hover:underline" to="/login">Sign in</Link></> : <>
          {error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1 text-sm text-[var(--app-text)]">New password
              <input className="input w-full" type="password" autoComplete="new-password" minLength="8" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm text-[var(--app-text)]">Confirm new password
              <input className="input w-full" type="password" autoComplete="new-password" minLength="8" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
            </label>
            <button className="btn btn-primary w-full" disabled={loading || !token || !email}>{loading ? 'Updating…' : 'Reset password'}</button>
          </form>
          {(!token || !email) && <p role="alert" className="mt-4 text-sm text-red-500">Reset link is incomplete. Request a new link.</p>}
        </>}
      </section>
    </main>
  );
}
