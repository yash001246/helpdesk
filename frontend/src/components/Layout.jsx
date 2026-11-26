import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Notifications from './Notifications';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Helpdesk</div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/tickets" end>{isAdmin ? 'All tickets' : 'My tickets'}</NavLink>
          {!isAdmin && <NavLink to="/tickets/new">New ticket</NavLink>}
          {isAdmin && <NavLink to="/admin/users">Users</NavLink>}
          {isAdmin && <NavLink to="/admin/activity">Activity log</NavLink>}
        </nav>
        <div className="side-foot">
          <Notifications />
          <div className="me">
            <strong>{user.name}</strong>
            <small>{user.role === 'admin' ? 'Administrator' : user.email}</small>
          </div>
          <button className="btn side-btn" onClick={() => { logout(); nav('/login'); }}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
