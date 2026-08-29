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
        <div className="login-wrapper">
            <div className="login-hero">
                <h1>WhatsAppTaskManager</h1>
                <p>Your tasks, organized simply.</p>
            </div>
            <div className="login-box">
                <div className="login-header">
                    <h2>Welcome back</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <label className="login-label">Email / Username</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        className="input-field"
                    />
                    <label className="login-label">Password</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="input-field"
                    />
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Authenticating...' : 'Sign in'}
                    </button>
                </form>
                {error && <div className="login-error-toast">{error}</div>}
            </div>
        </div>
    );
};

export default Login;
