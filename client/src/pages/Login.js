import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';

export default function Login(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [err,setErr]=useState(null);
  const nav = useNavigate();

  const submit = async e => {
    e.preventDefault();
    setErr(null);
    try{
      const res = await API.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      nav('/chat');
    }catch(err){
      setErr(err.response?.data?.message || 'Login failed');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-left">
          <div className="brand">Chatting App</div>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to continue to your conversations.</p>
          <form onSubmit={submit} className="auth-form">
            <div className="field">
              <label>Email address</label>
              <input placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input placeholder="Your password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
              <label className="muted"><input type="checkbox"/> Remember me</label>
              <Link to="/signup" className="muted">Create account</Link>
            </div>
            <button className="primary" type="submit">Sign in</button>
            {err && <div className="error">{err}</div>}
          </form>
        </div>
        <div className="auth-right">
          <div className="illustration">💬</div>
          <p className="muted">Fast, private messaging for teams and friends.</p>
        </div>
      </div>
    </div>
  );
}
