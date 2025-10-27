Chatting App Server

Instructions:
1. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`.
2. Run `npm install`.
3. Start server: `npm run dev` (requires nodemon) or `npm start`.

APIs:
- POST /api/auth/signup {name,email,password}
- POST /api/auth/login {email,password}
- GET /api/users (protected)
- POST /api/messages {to,content} (protected)
- GET /api/messages/:userId (protected)
