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
