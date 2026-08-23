import { useState } from 'react';
import { FiMapPin, FiSave } from 'react-icons/fi';
import Layout from '../components/Layout';
import LocationSearch from '../components/LocationSearch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { authService } from '../services/authService';

export default function Profile() {
  const { user, updateProfile } = useAuth();
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
      <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title">Profile Settings</h1>
          <p className="page-subtitle">
            Save your city for dashboard weather and contextual AI explanations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          <div>
            <label className="label" htmlFor="profile-name">Display Name</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <p className="text-sm text-[var(--app-text-secondary)] mb-3">
              Your saved city is used for weather on the dashboard and in AI explanations.
              Weather does not affect priority scores.
            </p>
            <LocationSearch
              value={cityData}
              onChange={setCityData}
            />
          </div>

          {user?.city && (
            <div className="flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
              <FiMapPin className="text-[#2563EB]" size={14} />
              Current saved city: {user.city}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn btn-primary w-full">
            <FiSave size={16} />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
