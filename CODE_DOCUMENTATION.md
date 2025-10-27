# MERN Chat App — Detailed Code Documentation

This document explains the project structure and important code in detail. It is intended to help new contributors understand where key logic lives, how data flows, and how to run and test the app.

Table of contents
- Project layout
- Backend (server)
  - Entry point
  - Models (User, Message)
  - Routes and controllers
  - Middleware (auth)
  - File uploads
  - Socket interactions
- Frontend (client)
  - App structure and routing
  - API wrapper
  - Key pages and components
  - Styling and theming
- Data models and JSON examples
- Running the project locally
- Common workflows and debugging tips

---

PROJECT LAYOUT

Root
- `server/` - backend server
- `client/` - React frontend
- `IMPORTANT_FILES.md` - quick list of important files
- `CODE_DOCUMENTATION.md` - this document


BACKEND (server)

Entry point
- `server/index.js` (or `server/app.js` depending on the repo)
  - Connects to MongoDB using Mongoose (mongoose.connect)
  - Configures Express middleware (bodyParser/json, cors)
  - Serves static uploads: `app.use('/uploads', express.static(path.join(__dirname, 'uploads')))`
  - Mounts API routes under `/api/*` (auth, users, messages)
  - Starts the server on PORT (usually 5000)
  - Optionally initializes socket.io and listens for socket events

Models
- `server/models/User.js`
  - Schema fields
    - name: String, required
    - email: String, required, unique
    - password: String, required (hashed)
    - avatar: String (URL path to `/uploads/<file>`)
    - bubbleColor: String (optional hex color for outgoing bubbles)
    - online: Boolean (default false)
  - Timestamps enabled

- `server/models/Message.js`
  - Typical fields
    - from: ObjectId (ref User)
    - to: ObjectId (ref User) — optional for DMs
    - roomId: String — optional for group/room messages
    - content: String
    - attachments: Array (file refs)
    - createdAt/updatedAt timestamps

Routes and controllers
- `server/routes/auth.js`
  - POST `/api/auth/signup` — create user, bcrypt-hash password, return JWT + user
  - POST `/api/auth/login` — check credentials, return JWT + user

- `server/routes/users.js`
  - GET `/api/users` — list users (protected endpoint)
  - POST `/api/users/online` — set online status (protected)
  - POST `/api/users/avatar` — upload avatar (multipart/form-data); server currently enforces JPG-only via mimetype check; saves to `server/uploads` and saves `avatar` as `/uploads/<filename>` on the user document.
  - PUT `/api/users/profile` — update fields like `name` and `bubbleColor` (protected)

- `server/routes/messages.js`
  - POST `/api/messages` — create a message; body: { to, content, roomId? }
  - GET `/api/messages/:userId` — get conversation with userId (protected)

Middleware
- `server/middleware/auth.js`
  - Extracts JWT from `Authorization: Bearer <token>` header
  - Verifies JWT and sets `req.user = { id: <userId> }`
  - Use this middleware on protected routes (users/messages)

File uploads
- Multer used to handle multipart uploads. Files are saved to `server/uploads/`.
- The server enforces JPG-only for avatar uploads. If a non-JPG is uploaded the temporary file is deleted and a 400 response is returned.

Socket interactions
- If socket.io is enabled, tokens can be validated during handshake and sockets used for:
  - 'sendMessage' — server receives message and broadcasts to recipient(s)
  - 'presence' — client informs server of online state; server can broadcast presence updates
  - Server emits 'message' events to connected clients


FRONTEND (client)

App structure and routing
- `client/src/App.js` — main React Router setup
  - Routes: `/login`, `/signup`, `/chat`
  - Redirects to `/chat` when `localStorage.token` exists

