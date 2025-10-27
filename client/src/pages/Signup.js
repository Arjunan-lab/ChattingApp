import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';

export default function Signup(){
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [err,setErr]=useState(null);
  const nav = useNavigate();

  const submit = async e => {
    e.preventDefault();
    setErr(null);
    try{
      const res = await API.post('/api/auth/signup', { name, email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      nav('/chat');
    }catch(err){
      setErr(err.response?.data?.message || 'Signup failed');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-left">
          <div className="brand">Chatting App</div>
          <h2>Create your account</h2>
          <p style={{color:'var(--muted)'}}>Join the conversation — simple, private, and fast.</p>
          <form onSubmit={submit} className="auth-form">
            <div className="field">
              <label>Full name</label>
              <input placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} />
            </div>
            <div className="field">
              <label>Email address</label>
              <input placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input placeholder="Choose a password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            <button type="submit" className="primary">Create account</button>
            {err && <div className="error">{err}</div>}
          </form>
        </div>
        <div className="auth-right">
          <div className="illustration">👋</div>
          <div style={{textAlign:'center'}}>Already have an account?</div>
          <Link to="/login" style={{marginTop:12,color:'#fff',textDecoration:'underline'}}>Log in</Link>
        </div>
      </div>
    </div>
  );
}
