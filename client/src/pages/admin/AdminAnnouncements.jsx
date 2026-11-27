import { useEffect, useRef, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/adminService';

const emptyForm = { title: '', body: '', status: 'draft', starts_at: '', expires_at: '' };
const localInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const apiDate = (value) => value ? new Date(value).toISOString() : null;

export default function AdminAnnouncements() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const submitInFlightRef = useRef(false);
  const requestKeyRef = useRef(null);
  const { showToast } = useToast();
  const refresh = () => adminService.getAnnouncements().then((data) => setItems(data.announcements?.data || []));
  useEffect(() => { refresh().catch(() => showToast('Could not load announcements.', 'error')); }, [showToast]);

  const submit = async (event) => {
    event.preventDefault();
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setSaving(true);
    requestKeyRef.current ||= globalThis.crypto?.randomUUID?.() || `announcement-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const payload = { ...form, request_key: editing ? undefined : requestKeyRef.current, starts_at: apiDate(form.starts_at), expires_at: apiDate(form.expires_at) };
    let persisted = false;
    try {
      if (editing) await adminService.updateAnnouncement(editing, payload);
      else await adminService.createAnnouncement(payload);
      persisted = true;
      setForm(emptyForm); setEditing(null); requestKeyRef.current = null; showToast('Announcement saved.', 'success');
    } catch (error) { showToast(error.response?.data?.message || 'Could not save announcement.', 'error'); }
    finally { submitInFlightRef.current = false; setSaving(false); }
    if (persisted) {
      try { await refresh(); } catch { showToast('Announcement saved, but the list did not refresh. Reload this page to see it.', 'error'); }
    }
  };
  const edit = (item) => { setEditing(item.id); setForm({ title: item.title, body: item.body, status: item.status, starts_at: localInput(item.starts_at), expires_at: localInput(item.expires_at) }); };
  const remove = async (item) => { if (!window.confirm(`Remove draft “${item.title}”?`)) return; try { await adminService.deleteAnnouncement(item.id); await refresh(); showToast('Draft removed.', 'success'); } catch (error) { showToast(error.response?.data?.message || 'Could not remove announcement.', 'error'); } };

  return <AdminLayout><div className="max-w-5xl space-y-6"><header><p className="eyebrow">ADMINISTRATION</p><h1 className="page-title">Announcements</h1><p className="page-subtitle">Published notices are delivered through users’ notification bells.</p></header><form className="card grid gap-4 p-5" onSubmit={submit}><h2 className="text-lg font-semibold">{editing ? 'Edit announcement' : 'Create announcement'}</h2><label className="grid gap-1 text-sm">Title<input className="input" maxLength="180" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label className="grid gap-1 text-sm">Message<textarea className="input min-h-28" maxLength="10000" required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label><div className="grid gap-4 sm:grid-cols-3"><label className="grid gap-1 text-sm">State<select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="draft">Draft</option><option value="published">Published</option></select></label><label className="grid gap-1 text-sm">Show from (optional)<input className="input" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></label><label className="grid gap-1 text-sm">Expires at (optional)<input className="input" type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></label></div><div className="flex gap-2"><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create announcement'}</button>{editing && <button type="button" className="btn btn-secondary" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancel</button>}</div></form><section className="space-y-3"><h2 className="text-lg font-semibold">Existing announcements</h2>{items.length ? items.map((item) => <article className="card flex flex-wrap items-start justify-between gap-4 p-4" key={item.id}><div className="min-w-0"><div className="flex items-center gap-2"><strong>{item.title}</strong><span className="rounded-full bg-[var(--app-muted)] px-2 py-0.5 text-xs">{item.status}</span></div><p className="mt-1 whitespace-pre-wrap text-sm text-[var(--app-text-secondary)]">{item.body}</p><small className="text-[var(--app-text-muted)]">{item.starts_at ? `Starts ${new Date(item.starts_at).toLocaleString()}` : 'Available when published'}{item.expires_at ? ` · Expires ${new Date(item.expires_at).toLocaleString()}` : ''}</small></div><div className="flex gap-2"><button type="button" className="btn btn-secondary btn-sm" onClick={() => edit(item)}>Edit / {item.status === 'draft' ? 'Publish' : 'Unpublish'}</button>{item.status === 'draft' && <button type="button" className="btn btn-secondary btn-sm" onClick={() => remove(item)}>Remove</button>}</div></article>) : <p className="card p-4 text-sm text-[var(--app-text-secondary)]">No announcements yet.</p>}</section></div></AdminLayout>;
}
