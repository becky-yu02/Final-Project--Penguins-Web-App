import { Link, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API = 'http://127.0.0.1:8000';

export default function Navbar() {
  const { token, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

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
        setBroadcasting(user.online_status?.broadcasting ?? false);
      })
      .catch(() => {});
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

  return (
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
            <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/discovery">
              Discovery
            </NavLink>
          </li>
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
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="nav-broadcasting"
                checked={broadcasting}
                onChange={e => toggle('broadcasting', e.target.checked)}
              />
              <label className="form-check-label text-white small" htmlFor="nav-broadcasting">Broadcasting</label>
            </div>
          </li>
          <li className="nav-item">
            <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/profile">
              Profile
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}
