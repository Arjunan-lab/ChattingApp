require('dotenv').config();
const mongoose = require('mongoose');

const srcDefault = 'mongodb://localhost:27017/mern-chat';
const dstDefault = 'mongodb://localhost:27017/chatting-app';

const srcUri = process.env.SRC_MONGO_URI || srcDefault;
const dstUri = process.env.DST_MONGO_URI || dstDefault;

async function main(){
  console.log('Source URI:', srcUri);
  console.log('Target URI:', dstUri);

  const srcConn = await mongoose.createConnection(srcUri, { useNewUrlParser: true, useUnifiedTopology: true });
  const dstConn = await mongoose.createConnection(dstUri, { useNewUrlParser: true, useUnifiedTopology: true });

  // Define minimal schemas matching the app
  const UserSchema = new mongoose.Schema({ name: String, email: String, password: String }, { timestamps: true });
  const MessageSchema = new mongoose.Schema({ from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, content: String }, { timestamps: true });

  const SrcUser = srcConn.model('User', UserSchema, 'users');
  const SrcMessage = srcConn.model('Message', MessageSchema, 'messages');

  const DstUser = dstConn.model('User', UserSchema, 'users');
  const DstMessage = dstConn.model('Message', MessageSchema, 'messages');

  // Read data
  const users = await SrcUser.find({}).lean();
  const messages = await SrcMessage.find({}).lean();
  console.log('Read', users.length, 'users and', messages.length, 'messages from source');

  // Clear target collections
  await DstMessage.deleteMany({});
  await DstUser.deleteMany({});

  // Insert users preserving _id
  if (users.length) {
    await DstUser.insertMany(users, { ordered: false });
  }

  // Insert messages preserving _id and references
  if (messages.length) {
    await DstMessage.insertMany(messages, { ordered: false });
  }

  console.log('Migration complete. Target now has:');
  const ucount = await DstUser.countDocuments();
  const mcount = await DstMessage.countDocuments();
  console.log('Users:', ucount, 'Messages:', mcount);

  await srcConn.close();
  await dstConn.close();
}

main().catch(err => { console.error(err); process.exit(1); });
