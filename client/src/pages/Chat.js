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
