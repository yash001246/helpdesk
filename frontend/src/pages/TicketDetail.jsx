import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { StatusBadge, PriorityTag } from '../components/Badges';
import { PRIORITIES, STATUSES, fmtDate, label } from '../format';

export default function TicketDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, c, a] = await Promise.all([
        api.get(`/tickets/${id}`),
        api.get(`/tickets/${id}/comments`),
        api.get(`/tickets/${id}/activity`),
      ]);
      setTicket(t.data.data);
      setComments(c.data.data);
      setActivity(a.data.data);
    } catch (e) {
      setError(errMsg(e));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try { await fn(); await load(); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const triage = (field, value) => run(() => api.patch(`/tickets/${id}`, { [field]: value }));
  const postComment = (e) => {
    e.preventDefault();
    run(async () => { await api.post(`/tickets/${id}/comments`, { message }); setMessage(''); });
  };
  const remove = async () => {
    if (!window.confirm('Delete this ticket and all its comments? This cannot be undone.')) return;
    setBusy(true);
    try { await api.delete(`/tickets/${id}`); nav('/tickets'); } catch (e) { setError(errMsg(e)); setBusy(false); }
  };

  if (error && !ticket) return <div className="alert">{error}</div>;
  if (!ticket) return <p className="muted">Loading…</p>;

  const isOwner = ticket.createdBy?._id === user._id;
  const ownerCanChange = isOwner && ticket.status === 'open';
  const closed = ticket.status === 'closed';

  return (
    <>
      <p className="crumb"><Link to="/tickets">← {isAdmin ? 'All tickets' : 'My tickets'}</Link></p>
      {error && <div className="alert">{error}</div>}

      <div className="detail">
        <div>
          <section className={`panel rail-${ticket.priority} head-panel`}>
            <div className="badges"><StatusBadge status={ticket.status} /><PriorityTag priority={ticket.priority} /></div>
            <h1>{ticket.title}</h1>
            <p className="muted">
              {label(ticket.category)} · Raised by {ticket.createdBy?.name} on {fmtDate(ticket.createdAt)}
            </p>
            <p className="desc">{ticket.description}</p>
            {ownerCanChange && (
              <div className="actions">
                <Link className="btn" to={`/tickets/${id}/edit`}>Edit ticket</Link>
                <button className="btn danger" onClick={remove} disabled={busy}>Delete</button>
              </div>
            )}
            {isOwner && !ownerCanChange && !isAdmin && (
              <p className="muted small">This ticket is being handled, so it can no longer be edited. Add a comment to share updates.</p>
            )}
          </section>

          <section className="panel">
            <h2>Comments ({comments.length})</h2>
            {comments.length === 0 && <p className="muted">No comments yet.</p>}
            <ul className="comments">
              {comments.map((c) => (
                <li key={c._id} className={c.authorRole === 'admin' ? 'by-admin' : ''}>
                  <div className="c-head">
                    <strong>{c.author?.name}</strong>
                    {c.authorRole === 'admin' && <span className="chip">Support team</span>}
                    <small>{fmtDate(c.createdAt)}</small>
                  </div>
                  <p>{c.message}</p>
                </li>
              ))}
            </ul>
            {closed ? (
              <p className="muted">This ticket is closed and no longer accepts comments.</p>
            ) : (
              <form className="form" onSubmit={postComment}>
                <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={2000}
                  placeholder={isAdmin ? 'Reply to the user' : 'Add a comment'} aria-label="Comment" />
                <div className="actions"><button className="btn primary" disabled={busy || !message.trim()}>{isAdmin ? 'Send reply' : 'Add comment'}</button></div>
              </form>
            )}
          </section>
        </div>

        <aside>
          {isAdmin && (
            <section className="panel">
              <h2>Manage ticket</h2>
              <div className="form">
                <label>Status
                  <select value={ticket.status} disabled={busy} onChange={(e) => triage('status', e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                  </select>
                </label>
                <label>Priority
                  <select value={ticket.priority} disabled={busy} onChange={(e) => triage('priority', e.target.value)}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{label(p)}</option>)}
                  </select>
                </label>
                <button className="btn danger" onClick={remove} disabled={busy}>Delete ticket</button>
              </div>
            </section>
          )}
          <section className="panel">
            <h2>Activity</h2>
            <ul className="timeline">
              {activity.map((a) => (
                <li key={a._id}><span>{a.message}</span><small>{fmtDate(a.createdAt)}</small></li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
