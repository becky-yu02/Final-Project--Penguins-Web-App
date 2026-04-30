import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const API = 'http://127.0.0.1:8000';
const PLACE_TYPES = ['academic', 'cafe', 'library', 'student union', 'restaurant', 'park', 'other'];

export default function Settings() {
  const { token } = useAuth();

  const [account, setAccount] = useState({ first_name: '', last_name: '', profile_image_url: '' });
  const [preferences, setPreferences] = useState({
    wifi_required: false, outlets_required: false, parking_required: false,
    max_distance_miles: '', preferred_types: [],
  });
  const [status, setStatus] = useState({ is_online: false, broadcasting: false });
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/penguins/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(user => {
        setAccount({
          first_name: user.first_name ?? '',
          last_name: user.last_name ?? '',
          profile_image_url: user.profile_image_url ?? '',
        });
        if (user.preferences) {
          setPreferences({
            wifi_required: user.preferences.wifi_required ?? false,
            outlets_required: user.preferences.outlets_required ?? false,
            parking_required: user.preferences.parking_required ?? false,
            max_distance_miles: user.preferences.max_distance_miles ?? '',
            preferred_types: user.preferences.preferred_types ?? [],
          });
        }
        if (user.online_status) {
          setStatus({
            is_online: user.online_status.is_online ?? false,
            broadcasting: user.online_status.broadcasting ?? false,
          });
        }
      })
      .catch(() => {});
  }, [token]);

  async function handleSave() {
    setSaveStatus('saving');
    const body = {
      ...account,
      profile_image_url: account.profile_image_url || null,
      preferences: {
        ...preferences,
        max_distance_miles: preferences.max_distance_miles ? parseFloat(preferences.max_distance_miles) : null,
      },
      online_status: status,
    };
    const res = await fetch(`${API}/penguins/users/me`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaveStatus(res.ok ? 'saved' : 'error');
    setTimeout(() => setSaveStatus(''), 3000);
  }

  const toggleType = (type) => {
    setPreferences(prev => ({
      ...prev,
      preferred_types: prev.preferred_types.includes(type)
        ? prev.preferred_types.filter(t => t !== type)
        : [...prev.preferred_types, type],
    }));
  };

  return (
    <>
      <Navbar />
      <div className="container py-4" style={{ maxWidth: 640 }}>
        <h2 className="mb-4">Settings</h2>

        {/* Account */}
        <div className="card mb-4">
          <div className="card-header">Account</div>
          <div className="card-body">
            <div className="row mb-3">
              <div className="col">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={account.first_name}
                  onChange={e => setAccount({ ...account, first_name: e.target.value })}
                />
              </div>
              <div className="col">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={account.last_name}
                  onChange={e => setAccount({ ...account, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="mb-0">
              <label className="form-label">Profile Image URL</label>
              <input
                type="url"
                className="form-control"
                placeholder="https://..."
                value={account.profile_image_url}
                onChange={e => setAccount({ ...account, profile_image_url: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="card mb-4">
          <div className="card-header">Preferences</div>
          <div className="card-body">
            <div className="mb-3">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="wifi_required"
                  checked={preferences.wifi_required}
                  onChange={e => setPreferences({ ...preferences, wifi_required: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="wifi_required">Wifi required</label>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="outlets_required"
                  checked={preferences.outlets_required}
                  onChange={e => setPreferences({ ...preferences, outlets_required: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="outlets_required">Outlets required</label>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="parking_required"
                  checked={preferences.parking_required}
                  onChange={e => setPreferences({ ...preferences, parking_required: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="parking_required">Parking required</label>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Max Distance (miles)</label>
              <input
                type="number"
                className="form-control"
                min="5"
                step="1"
                value={preferences.max_distance_miles}
                onChange={e => setPreferences({ ...preferences, max_distance_miles: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Preferred Place Types</label>
              <div className="d-flex gap-2 flex-wrap">
                {PLACE_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`btn btn-sm text-capitalize ${preferences.preferred_types.includes(type) ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => toggleType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="card mb-4">
          <div className="card-header">Status</div>
          <div className="card-body">
            <div className="form-check form-switch mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="is_online"
                role="switch"
                checked={status.is_online}
                onChange={e => setStatus({ ...status, is_online: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="is_online">Online</label>
            </div>
            <div className="form-check form-switch">
              <input
                type="checkbox"
                className="form-check-input"
                id="broadcasting"
                role="switch"
                checked={status.broadcasting}
                onChange={e => setStatus({ ...status, broadcasting: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="broadcasting">Broadcasting location</label>
            </div>
          </div>
        </div>

        {saveStatus === 'saved' && <div className="alert alert-success py-2 mb-3">Changes saved.</div>}
        {saveStatus === 'error' && <div className="alert alert-danger py-2 mb-3">Failed to save. Please try again.</div>}

        <button type="button" className="btn btn-primary w-100" onClick={handleSave} disabled={saveStatus === 'saving'}>
          {saveStatus === 'saving' ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </>
  );
}
