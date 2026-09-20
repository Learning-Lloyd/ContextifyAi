import { useState } from 'react';
import { FiInfo, FiMail, FiMapPin, FiSave, FiShield, FiUser } from 'react-icons/fi';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await authService.updateProfile({
        name: name.trim(),
        city: cityData.location || null,
        city_latitude: cityData.latitude,
        city_longitude: cityData.longitude,
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
          <h1 className="page-title">Profile & Preferences</h1>
          <p className="page-subtitle text-xs sm:text-sm">
            Manage your personal identity, default environmental location, and account details
          </p>
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
                <FiMapPin size={12} className="text-[#2563EB]" /> Home City: {user.city}
              </p>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-5 shadow-sm">
          <div className="space-y-1.5">
            <label className="label" htmlFor="profile-name">
              Full Name
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
              <label className="label">Primary Geographic Location</label>
              <p className="text-xs text-[var(--app-text-muted)] mb-2">
                Your home city is retrieved for dashboard weather conditions and environmental context.
              </p>
            </div>
            <LocationSearch value={cityData} onChange={setCityData} />
          </div>

          {/* Advisory Notice */}
          <div className="p-3.5 rounded-xl bg-blue-500/[0.04] border border-[#2563EB]/20 flex items-start gap-2.5 text-xs text-[var(--app-text-secondary)]">
            <FiInfo size={15} className="text-[#2563EB] shrink-0 mt-0.5" />
            <span>
              Weather context provides external environmental awareness for scheduling decisions. Weather data does not modify deterministic task priority scores.
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary w-full shadow-sm text-sm"
            >
              <FiSave size={16} />
              {saving ? 'Saving Profile Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
