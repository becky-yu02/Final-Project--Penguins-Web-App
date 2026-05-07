import { Link, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BroadcastModal from './BroadcastModal';
import BroadcastIcon from '../assets/broadcast.svg?react';
import NotifIcon from '../assets/notif.svg?react';

const API = 'http://127.0.0.1:8000';

export default function Navbar() {
  const { token, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastingTitle, setBroadcastingTitle] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [initials, setInitials] = useState('');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [noPreferences, setNoPreferences] = useState(false);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/penguins/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.status === 401) { logout(); return null; }
        return r.json();
      })
      .then(user => {
        if (!user) return;
        setIsOnline(user.online_status?.is_online ?? false);
        const isBroadcasting = user.online_status?.broadcasting ?? false;
        setBroadcasting(isBroadcasting);
        setIsAdmin(user.role === 'admin');
        setProfileImageUrl(user.profile_image_url ?? null);
        setInitials(((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')).toUpperCase());
        const p = user.preferences;
        setNoPreferences(!p ||
          (!p.max_distance_miles && !p.wifi_required && !p.outlets_required &&
           !p.parking_required && (!p.preferred_types || p.preferred_types.length === 0)));
        fetch(`${API}/penguins/friendships/pending`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : [])
          .then(reqs => setHasPendingRequests(Array.isArray(reqs) && reqs.length > 0))
          .catch(() => {});
        const gatheringId = user.online_status?.current_gathering_id;
        if (isBroadcasting && gatheringId) {
          fetch(`${API}/penguins/gatherings/${gatheringId}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(g => { if (g) setBroadcastingTitle(g.title); })
            .catch(() => {});
        }
      })
      .catch(() => { });
  }, [token]);

  async function toggle(field, value) {
    const update = { online_status: { is_online: isOnline, broadcasting, [field]: value } };
    const res = await fetch(`${API}/penguins/users/me`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    if (!res.ok) return;
    if (field === 'is_online') setIsOnline(value);
    if (field === 'broadcasting') setBroadcasting(value);
  }

  function handleBroadcastToggle(checked) {
    if (checked) {
      setShowBroadcastModal(true);
    } else {
      const update = { online_status: { is_online: isOnline, broadcasting: false, current_gathering_id: null } };
      fetch(`${API}/penguins/users/me`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      }).then(r => {
        if (r.ok) {
          setBroadcasting(false);
          setBroadcastingTitle('');
          window.dispatchEvent(new CustomEvent('gathering-created'));
        }
      });
    }
  }

  async function handleBroadcastConfirm(gatheringId, gatheringTitle) {
    const update = { online_status: { is_online: isOnline, broadcasting: true, current_gathering_id: gatheringId } };
    const res = await fetch(`${API}/penguins/users/me`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    if (res.ok) {
      setBroadcasting(true);
      setBroadcastingTitle(gatheringTitle ?? '');
      setShowBroadcastModal(false);
    }
  }

  return (
    <>
      {showBroadcastModal && (
        <BroadcastModal
          onConfirm={handleBroadcastConfirm}
          onClose={() => setShowBroadcastModal(false)}
        />
      )}
      <nav className="navbar navbar-expand navbar-dark bg-dark">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/home">Penguins</Link>
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/home">
                Home
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => 'nav-link d-flex align-items-center gap-1' + (isActive ? ' active' : '')} to="/discovery">
                Discovery
                {noPreferences && <NotifIcon width={12} height={12} style={{ color: '#dc3545', flexShrink: 0 }} />}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/gatherings">
                Gatherings
              </NavLink>
            </li>
            {isAdmin && (
              <li className="nav-item">
                <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/admin">
                  Admin
                </NavLink>
              </li>
            )}
          </ul>
          <ul className="navbar-nav align-items-center gap-3">
            <li className="nav-item d-flex align-items-center gap-2">
              <span className={`badge ${isOnline ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.7rem' }}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="nav-online"
                  checked={isOnline}
                  onChange={e => toggle('is_online', e.target.checked)}
                />
                <label className="form-check-label text-white small" htmlFor="nav-online">Online</label>
              </div>
            </li>
            <li className="nav-item d-flex align-items-center gap-2">
              <BroadcastIcon width={16} height={16} style={{ color: '#23a55a', flexShrink: 0, visibility: broadcasting ? 'visible' : 'hidden' }} />
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="nav-broadcasting"
                  checked={broadcasting}
                  onChange={e => handleBroadcastToggle(e.target.checked)}
                />
                <label
                  className="form-check-label text-white small"
                  htmlFor="nav-broadcasting"
                  style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {broadcasting && broadcastingTitle ? `Broadcasting @ ${broadcastingTitle}` : 'Broadcast'}
                </label>
              </div>
            </li>
            <li className="nav-item">
              <NavLink
                className={({ isActive }) => 'nav-link d-flex align-items-center gap-2' + (isActive ? ' active' : '')}
                to="/profile"
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  overflow: 'hidden', border: '2px solid rgba(255,255,255,0.4)',
                  background: profileImageUrl || initials ? undefined : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : initials ? (
                    <div style={{
                      width: '100%', height: '100%', background: '#6c757d',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 600, color: '#fff',
                    }}>
                      {initials}
                    </div>
                  ) : null}
                </div>
                Profile & Friends
                {hasPendingRequests && <NotifIcon width={12} height={12} style={{ color: '#dc3545', flexShrink: 0 }} />}
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
