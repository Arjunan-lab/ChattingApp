Chatting App (Polling, no sockets)

Structure:
- server/  - Express + Mongoose backend
- client/  - React frontend (polling every 3s)

Quick start:
1. Start MongoDB locally (or set MONGO_URI in server/.env)
2. In terminal 1:
   cd F:/Coding/MERN/server
   npm install
   copy .env.example .env (on PowerShell: Copy-Item .env.example .env)
   # edit .env to set JWT_SECRET and MONGO_URI
   npm run dev
3. In terminal 2:
   cd F:/Coding/MERN/client
   npm install
   npm start

Then open http://localhost:3000

Environment:
- Node >= 16 recommended
- MongoDB running locally or via a cloud URI

APIs are described in server/README.md
