import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const result = await authService.forgotPassword({ email });
      setMessage(result.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send a reset link. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--app-bg)' }}>
      <section className="w-full max-w-md p-8 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-xl">
        <h1 className="text-2xl font-bold text-[var(--app-text)]">Reset your password</h1>
        <p className="mt-2 mb-6 text-sm text-[var(--app-text-secondary)]">Enter your account email and we’ll send a password reset link.</p>
        {message && <p role="status" className="mb-4 text-sm text-emerald-600">{message}</p>}
        {error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1 text-sm text-[var(--app-text)]">Email address
            <input className="input w-full" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn btn-primary w-full" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
        </form>
        <Link className="block mt-5 text-sm text-[#2563EB] hover:underline" to="/login">Back to sign in</Link>
      </section>
    </main>
  );
}
