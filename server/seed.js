require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Message = require('./models/Message');

async function main(){
  const mongo = process.env.MONGO_URI || 'mongodb://localhost:27017/mern-chat';
  await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to', mongo);

  // WARNING: this will remove existing users/messages in this database's collections.
  await Message.deleteMany({});
  await User.deleteMany({});

  const pass = 'password';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(pass, salt);

  const alice = new User({ name: 'Alice', email: 'alice@example.com', password: hash });
  const bob = new User({ name: 'Bob', email: 'bob@example.com', password: hash });
  await alice.save();
  await bob.save();

  const msgs = [
    { from: alice._id, to: bob._id, content: 'Hey Bob! This is Alice.' },
    { from: bob._id, to: alice._id, content: 'Hi Alice — good to hear from you.' },
    { from: alice._id, to: bob._id, content: 'Want to try out this MERN chat demo?' }
  ];
  await Message.insertMany(msgs);

  const secret = process.env.JWT_SECRET || 'secretkey';
  const tokenA = jwt.sign({ user: { id: alice.id } }, secret, { expiresIn: '7d' });
  const tokenB = jwt.sign({ user: { id: bob.id } }, secret, { expiresIn: '7d' });

  console.log('\nSeed complete. Users and messages created:');
  console.log('Alice:', { id: alice.id, email: alice.email, password: pass });
  console.log('Bob:  ', { id: bob.id, email: bob.email, password: pass });
  console.log('\nTokens (use as Authorization: Bearer <token>):');
  console.log('Alice token:', tokenA);
  console.log('Bob token:  ', tokenB);

  console.log('\nExample:')
  console.log(`curl -H "Authorization: Bearer ${tokenA}" http://localhost:5000/api/users`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
