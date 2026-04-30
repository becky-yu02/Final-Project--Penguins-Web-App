import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = 'http://127.0.0.1:8000';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    first_name: '', last_name: '', username: '', email: '', password: '',
  });
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    const body = new URLSearchParams(loginForm);
    const res = await fetch(`${API}/penguins/auth/login`, { method: 'POST', body });
    if (!res.ok) { setError('Invalid username or password.'); return; }
    const data = await res.json();
    login(data.access_token);
    navigate('/home');
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API}/penguins/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerForm),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail ?? 'Registration failed.');
      return;
    }
    setTab('login');
    setError('Account created — please log in.');
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm" style={{ width: 420 }}>
        <div className="card-body p-4">
          <h2 className="text-center mb-4">Penguins</h2>

          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button
                className={`nav-link ${tab === 'login' ? 'active' : ''}`}
                onClick={() => setTab('login')}
              >
                Login
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${tab === 'register' ? 'active' : ''}`}
                onClick={() => setTab('register')}
              >
                Register
              </button>
            </li>
          </ul>

          {error && (
            <div className={`alert ${error.startsWith('Account') ? 'alert-success' : 'alert-danger'} py-2`}>
              {error}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={loginForm.username}
                  onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary w-100">Login</button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="row mb-3">
                <div className="col">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={registerForm.first_name}
                    onChange={e => setRegisterForm({ ...registerForm, first_name: e.target.value })}
                  />
                </div>
                <div className="col">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={registerForm.last_name}
                    onChange={e => setRegisterForm({ ...registerForm, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={registerForm.username}
                  onChange={e => setRegisterForm({ ...registerForm, username: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={registerForm.email}
                  onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={registerForm.password}
                  onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary w-100">Register</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
