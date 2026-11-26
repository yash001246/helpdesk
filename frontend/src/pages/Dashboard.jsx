import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { STATUSES, label } from '../format';

function Bars({ title, data }) {
  const max = Math.max(1, ...Object.values(data));
  return (
    <section className="panel">
      <h2>{title}</h2>
      {Object.entries(data).map(([k, v]) => (
        <div className="bar-row" key={k}>
          <span>{label(k)}</span>
          <div className="bar"><i style={{ width: `${(v / max) * 100}%` }} /></div>
          <b>{v}</b>
        </div>
      ))}
    </section>
  );
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/tickets/stats/summary').then((r) => setS(r.data.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <div className="alert">{error}</div>;
  if (!s) return <p className="muted">Loading…</p>;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{isAdmin ? 'Support overview' : `Hello, ${user.name.split(' ')[0]}`}</h1>
          <p className="muted">{isAdmin ? 'All tickets across the helpdesk.' : 'A summary of the tickets you have raised.'}</p>
        </div>
        {!isAdmin && <Link className="btn primary" to="/tickets/new">New ticket</Link>}
      </header>

      <div className="tiles">
        <Link to="/tickets" className="tile"><b>{s.total}</b><span>Total tickets</span></Link>
        {STATUSES.map((st) => (
          <Link key={st} to={`/tickets?status=${st}`} className={`tile t-${st}`}><b>{s.byStatus[st]}</b><span>{label(st)}</span></Link>
        ))}
        <div className="tile"><b>{s.createdLast7Days}</b><span>Created in last 7 days</span></div>
        <div className="tile"><b>{s.avgResolutionHours ?? '–'}</b><span>Avg. hours to resolve</span></div>
      </div>

      <div className="grid-2">
        <Bars title="By priority" data={s.byPriority} />
        <Bars title="By category" data={s.byCategory} />
      </div>
    </>
  );
}
