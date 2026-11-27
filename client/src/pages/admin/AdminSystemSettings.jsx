import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/adminService';

export default function AdminSystemSettings() {
  const [enabled, setEnabled] = useState(true);
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    adminService.getSystemSettings().then((result) => {
      const setting = result.settings?.find((item) => item.key === 'registration_enabled');
      if (setting) { setEnabled(Boolean(setting.value)); setSaved(Boolean(setting.value)); }
    }).catch(() => showToast('Could not load system settings.', 'error')).finally(() => setLoading(false));
  }, [showToast]);

  const save = async () => {
    setSaving(true);
    try {
      const result = await adminService.updateSystemSetting('registration_enabled', { value: enabled });
      setSaved(Boolean(result.setting?.value));
      showToast('System setting saved.', 'success');
    } catch (error) {
      setEnabled(saved);
      showToast(error.response?.data?.message || 'Could not save the setting.', 'error');
    } finally { setSaving(false); }
  };

  return <AdminLayout><section className="card max-w-3xl p-6"><p className="eyebrow">ADMINISTRATION</p><h1 className="page-title">System settings</h1><p className="page-subtitle">Manage supported application behavior. Server secrets and scoring weights are not editable here.</p><div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--app-border)] pt-5"><div><strong>Allow new registrations</strong><p className="text-sm text-[var(--app-text-secondary)]">When turned off, existing accounts can still sign in.</p></div><label className="flex items-center gap-2"><input type="checkbox" checked={enabled} disabled={loading || saving} onChange={(event) => { setEnabled(event.target.checked); setSaved(false); }} /><span>{enabled ? 'Enabled' : 'Paused'}</span></label></div><button type="button" className="btn btn-primary mt-5" disabled={loading || saving || enabled === saved} onClick={save}>{saving ? 'Saving…' : 'Save setting'}</button></section></AdminLayout>;
}
