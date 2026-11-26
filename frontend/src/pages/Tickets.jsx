import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { StatusBadge, PriorityTag } from '../components/Badges';
import Pagination from '../components/Pagination';
import { CATEGORIES, PRIORITIES, STATUSES, fmtDate, label } from '../format';

export default function Tickets() {
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [searchText, setSearchText] = useState(params.get('search') || '');
  const [res, setRes] = useState({ data: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const q = Object.fromEntries(params.entries());
  const setFilter = (k, v) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next);
  };

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => searchText !== (params.get('search') || '') && setFilter('search', searchText.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get('/tickets', { params: { ...q, limit: 8 } })
      .then((r) => setRes({ data: r.data.data, pagination: r.data.pagination }))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const Select = ({ k, options, all }) => (
    <select value={q[k] || ''} onChange={(e) => setFilter(k, e.target.value)} aria-label={all}>
      <option value="">{all}</option>
      {options.map((o) => <option key={o} value={o}>{label(o)}</option>)}
    </select>
  );

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{isAdmin ? 'All tickets' : 'My tickets'}</h1>
          <p className="muted">{res.pagination ? `${res.pagination.total} found` : ' '}</p>
        </div>
        {!isAdmin && <Link className="btn primary" to="/tickets/new">New ticket</Link>}
      </header>

      <div className="filters">
        <input type="search" placeholder="Search title or description" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        <Select k="status" options={STATUSES} all="Any status" />
        <Select k="priority" options={PRIORITIES} all="Any priority" />
        <Select k="category" options={CATEGORIES} all="Any category" />
        <select value={q.sort || 'newest'} onChange={(e) => setFilter('sort', e.target.value)} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="updated">Recently updated</option>
        </select>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !error && res.data.length === 0 && (
        <div className="empty">
          <p>No tickets match these filters.</p>
          {!isAdmin && <Link className="btn primary" to="/tickets/new">Raise your first ticket</Link>}
        </div>
      )}

      <ul className="tickets">
        {res.data.map((t) => (
          <li key={t._id} className={`ticket rail-${t.priority}`}>
            <Link to={`/tickets/${t._id}`}>
              <div className="t-main">
                <strong>{t.title}</strong>
                <small>
                  {label(t.category)} · {isAdmin && `${t.createdBy?.name} · `}{fmtDate(t.createdAt)}
                </small>
              </div>
              <PriorityTag priority={t.priority} />
              <StatusBadge status={t.status} />
            </Link>
          </li>
        ))}
      </ul>

      <Pagination pagination={res.pagination} onChange={(p) => setFilter('page', String(p))} />
    </>
  );
}
