import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { errMsg } from '../api';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(f.name, f.email, f.password);
      nav('/');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="auth-card form" onSubmit={submit}>
        <h1>Create your account</h1>
        <p className="muted">Use at least 8 characters with a letter and a number.</p>
        {error && <div className="alert">{error}</div>}
        <label>Full name<input value={f.name} onChange={set('name')} required minLength={2} autoComplete="name" /></label>
        <label>Email<input type="email" value={f.email} onChange={set('email')} required autoComplete="email" /></label>
        <label>Password<input type="password" value={f.password} onChange={set('password')} required minLength={8} autoComplete="new-password" /></label>
        <button className="btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="muted">Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
