import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import Pagination from '../components/Pagination';
import { fmtDate } from '../format';

const EVENTS = ['ticket.created', 'ticket.updated', 'ticket.status_changed', 'ticket.comment_added', 'ticket.resolved', 'ticket.deleted'];

export default function AdminActivity() {
  const [res, setRes] = useState({ data: [], pagination: null });
  const [page, setPage] = useState(1);
  const [event, setEvent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/activity', { params: { page, limit: 15, event: event || undefined } })
      .then((r) => setRes({ data: r.data.data, pagination: r.data.pagination }))
      .catch((e) => setError(errMsg(e)));
  }, [page, event]);

  return (
    <>
      <header className="page-head"><div><h1>Activity log</h1><p className="muted">Every ticket event, newest first.</p></div></header>
      <div className="filters">
        <select value={event} onChange={(e) => { setEvent(e.target.value); setPage(1); }} aria-label="Event type">
          <option value="">All events</option>
          {EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      {error && <div className="alert">{error}</div>}
      <ul className="panel timeline wide">
        {res.data.map((a) => (
          <li key={a._id}>
            <span>
              {a.message} on{' '}
              {a.event === 'ticket.deleted' ? <em>{a.ticketTitle}</em> : <Link to={`/tickets/${a.ticket}`}>{a.ticketTitle}</Link>}
            </span>
            <small>{a.event} · {fmtDate(a.createdAt)}</small>
          </li>
        ))}
        {res.data.length === 0 && <li className="muted">No activity yet.</li>}
      </ul>
      <Pagination pagination={res.pagination} onChange={setPage} />
    </>
  );
}
