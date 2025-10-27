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
