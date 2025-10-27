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
