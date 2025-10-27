require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Basic security + limits
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

// Socket.io
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

// Multer setup
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// Routes
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const uploadRouter = express.Router();

uploadRouter.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRouter);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mern-chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  server.listen(PORT, () => console.log('Server running on port', PORT));

  // Socket events
  io.on('connection', async socket => {
    console.log('Socket connected', socket.id);
    // token can be sent in handshake auth
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token){
      try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        const userId = decoded.user.id;
        socket.userId = userId;
        // join a room named after the user id so we can emit direct messages
        socket.join(userId);
        // mark user online
        await User.findByIdAndUpdate(userId, { online: true });
        io.emit('user-online', { userId });
      }catch(e){
        console.warn('Invalid socket token', e.message);
      }
    }

    socket.on('joinRoom', roomId => {
      socket.join(roomId);
    });

    socket.on('leaveRoom', roomId => {
      socket.leave(roomId);
    });

    socket.on('sendMessage', msg => {
      // If message has roomId, broadcast to room
      if (msg.roomId) io.to(msg.roomId).emit('message', msg);
      // If message has a 'to' user id, emit to that user's room
      else if (msg.to) io.to(msg.to).emit('message', msg);
      // Also emit to sender so sender UI can reconcile
      if (socket.userId) io.to(socket.userId).emit('message', msg);
    });

    socket.on('disconnect', async ()=>{
      if (socket.userId){
        await User.findByIdAndUpdate(socket.userId, { online: false });
        io.emit('user-offline', { userId: socket.userId });
      }
    });
  });

})
.catch(err => {
  console.error('Mongo connection error', err);
});

module.exports = { app, server, io };
