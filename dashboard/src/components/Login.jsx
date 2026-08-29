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
            <div className="login-box">
                <div className="login-header">
                    <h2>Welcome to Dashboard</h2>
                    <p>Enter your credentials to securely access your tasks.</p>
                </div>
                {error && <div className="login-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <input 
                        type="email" 
                        placeholder="Work Email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        className="input-field"
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="input-field"
                    />
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Authenticating...' : 'Sign in to Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