API wrapper
- `client/src/api.js` — Axios instance with base URL (usually http://localhost:5000) and an interceptor to attach `Authorization: Bearer <token>` from localStorage for each request.

Key pages & components
- `client/src/pages/Login.js` — login form; stores `token` and `user` in localStorage on success
- `client/src/pages/Signup.js` — signup form (professional auth card) — calls POST `/api/auth/signup`
- `client/src/pages/Chat.js` — main app
  - Loads `me` from `localStorage.user`
  - Fetches `/api/users`
  - Connects to socket (optional)
  - Select a user to load messages (GET `/api/messages/:userId`), starts polling every few seconds
  - Sends messages (POST `/api/messages`) and emits socket events for real-time

- `client/src/components/Sidebar.js`
  - Shows current user details, search, user list, and a three-dot menu (⋮)
  - The menu contains an avatar preview, 'Edit Profile', 'Upload Avatar', and 'Personalization'
  - Upload action triggers a hidden file input and uploads as `multipart/form-data` to `POST /api/users/avatar` (client now validates file extension `.jpg`/`.jpeg` before sending)
  - Edit Profile opens a small editor where user can change `name` and `bubbleColor` (color picker). This calls `PUT /api/users/profile` and updates localStorage.user. The client applies the new bubble color via CSS variable `--bubble-out-var`.

- `client/src/components/ChatWindow.js` — header with selected user's name/status, `MessageList`, and message composer
- `client/src/components/MessageList.js` and `MessageBubble.js` — message rendering, grouping, and tail logic

Styling & theming
- `client/src/styles.css` contains app styles
  - CSS variables: `--primary`, `--muted`, `--bubble-out-var` (user-configurable)
  - WhatsApp-like bubble shapes and tails implemented via `::after` pseudo-element

Frontend code snippets (selected files)

Here are the actual frontend source files for quick reference. Copy/paste as needed.

`client/src/App.js`
```javascript
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Chat from './pages/Chat';

function App(){
  const token = localStorage.getItem('token');
  return (
    <div className="app-root">
      <Routes>
        <Route path="/" element={token ? <Navigate to="/chat" /> : <Navigate to="/login" />} />
        <Route path="/login" element={<Login/>} />
        <Route path="/signup" element={<Signup/>} />
        <Route path="/chat" element={<Chat/>} />
      </Routes>
    </div>
  );
}

export default App;
```

`client/src/pages/Chat.js`
```javascript
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import MessageList from '../components/MessageList';
import { connectSocket, getSocket, disconnectSocket } from '../socket';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';

export default function Chat(){
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const pollingRef = useRef(null);
  const navigate = useNavigate();

  useEffect(()=>{
    if (!me) return;
    API.get('/api/users').then(res => setUsers(res.data)).catch(()=>{});
    // connect socket and set presence
    const s = connectSocket();
    s.emit('presence', { userId: me._id });
    s.on('message', msg => {
      // if message is for selected or for current user, refresh
      if (selected && (msg.roomId === selected._id || msg.from === selected._id || msg.to === selected._id)){
        fetchMessages();
      }
      // else you could show a badge/notification
    });
    return ()=>{
      // cleanup
      s.off('message');
    };
  },[]);

  useEffect(()=>{
    // apply user's saved bubble color on chat load
    if (me?.bubbleColor) document.documentElement.style.setProperty('--bubble-out-var', me.bubbleColor);
  },[me?.bubbleColor]);

  useEffect(()=>{
    if (!selected) return;
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, 3000);
    return ()=> clearInterval(pollingRef.current);
  },[selected]);

  useEffect(()=>{
    return ()=>{ disconnectSocket(); }
  },[]);

  const fetchMessages = async () => {
    try{
      const res = await API.get('/api/messages/' + selected._id);
      setMessages(res.data);
    }catch(err){ console.error(err); }
  }

  const send = async e => {
    e.preventDefault();
    if (!text.trim() || !selected) return;
    try{
        const body = { to: selected._id, content: text };
        const res = await API.post('/api/messages', body);
        // emit via socket for live update
        const s = getSocket();
        if (s) s.emit('sendMessage', res.data);
        setText('');
        fetchMessages();
    }catch(err){ console.error(err); }
  }

  const logout = ()=>{
    // stop polling
    if (pollingRef.current) clearInterval(pollingRef.current);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  return (
    <div className="chat-page">
      <Sidebar
        me={me}
        users={users}
        selected={selected}
        onSelect={setSelected}
        onLogout={logout}
      />
      <ChatWindow
        selected={selected}
        messages={messages}
        currentUserId={me?._id}
        text={text}
        setText={setText}
        send={send}
      />
    </div>
  );
}
```

`client/src/components/Sidebar.js`
```javascript
import React from 'react';
import API from '../api';

export default function Sidebar({ me, users, selected, onSelect, onLogout }){
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(me?.name || '');
  const [bubbleColor, setBubbleColor] = React.useState(me?.bubbleColor || '');

  const uploadAvatar = async () => {
    const f = document.getElementById('avatarFile').files[0];
    if (!f) return alert('Pick a file first');
    const fd = new FormData(); fd.append('avatar', f);
    const res = await API.post('/api/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    localStorage.setItem('user', JSON.stringify(res.data));
    window.location.reload();
  }

  const [toast, setToast] = React.useState(null);

  const saveProfile = async () => {
    try{
      const res = await API.put('/api/users/profile', { name, bubbleColor });
      localStorage.setItem('user', JSON.stringify(res.data));
      setEditing(false);
      // apply bubble color immediately
      if (res.data.bubbleColor) document.documentElement.style.setProperty('--bubble-out-var', res.data.bubbleColor);
      // show success toast
      setToast('Profile updated');
      setTimeout(()=>setToast(null), 2800);
    }catch(err){ console.error(err); setToast('Failed to save'); setTimeout(()=>setToast(null),2800); }
  }

  React.useEffect(()=>{
    // apply saved bubble color on mount
    if (me?.bubbleColor) document.documentElement.style.setProperty('--bubble-out-var', me.bubbleColor);
  },[me?.bubbleColor]);

  return (
    <div className="sidebar">
      <div className="me-row">
        <div className="avatar large">{me?.name?.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div>
        <div style={{flex:1}}>
          <div className="me">{me?.name}</div>
          <small className="muted">{me?.email}</small>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button className="icon-logout" onClick={onLogout}>Logout</button>
          <div className="menu-container">
            <button className="menu-btn" onClick={e=>{e.stopPropagation(); const el = document.getElementById('me-menu'); el.classList.toggle('open');}}>⋮</button>
            <div id="me-menu" className="menu-dropdown">
              <div style={{padding:12,borderBottom:'1px solid #eef2f7',display:'flex',alignItems:'center',gap:10}}>
                <div className="menu-avatar">{me?.avatar ? <img src={me.avatar} alt="me"/> : me?.name?.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700}}>{me?.name}</div>
                  <small className="muted">{me?.email}</small>
                </div>
              </div>
              <button onClick={()=>{ setEditing(true); document.getElementById('me-menu').classList.remove('open'); }}>Edit Profile</button>
              <button onClick={()=>{ document.getElementById('avatarFile').click(); document.getElementById('me-menu').classList.remove('open'); }}>Upload Avatar</button>
              <button onClick={()=>{ setEditing(true); document.getElementById('me-menu').classList.remove('open'); }}>Personalization</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{display:'none'}} className="avatar-upload">
        <input type="file" id="avatarFile" onChange={async e=>{
          const f = e.target.files[0];
          if (!f) return;
          const lower = f.name.toLowerCase();
          if (!lower.endsWith('.jpg') && !lower.endsWith('.jpeg')){
            setToast('Only JPG files allowed'); setTimeout(()=>setToast(null),2800); return;
          }
          // proceed with upload
          const fd = new FormData(); fd.append('avatar', f);
          try{
            const res = await API.post('/api/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            localStorage.setItem('user', JSON.stringify(res.data));
            window.location.reload();
          }catch(err){
            const msg = err?.response?.data?.message || 'Upload failed';
            setToast(msg); setTimeout(()=>setToast(null),2800);
          }
        }} />
        <button onClick={uploadAvatar}>Upload</button>
      </div>

      {editing && (
        <div className="edit-profile">
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <label>Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} />
            <label>Outgoing bubble color</label>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="color" value={bubbleColor||'#dcf8c6'} onChange={e=>setBubbleColor(e.target.value)} />
              <div className="color-preview" title={bubbleColor || '#dcf8c6'} style={{background: bubbleColor || '#dcf8c6'}} />
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={saveProfile} className="primary">Save</button>
              <button onClick={()=>setEditing(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">{toast}</div>
      )}

      <div className="search">
        <input placeholder="Search or start new chat" />
      </div>

      <div className="list-title">Chats</div>
      <div className="users">
        {users.filter(u => u._id !== me?._id).map(u => (
          <div key={u._id} className={`user ${selected?._id===u._id?'active':''}`} onClick={()=>onSelect(u)}>
            <div className="avatar">{u.avatar ? <img src={u.avatar} alt="av" /> : u.name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div>
            <div style={{flex:1}}>
              <div className="name">{u.name}</div>
              <small className="muted">{u.email}</small>
            </div>
            <div className="dot" style={{background: u.online ? '#34d399' : '#9ca3af'}} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

`client/src/components/ChatWindow.js`
```javascript
import React from 'react';
import MessageList from './MessageList';

export default function ChatWindow({ selected, messages, currentUserId, text, setText, send }){
  if (!selected) return <div className="chat-area empty">Select a user to start chatting</div>;

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div style={{width:'100%',textAlign:'left'}}>
          <div className="name">{selected.name}</div>
          <small className="muted">{selected.online ? 'Online' : 'Offline'}</small>
        </div>
      </div>
      <MessageList messages={messages} currentUserId={currentUserId} />
      <form className="composer" onSubmit={send}>
        <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message" />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

`client/src/components/MessageList.js`
```javascript
import React from 'react';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages, currentUserId }){
  return (
    <div className="message-list">
      {messages.map((m, idx) => {
        const mine = m.from._id === currentUserId;
        // show avatar/tail only at the end of a group: when next message is from a different sender
        const next = messages[idx+1];
        const isEndOfGroup = !next || next.from._id !== m.from._id;
        return <MessageBubble key={m._id} m={m} mine={mine} showAvatar={isEndOfGroup} />;
      })}
    </div>
  );
}
```

`client/src/components/MessageBubble.js`
```javascript
import React from 'react';

function initials(name){
  if(!name) return '?';
  return name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
}

export default function MessageBubble({ m, mine, showAvatar = true }){
  const time = new Date(m.createdAt || m.updatedAt || Date.now()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  return (
    <div className={`message-row ${mine ? 'mine' : 'theirs'}`}>
      <div className={`message ${mine ? 'out' : 'in'}`}>
        <div className="bubble-content">
          {!mine && showAvatar && (
            m.from.avatar ? <img src={m.from.avatar} alt="av" className="avatar-msg"/> : <div className="avatar-msg initials">{initials(m.from.name)}</div>
          )}
          <div className="text-block" data-show-avatar={showAvatar}>
            <div className="content">{m.content}</div>
            <div className="time">{time}</div>
          </div>
          {mine && showAvatar && (
            // keep spacing consistent when showing tail on right side
            <div style={{width:36}} />
          )}
        </div>
      </div>
    </div>
  );
}
```

Data models and JSON examples
- User
```
{
  "_id": "64f...",
  "name": "Alice",
  "email": "alice@example.com",
  "avatar": "/uploads/abc123.jpg",
  "bubbleColor": "#dcf8c6"
}
```

- Message
```
{
  "_id": "64f...",
  "from": { "_id": "64f...", "name": "Alice", "avatar": "/uploads/a.jpg" },
  "to": "64f...",
  "content": "hi there",
  "createdAt": "2025-10-15T08:00:00.000Z"
}
```

Running & testing locally
- Start backend
```
cd server
npm install
npm start
```
- Start frontend
```
cd client
npm install
npm start
```

Manual test checklist
- Sign up / login and inspect `localStorage.user` and `localStorage.token`
- Open Chat and verify user list displays
- Edit profile and change bubble color — verify outgoing messages use that color
- Upload avatar (JPG only) via three-dot menu — verify menu displays avatar image
- Send messages and verify the other side receives via sockets or polling

Common debugging tips
- Port in use: EADDRINUSE — kill the process using the port (PowerShell: `Get-Process -Id <pid> | Stop-Process -Force`) or change PORT env var
- File uploads not appearing — ensure `server/uploads/` exists and server serves static files with `app.use('/uploads', express.static(...))`
- CORS issues — confirm server allows the frontend origin or enable `cors()` middleware

Next steps and suggestions
- Add client-side validation to Signup form and Profile editor
- Add accessibility keyboard handling for dropdown menus (Esc to close, arrow navigation)
- Add server-side image resizing and conversion for uploads (using Sharp) to accept PNG and convert to JPG
- Add unit/integration tests

---

I saved this file as `CODE_DOCUMENTATION.md` in the project root. Let me know if you want this split into `docs/` with separate markdowns per subsystem or if you'd like PDF/HTML export.