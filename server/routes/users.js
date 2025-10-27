const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const upload = multer({ dest: path.join(__dirname, '..', 'uploads/') });
const fs = require('fs');
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /api/users - list users (protected)
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('name');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// POST /api/users/online - set online status
router.post('/online', auth, async (req, res) => {
  try{
    const { online } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { online: !!online }, { new: true }).select('-password');
    res.json(user);
  }catch(err){
    console.error(err);
    res.status(500).send('Server error');
  }
});

// POST /api/users/avatar - upload avatar image
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try{
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    // accept only jpeg/jpg
    if (!req.file.mimetype || !['image/jpeg','image/jpg'].includes(req.file.mimetype.toLowerCase())){
      // remove uploaded file
      try{ fs.unlinkSync(req.file.path); }catch(e){}
      return res.status(400).json({ message: 'Only JPG images are allowed' });
    }

    const url = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user.id, { avatar: url }, { new: true }).select('-password');
    res.json(user);
  }catch(err){
    console.error(err);
    res.status(500).send('Server error');
  }
});

// PUT /api/users/profile - update profile fields (name, bubbleColor)
router.put('/profile', auth, async (req, res) => {
  try{
    const { name, bubbleColor } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (bubbleColor) updates.bubbleColor = bubbleColor;
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    res.json(user);
  }catch(err){
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;

