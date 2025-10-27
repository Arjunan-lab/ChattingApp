const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  content: { type: String, required: true },
  attachments: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
