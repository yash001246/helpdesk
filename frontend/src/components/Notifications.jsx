import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { fmtDate } from '../format';

// Bell with unread count. Polls every 30s – simple and good enough without websockets.
export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const nav = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications', { params: { limit: 15 } });
      setItems(data.data);
      setUnread(data.unreadCount);
    } catch { /* ignore transient errors */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openItem = async (n) => {
    if (!n.read) await api.patch(`/notifications/${n._id}/read`).catch(() => {});
    setOpen(false);
    load();
    nav(`/tickets/${n.ticket}`);
  };
  const readAll = async () => {
    await api.patch('/notifications/read-all');
    load();
  };

  return (
    <div className="notif" ref={box}>
      <button className="btn side-btn" onClick={() => { setOpen(!open); load(); }} aria-label="Notifications">
        Notifications{unread > 0 && <span className="count">{unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>Notifications</strong>
            {unread > 0 && <button className="link" onClick={readAll}>Mark all as read</button>}
          </div>
          {items.length === 0 && <p className="muted pad">You're all caught up.</p>}
          {items.map((n) => (
            <button key={n._id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => openItem(n)}>
              <span>{n.message}</span>
              <small>{fmtDate(n.createdAt)}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
