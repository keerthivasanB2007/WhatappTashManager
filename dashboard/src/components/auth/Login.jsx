import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill out all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <div style={{textAlign: 'center', marginBottom: '24px'}}>
          <div style={{display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 600}}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
             WhatsAppTaskManager
          </div>
          <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px'}}>Sign in to your workspace</p>
        </div>
        
        {error && (
          <div style={{background: 'var(--status-overdue-bg)', color: 'var(--status-overdue)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid currentColor'}}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <div>
            <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px'}}>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@domain.com"
              style={{width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem', outline: 'none'}}
              disabled={loading}
              autoComplete="username"
            />
          </div>
          
          <div>
            <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px'}}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem', outline: 'none'}}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%', padding: '10px', marginTop: '8px',
              background: 'var(--text-primary)', color: 'var(--surface)',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
