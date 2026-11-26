import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import Pagination from '../components/Pagination';
import { fmtDate } from '../format';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [res, setRes] = useState({ data: [], pagination: null });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/admin/users', { params: { page, limit: 10, search: search || undefined } })
      .then((r) => setRes({ data: r.data.data, pagination: r.data.pagination }))
      .catch((e) => setError(errMsg(e)));
  }, [page, search]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const setRole = async (id, role) => {
    setError('');
    try { await api.patch(`/admin/users/${id}/role`, { role }); load(); } catch (e) { setError(errMsg(e)); }
  };

  return (
    <>
      <header className="page-head"><div><h1>Users</h1><p className="muted">Promote a user to administrator or return them to a regular account.</p></div></header>
      <div className="filters"><input type="search" placeholder="Search name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
      {error && <div className="alert">{error}</div>}
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Role</th></tr></thead>
          <tbody>
            {res.data.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td><td>{u.email}</td><td>{fmtDate(u.createdAt)}</td>
                <td>
                  <select value={u.role} disabled={u._id === me._id} onChange={(e) => setRole(u._id, e.target.value)} aria-label={`Role for ${u.name}`}>
                    <option value="user">User</option><option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination pagination={res.pagination} onChange={setPage} />
    </>
  );
}
