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
