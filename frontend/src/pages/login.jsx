import { useState } from 'react';

export default function Login() {
  const [tab, setTab] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    first_name: '', last_name: '', username: '', email: '', password: '',
  });

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

          {tab === 'login' ? (
            <form onSubmit={e => e.preventDefault()}>
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
            <form onSubmit={e => e.preventDefault()}>
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
