import { useState } from 'react';
import { CATEGORIES, PRIORITIES, label } from '../format';

export default function TicketForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [f, setF] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    category: initial?.category || 'general',
    priority: initial?.priority || 'medium',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await onSubmit(f); } finally { setBusy(false); }
  };

  return (
    <form className="form" onSubmit={submit}>
      <label>Title
        <input value={f.title} onChange={set('title')} required minLength={3} maxLength={120} placeholder="Short summary of the problem" />
      </label>
      <label>Description
        <textarea rows={7} value={f.description} onChange={set('description')} required minLength={10} maxLength={5000}
          placeholder="What happened, what you expected, and any steps to reproduce it" />
      </label>
      <div className="row">
        <label>Category
          <select value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}</select>
        </label>
        <label>Priority
          <select value={f.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p} value={p}>{label(p)}</option>)}</select>
        </label>
      </div>
      <div className="actions">
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
