import { useState } from 'react';
import Navbar from '../components/Navbar';
import mockUsers from '../mock/users.json';

const PLACE_TYPES = ['academic', 'cafe', 'library', 'student union', 'restaurant', 'park', 'other'];

export default function Settings() {
  const currentUser = mockUsers[0];

  const [account, setAccount] = useState({
    first_name: currentUser.first_name,
    last_name: currentUser.last_name,
    profile_image_url: currentUser.profile_image_url || '',
  });

  const [preferences, setPreferences] = useState({
    wifi_required: false,
    outlets_required: false,
    parking_required: false,
    max_distance_miles: '',
    preferred_types: [],
  });

  const [status, setStatus] = useState({
    is_online: currentUser.online_status?.is_online ?? false,
    broadcasting: currentUser.online_status?.broadcasting ?? false,
  });

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
                min="0"
                step="0.5"
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

        <button type="button" className="btn btn-primary w-100">
          Save Changes
        </button>
      </div>
    </>
  );
}
