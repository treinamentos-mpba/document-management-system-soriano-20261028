import { useState } from 'react';

export default function LoginForm({ onLogin }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await onLogin(userId, password);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '32rem' }}>
      <h1>Document Management System</h1>
      <section>
        <h2>Entrar</h2>
        <form onSubmit={handleSubmit}>
          <p>
            <label>
              Usuário
              <input
                autoComplete="username"
                required
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
              />
            </label>
          </p>
          <p>
            <label>
              Senha
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </p>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}
      </section>
    </main>
  );
}
