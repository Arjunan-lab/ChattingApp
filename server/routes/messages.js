const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

// POST /api/messages - send a message
router.post('/', auth, async (req, res) => {
  const { to, content, roomId } = req.body;
  if ((!to && !roomId) || !content) return res.status(400).json({ message: 'Missing recipient or content' });
  try {
    const newMsg = new Message({ from: req.user.id, to, roomId, content });
    await newMsg.save();
    await newMsg.populate([
      { path: 'from', select: 'name email' },
      { path: 'to', select: 'name email' }
    ]);
    // Emit via socket.io
    const io = req.app.get('io');
    const payload = newMsg.toObject();
    if (roomId && io) io.to(roomId).emit('message', payload);
    else if (to && io) io.emit('message', payload);
    res.json(newMsg);
  } catch (err) {
    console.error(err.stack || err);
    // Return error message to help debugging (safe for local dev)
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/messages/:userId - get messages between current user and userId
router.get('/:userId', auth, async (req, res) => {
  const other = req.params.userId;
  try {
    const msgs = await Message.find({
      $or: [
        { from: req.user.id, to: other },
        { from: other, to: req.user.id }
      ]
    }).sort('createdAt').populate('from', 'name').populate('to', 'name');
    res.json(msgs);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
