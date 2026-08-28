import React, { useState } from 'react';
import { loginAuth } from '../api/tasksApi';

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await loginAuth(email, password);
            if (data.success) {
                localStorage.setItem('token', data.token);
                onLogin();
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Network error connecting to Backend securely.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px'}}>
            <div className="card" style={{width: '350px', padding: '2rem'}}>
                <h2 style={{marginTop: 0, marginBottom: '20px'}}>Dashboard Secure Login</h2>
                {error && <div className="error-banner" style={{marginBottom: '15px'}}>{error}</div>}
                
                <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                    <input 
                        type="email" 
                        placeholder="Admin Email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        style={{padding: '10px', borderRadius: '4px', border: '1px solid #333', background: '#1c1c1c', color: '#fff'}}
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{padding: '10px', borderRadius: '4px', border: '1px solid #333', background: '#1c1c1c', color: '#fff'}}
                    />
                    <button type="submit" disabled={loading} style={{padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
