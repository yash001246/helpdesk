import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import TicketForm from '../components/TicketForm';

export default function TicketFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) api.get(`/tickets/${id}`).then((r) => setTicket(r.data.data)).catch((e) => setError(errMsg(e)));
  }, [id]);

  const submit = async (body) => {
    setError('');
    try {
      const res = id ? await api.patch(`/tickets/${id}`, body) : await api.post('/tickets', body);
      nav(`/tickets/${res.data.data._id}`);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (id && !ticket && !error) return <p className="muted">Loading…</p>;

  return (
    <>
      <header className="page-head"><h1>{id ? 'Edit ticket' : 'New ticket'}</h1></header>
      {error && <div className="alert">{error}</div>}
      {(!id || ticket) && (
        <div className="panel narrow">
          <TicketForm initial={ticket} submitLabel={id ? 'Save changes' : 'Submit ticket'} onSubmit={submit} onCancel={() => nav(-1)} />
        </div>
      )}
    </>
  );
}
