import { io } from 'socket.io-client';

let socket;

export function connectSocket(){
  if (!socket){
    const token = localStorage.getItem('token');
    socket = io('http://localhost:5000', { auth: { token } });
  }
  return socket;
}

export function getSocket(){ return socket; }

export function disconnectSocket(){ if (socket){ socket.disconnect(); socket = null; } }
