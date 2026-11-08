import { useState } from 'react';
import { FiBell, FiInfo, FiMail, FiMapPin, FiSave, FiShield, FiUser } from 'react-icons/fi';
import Layout from '../components/Layout';
import LocationSearch from '../components/LocationSearch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { authService } from '../services/authService';

export default function Profile() {
  const { user, updateProfile, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name || '');
  const [cityData, setCityData] = useState({
    location: user?.city || '',
    latitude: user?.city_latitude ?? null,
    longitude: user?.city_longitude ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [taskRemindersEnabled, setTaskRemindersEnabled] = useState(user?.task_reminders_enabled ?? true);
  const [overdueRemindersEnabled, setOverdueRemindersEnabled] = useState(user?.overdue_reminders_enabled ?? true);
  const [deadlineReminderMinutes, setDeadlineReminderMinutes] = useState(user?.deadline_reminder_minutes ?? 1440);
  const [dailyAvailableMinutes, setDailyAvailableMinutes] = useState(user?.daily_available_minutes ?? '');
  const [workdayStartTime, setWorkdayStartTime] = useState(user?.workday_start_time?.slice(0, 5) || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await authService.updateProfile({
        name: name.trim(),
        city: cityData.location || null,
        city_latitude: cityData.latitude,
        city_longitude: cityData.longitude,
        task_reminders_enabled: taskRemindersEnabled,
        overdue_reminders_enabled: overdueRemindersEnabled,
        deadline_reminder_minutes: Number(deadlineReminderMinutes),
        daily_available_minutes: dailyAvailableMinutes ? Number(dailyAvailableMinutes) : null,
        workday_start_time: workdayStartTime || null,
      });
      updateProfile(data.user);
      showToast('Profile updated successfully', 'success');
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="pb-2 border-b border-[var(--app-border)]">
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle text-sm">Account and planning preferences.</p>
        </div>

        {/* User Identity Banner */}
        <div className="card p-6 flex items-center gap-4 bg-[var(--app-card)] shadow-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-extrabold text-white bg-[#2563EB] shadow-md shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--app-text)] truncate">{user?.name}</h2>
              {isAdmin && (
                <span className="badge badge-primary text-[10px] font-semibold">
                  <FiShield size={10} /> Admin
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--app-text-muted)] flex items-center gap-1.5 mt-0.5">
              <FiMail size={12} /> {user?.email}
            </p>
            {user?.city && (
              <p className="text-xs text-[var(--app-text-secondary)] flex items-center gap-1.5 mt-1 font-medium">
              <FiMapPin size={12} className="text-[#2563EB]" /> {user.city}
              </p>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-5 shadow-sm">
          <div className="space-y-1.5">
            <label className="label" htmlFor="profile-name">
              Name
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" size={16} />
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--app-border)]">
            <div>
              <label className="label">City</label>
              <p className="text-sm text-[var(--app-text-muted)] mb-2">Used for local weather.</p>
            </div>
            <LocationSearch value={cityData} onChange={setCityData} />
          </div>

          <div className="space-y-4 pt-4 border-t border-[var(--app-border)]">
            <div className="flex items-center gap-2"><FiBell className="text-[#285E4D]" /><h2 className="font-bold text-sm text-[var(--app-text)]">Deadline reminders</h2></div>
            <label className="flex items-start gap-3 text-sm text-[var(--app-text-secondary)]">
              <input type="checkbox" checked={taskRemindersEnabled} onChange={(e) => setTaskRemindersEnabled(e.target.checked)} className="mt-0.5" />
              <span><strong className="text-[var(--app-text)]">Upcoming deadline reminders</strong></span>
            </label>
            <label className="block space-y-1.5">
              <span className="label">Remind me before the deadline</span>
              <select value={deadlineReminderMinutes} onChange={(e) => setDeadlineReminderMinutes(e.target.value)} disabled={!taskRemindersEnabled} className="input">
                <option value={60}>1 hour</option><option value={360}>6 hours</option><option value={720}>12 hours</option><option value={1440}>24 hours</option><option value={2880}>48 hours</option>
              </select>
            </label>
            <label className="flex items-start gap-3 text-sm text-[var(--app-text-secondary)]">
              <input type="checkbox" checked={overdueRemindersEnabled} onChange={(e) => setOverdueRemindersEnabled(e.target.checked)} disabled={!taskRemindersEnabled} className="mt-0.5" />
              <span><strong className="text-[var(--app-text)]">Overdue reminders</strong></span>
            </label>
          </div>

          <div className="space-y-4 pt-4 border-t border-[var(--app-border)]">
            <div><h2 className="font-bold text-sm text-[var(--app-text)]">Daily schedule</h2><p className="text-sm text-[var(--app-text-muted)] mt-1">Used for schedule suggestions. Does not change priority.</p></div>
            <label className="block space-y-1.5">
              <span className="label" htmlFor="daily-available-minutes">Available minutes per day</span>
              <input id="daily-available-minutes" type="number" min="1" max="720" value={dailyAvailableMinutes} onChange={(e) => setDailyAvailableMinutes(e.target.value)} className="input" placeholder="e.g. 240" />
              <span className="text-sm text-[var(--app-text-muted)]">Leave blank to skip.</span>
            </label>
            <label className="block space-y-1.5">
              <span className="label" htmlFor="workday-start-time">Start time</span>
              <input id="workday-start-time" type="time" value={workdayStartTime} onChange={(e) => setWorkdayStartTime(e.target.value)} className="input" />
            </label>
          </div>

          {/* Advisory Notice */}
          <div className="p-3.5 rounded-xl bg-blue-500/[0.04] border border-[#2563EB]/20 flex items-start gap-2.5 text-sm text-[var(--app-text-secondary)]">
            <FiInfo size={15} className="text-[#2563EB] shrink-0 mt-0.5" />
            <span>
              Weather is advisory only and does not change task priority.
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary w-full shadow-sm text-sm"
            >
              <FiSave size={16} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
