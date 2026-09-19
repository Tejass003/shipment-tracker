import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { pathname } = useLocation();
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">📦 Shipment Tracker</Link>
        <Link
          to="/"
          className="navbar-link"
          style={{ color: pathname === '/' ? 'var(--color-primary)' : undefined }}
        >
          Dashboard
        </Link>
        <Link
          to="/create"
          className="navbar-link"
          style={{ color: pathname === '/create' ? 'var(--color-primary)' : undefined }}
        >
          New Shipment
        </Link>
      </div>
    </nav>
  );
}
