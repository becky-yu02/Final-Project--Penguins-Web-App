import { Link, NavLink } from 'react-router-dom';

export default function Navbar() {
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
        <ul className="navbar-nav">
          <li className="nav-item">
            <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/profile">
              Profile
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} to="/settings">
              Settings
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}
