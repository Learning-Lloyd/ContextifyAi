import { useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const focusItems = [
  ['Education', 'Assignments, classes, and study plans'], ['Projects and Tasks', 'Break larger work into clear steps'],
  ['Personal Productivity', 'Build routines and keep daily tasks moving'], ['Work', 'Coordinate professional responsibilities'], ['Other', 'Make a workspace that fits your needs'],
];

export default function Onboarding() {
  const { user, updateProfile } = useAuth(); const navigate = useNavigate();
  const [step, setStep] = useState(1); const [focus, setFocus] = useState(user?.workspace_preferences?.focus || []); const [categories, setCategories] = useState(user?.workspace_preferences?.categories || []); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const toggle = (list, setList, item) => setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const finish = async (skip = false) => { setSaving(true); setError(''); try { const result = await authService.updateProfile({ workspace_preferences: { focus: skip ? [] : focus, categories: skip ? [] : categories }, onboarding_completed: true }); updateProfile(result.user); navigate('/dashboard', { replace: true }); } catch { setError('Could not save preferences. Please try again.'); } finally { setSaving(false); } };
  return <Layout><main className="max-w-3xl mx-auto py-8"><div className="mb-6"><div className="flex justify-between text-sm mb-2"><span className="font-medium">Personalize your workspace</span><span>Step {step} of 2</span></div><div className="h-2 bg-[var(--app-muted)] rounded-full"><div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${step * 50}%` }} /></div></div>
    <div className="card p-6 md:p-8"><p className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">A few quick choices</p><h1 className="page-title mt-2">{step === 1 ? 'What are you focused on?' : 'Which task categories do you use?'}</h1><p className="page-subtitle">You can change these later. They personalize your workspace and do not affect task scores.</p>
      <div className="grid gap-3 sm:grid-cols-2 mt-6">{step === 1 ? focusItems.map(([name, description]) => <button type="button" key={name} onClick={() => toggle(focus, setFocus, name)} className={`text-left rounded-xl border p-4 transition ${focus.includes(name) ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'border-[var(--app-border)] hover:border-emerald-400'}`}><span className="flex items-center justify-between font-semibold">{name}{focus.includes(name) && <FiCheck className="text-emerald-700" />}</span><span className="block mt-1 text-sm text-[var(--app-text-muted)]">{description}</span></button>) : ['Academic', 'Personal', 'Work'].map((name) => <button type="button" key={name} onClick={() => toggle(categories, setCategories, name)} className={`rounded-xl border p-5 text-left font-semibold ${categories.includes(name) ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'border-[var(--app-border)] hover:border-emerald-400'}`}>{name}{categories.includes(name) && <FiCheck className="inline ml-2 text-emerald-700" />}</button>)}</div>
      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}<div className="flex flex-wrap justify-between gap-3 mt-8"><button disabled={saving} className="btn btn-secondary" onClick={() => step === 1 ? finish(true) : setStep(1)}>{step === 1 ? 'Skip setup' : <><FiArrowLeft /> Back</>}</button>{step === 1 ? <button className="btn btn-primary" onClick={() => setStep(2)}>Continue <FiArrowRight /></button> : <button disabled={saving} className="btn btn-primary" onClick={() => finish()}>{saving ? 'Saving…' : 'Finish setup'}</button>}</div>
    </div></main></Layout>;
}
