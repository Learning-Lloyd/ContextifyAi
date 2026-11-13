import { useState } from 'react';
import { FiDownload, FiFileText } from 'react-icons/fi';
import Layout from '../components/Layout';
import { goalsService } from '../services/goalsService';

export default function Reports() {
  const [period, setPeriod] = useState('weekly'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const download = async () => { setBusy(true); setError(''); try { const { data } = await goalsService.report(period); const url = URL.createObjectURL(data); const link = document.createElement('a'); link.href = url; link.download = `contextify-${period}-report.pdf`; link.click(); URL.revokeObjectURL(url); } catch { setError('Could not generate your report. Please try again.'); } finally { setBusy(false); } };
  return <Layout><div className="max-w-3xl mx-auto space-y-5"><header><p className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Your activity</p><h1 className="page-title">Reports</h1><p className="page-subtitle">Download a private summary of your own tasks and decision activity.</p></header><section className="card p-6 md:p-8"><FiFileText className="text-3xl text-emerald-700 mb-4" /><h2 className="text-xl font-semibold">Task activity report</h2><p className="text-sm text-[var(--app-text-secondary)] mt-2">Includes task totals, completion rate, categories, recent activity, and prioritization history for the selected period.</p><div className="flex flex-col sm:flex-row gap-3 mt-6"><select className="input sm:max-w-xs" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="weekly">This week</option><option value="monthly">This month</option></select><button className="btn btn-primary" disabled={busy} onClick={download}><FiDownload />{busy ? 'Preparing…' : 'Download PDF'}</button></div>{error && <p className="text-sm text-red-600 mt-3">{error}</p>}</section></div></Layout>;
}
