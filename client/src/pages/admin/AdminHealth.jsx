import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/adminService';

const labelize = (value) => String(value || 'unknown').replaceAll('_', ' ');
export default function AdminHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const refresh = useCallback(() => { setLoading(true); adminService.getHealth().then(setHealth).catch(() => showToast('Health information could not be loaded.', 'error')).finally(() => setLoading(false)); }, [showToast]);
  useEffect(() => { refresh(); }, [refresh]);
  const rows = health ? [
    ['Application', health.application?.status], ['Backend API', health.api?.status], ['Database', health.database?.status],
    ['Gemini', health.providers?.gemini?.status], ['Weather service', health.providers?.weather?.status],
    ['Reminder schedule', health.scheduler?.reminder_job], ['Scheduler last execution', health.scheduler?.last_execution], ['Recent errors', health.recent_errors?.status],
  ] : [];
  return <AdminLayout><section className="max-w-4xl space-y-5"><header><p className="eyebrow">ADMINISTRATION</p><h1 className="page-title">System health</h1><p className="page-subtitle">Live, low-impact checks. Provider keys are never shown or tested from this page.</p></header>{loading ? <div className="card p-5">Checking application health…</div> : health && <div className="card divide-y divide-[var(--app-border)] px-5">{rows.map(([label, value]) => <div className="flex items-center justify-between gap-4 py-4" key={label}><strong className="text-sm">{label}</strong><span className="text-sm capitalize text-[var(--app-text-secondary)]">{labelize(value)}{label === 'Database' && health.database.response_ms !== null ? ` · ${health.database.response_ms} ms` : ''}</span></div>)}</div>}<div className="card p-4 text-sm text-[var(--app-text-secondary)]"><p>Gemini shows configuration only, not provider availability. Weather reachability, recent private logs, and scheduler last-run time are not currently measured. EthioDeploy scheduling can pause while a free instance sleeps.</p><p className="mt-2">Checked: {health?.checked_at ? new Date(health.checked_at).toLocaleString() : '—'}</p></div><button type="button" className="btn btn-secondary" disabled={loading} onClick={refresh}>Refresh checks</button></section></AdminLayout>;
}
