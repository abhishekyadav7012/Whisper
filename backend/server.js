const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const User = require('./models/User');
const Thought = require('./models/Thought');
const sendEmail = require('./utils/sendEmail');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ["GET", "POST"] }
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/thoughtDB')
  .then(() => { console.log("✅ MongoDB Connected"); initAdminAccount(); })
  .catch(err => console.error("❌ DB Connection Error:", err));

// =============================================================
// SCHEMAS
// =============================================================

const GossipSchema = new mongoose.Schema({
  username: String, text: String,
  location: { type: { type: String, default: "Point" }, coordinates: { type: [Number], required: true } },
  createdAt: { type: Date, default: Date.now }
});
GossipSchema.index({ location: "2dsphere" });
const Gossip = mongoose.model('Gossip', GossipSchema);

const RoomSchema = new mongoose.Schema({
  name: String, description: String, admin: String,
  password: { type: String, default: "" },
  messages: [{
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    username: String, text: String,
    media: { url: String, fileType: String, fileName: String },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now, expires: 18000 }
});
const Room = mongoose.model('Room', RoomSchema);

const MessageSchema = new mongoose.Schema({
  sender: String, receiver: String, text: String,
  media: { url: String, fileType: String, fileName: String },
  deletedBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now, expires: 18000 }
});
const Message = mongoose.model('Message', MessageSchema);

const CollabSchema = new mongoose.Schema({
  title: String, description: String, techStack: String, admin: String,
  password: { type: String, default: "" },
  code: { type: String, default: "// Start coding together..." },
  members: [{ username: String, displayName: String }],
  createdAt: { type: Date, default: Date.now }
});
const Collab = mongoose.model('Collab', CollabSchema);

const CommunityPostSchema = new mongoose.Schema({
  username: String, content: String,
  media: [{ url: String, fileType: String, fileName: String }],
  likes: { type: [String], default: [] },
  comments: [{ username: String, text: String, createdAt: { type: Date, default: Date.now } }],
  createdAt: { type: Date, default: Date.now }
});

const CommunitySchema = new mongoose.Schema({
  name: String, description: String, topic: String, admin: String,
  banner: { type: String, default: "" }, avatar: { type: String, default: "" },
  password: { type: String, default: "" },
  members: [{ username: String, joinedAt: { type: Date, default: Date.now } }],
  joinRequests: [{ username: String, requestedAt: { type: Date, default: Date.now } }],
  posts: [CommunityPostSchema],
  createdAt: { type: Date, default: Date.now }
});
const Community = mongoose.model('Community', CommunitySchema);

const NotificationSchema = new mongoose.Schema({
  recipient: { type: String, required: true },
  sender: { type: String, default: "System" },
  type: { type: String, enum: ['message', 'room_invite', 'community_join_request', 'community_approved', 'community_rejected', 'post_like', 'post_comment', 'general'], default: 'general' },
  title: String, body: String, link: String,
  read: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, expires: 2592000 }
});
const Notification = mongoose.model('Notification', NotificationSchema);

const AdminSchema = new mongoose.Schema({
  username: { type: String, default: "admin", unique: true },
  passwordHash: String, updatedAt: { type: Date, default: Date.now }
});
const Admin = mongoose.model('Admin', AdminSchema);

// =============================================================
// ADMIN INIT
// =============================================================
async function initAdminAccount() {
  try {
    const existing = await Admin.findOne({ username: "admin" });
    if (!existing) {
      const defaultPassword = process.env.ADMIN_PASSWORD || "admin123";
      const hash = await bcrypt.hash(defaultPassword, 12);
      await Admin.create({ username: "admin", passwordHash: hash });
      console.log("✅ Admin account created. Password:", defaultPassword);
    }
  } catch (err) { console.error("Admin init error:", err.message); }
}

// =============================================================
// ADMIN JWT
// =============================================================
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "whisper_admin_jwt_secret_CHANGE_THIS";
const signAdminToken = () => jwt.sign({ role: "admin" }, ADMIN_JWT_SECRET, { expiresIn: "8h" });
const adminAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(403).json({ msg: "No admin token" });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], ADMIN_JWT_SECRET);
    if (decoded.role !== "admin") throw new Error();
    next();
  } catch { return res.status(403).json({ msg: "Invalid or expired admin token" }); }
};

// =============================================================
// SOCKET.IO
// =============================================================
io.on('connection', (socket) => {
  socket.on('join-editor', (collabId) => { socket.join(collabId); });
  socket.on('code-change', ({ collabId, code }) => { socket.to(collabId).emit('code-update', code); });
  socket.on('join-whiteboard', (collabId) => { socket.join(`wb-${collabId}`); });
  socket.on('whiteboard-draw', ({ collabId, drawData }) => { socket.to(`wb-${collabId}`).emit('whiteboard-draw-update', drawData); });
  socket.on('whiteboard-clear', (collabId) => { socket.to(`wb-${collabId}`).emit('whiteboard-cleared'); });
  socket.on('join-room', (roomId) => { socket.join(`room-${roomId}`); });
  socket.on('leave-room', (roomId) => { socket.leave(`room-${roomId}`); });
  socket.on('room-message', (data) => { io.to(`room-${data.roomId}`).emit('room-message-received', data.message); });
  socket.on('room-message-delete', (data) => { io.to(`room-${data.roomId}`).emit('room-message-deleted', data.messageId); });
  socket.on('join-community', (communityId) => { socket.join(`community-${communityId}`); });
  socket.on('leave-community', (communityId) => { socket.leave(`community-${communityId}`); });
  socket.on('join-notifications', (username) => { socket.join(`notif-${username}`); });
  socket.on('disconnect', () => { console.log('User disconnected'); });
});

async function createNotification({ recipient, sender, type, title, body, link, metadata }) {
  try {
    const notif = await Notification.create({ recipient, sender, type, title, body, link, metadata: metadata || {} });
    io.to(`notif-${recipient}`).emit('new-notification', notif);
    return notif;
  } catch (err) { console.error("Notification error:", err.message); }
}

// =============================================================
// ADMIN ROUTES
// =============================================================
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ msg: "Password required" });
    const admin = await Admin.findOne({ username: "admin" });
    if (!admin) return res.status(500).json({ msg: "Admin not initialised" });
    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) return res.status(401).json({ msg: "Wrong password" });
    res.json({ token: signAdminToken() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/verify', adminAuth, (req, res) => { res.json({ valid: true }); });

app.post('/api/admin/change-password', adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ msg: "Both fields required" });
    if (newPassword.length < 8) return res.status(400).json({ msg: "New password must be at least 8 characters" });
    const admin = await Admin.findOne({ username: "admin" });
    const match = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!match) return res.status(401).json({ msg: "Current password is wrong" });
    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    admin.updatedAt = new Date();
    await admin.save();
    res.json({ msg: "Password updated successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const [totalUsers, totalThoughts, totalRooms, totalMessages, totalCollabs, totalCommunities] = await Promise.all([
      User.countDocuments(), Thought.countDocuments(), Room.countDocuments(),
      Message.countDocuments(), Collab.countDocuments(), Community.countDocuments(),
    ]);
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('username email createdAt isVerified');
    const recentThoughts = await Thought.find().sort({ createdAt: -1 }).limit(5);
    res.json({ totalUsers, totalThoughts, totalRooms, totalMessages, totalCollabs, totalCommunities, recentUsers, recentThoughts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-password -otp');
    const withCounts = await Promise.all(users.map(async u => {
      const postCount = await Thought.countDocuments({ username: u.username });
      const msgCount = await Message.countDocuments({ $or: [{ sender: u.username }, { receiver: u.username }] });
      return { ...u.toObject(), postCount, msgCount };
    }));
    res.json(withCounts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/users/:username', adminAuth, async (req, res) => {
  try {
    const { username } = req.params;
    await User.findOneAndDelete({ username });
    await Thought.deleteMany({ username });
    await Message.deleteMany({ $or: [{ sender: username }, { receiver: username }] });
    res.json({ msg: "User and all data deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/thoughts', adminAuth, async (req, res) => {
  try { res.json(await Thought.find().sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/thoughts/:id', adminAuth, async (req, res) => {
  try { await Thought.findByIdAndDelete(req.params.id); res.json({ msg: "Post deleted" }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/rooms', adminAuth, async (req, res) => {
  try { res.json(await Room.find().sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/rooms/:id', adminAuth, async (req, res) => {
  try { await Room.findByIdAndDelete(req.params.id); res.json({ msg: "Room deleted" }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/rooms/:roomId/messages/:msgId', adminAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ msg: "Room not found" });
    room.messages = room.messages.filter(m => m.id !== req.params.msgId);
    await room.save();
    res.json({ msg: "Message deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/messages', adminAuth, async (req, res) => {
  try { res.json(await Message.find().sort({ createdAt: -1 }).limit(200)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/messages/:u1/:u2', adminAuth, async (req, res) => {
  try {
    res.json(await Message.find({ $or: [{ sender: req.params.u1, receiver: req.params.u2 }, { sender: req.params.u2, receiver: req.params.u1 }] }).sort({ createdAt: 1 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/messages/:id', adminAuth, async (req, res) => {
  try { await Message.findByIdAndDelete(req.params.id); res.json({ msg: "Message deleted" }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/collabs', adminAuth, async (req, res) => {
  try { res.json(await Collab.find().sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/collabs/:id', adminAuth, async (req, res) => {
  try { await Collab.findByIdAndDelete(req.params.id); res.json({ msg: "Collab deleted" }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/communities', adminAuth, async (req, res) => {
  try { res.json(await Community.find().sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/communities/:id', adminAuth, async (req, res) => {
  try { await Community.findByIdAndDelete(req.params.id); res.json({ msg: "Community deleted" }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/communities/:id/requests/:username/approve', adminAuth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ msg: "Not found" });
    community.joinRequests = community.joinRequests.filter(r => r.username !== req.params.username);
    if (!community.members.find(m => m.username === req.params.username)) community.members.push({ username: req.params.username });
    await community.save();
    await createNotification({ recipient: req.params.username, sender: community.admin, type: 'community_approved', title: 'Join Request Approved! 🎉', body: `You've been approved to join "${community.name}"!`, link: '/communities', metadata: { communityId: community._id } });
    res.json({ msg: "Approved" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/communities/:id/requests/:username/reject', adminAuth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ msg: "Not found" });
    community.joinRequests = community.joinRequests.filter(r => r.username !== req.params.username);
    await community.save();
    await createNotification({ recipient: req.params.username, sender: community.admin, type: 'community_rejected', title: 'Join Request Declined', body: `Your request to join "${community.name}" was not approved.`, link: '/communities', metadata: { communityId: community._id } });
    res.json({ msg: "Rejected" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================================
// AUTH ROUTES
// =============================================================
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, rePassword } = req.body;
    if (password !== rePassword) return res.status(400).json({ msg: "Passwords don't match" });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const newUser = new User({ username, email, password: hashedPassword, otp, otpExpires: Date.now() + 600000, isVerified: false });
    await newUser.save();
    await sendEmail(newUser.email, "Verification OTP", `OTP: ${otp}`);
    res.status(201).json({ msg: "OTP sent!" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.otp !== otp) return res.status(400).json({ msg: "Invalid OTP" });
  user.isVerified = true; user.otp = undefined; await user.save();
  res.json({ msg: "Verified!" });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !user.isVerified) return res.status(400).json({ msg: "Not found or unverified" });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ msg: "Invalid" });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "SECRET_KEY", { expiresIn: '1h' });
  res.json({ token, user: { id: user._id, username: user.username } });
});

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    if (!username || !currentPassword || !newPassword) return res.status(400).json({ msg: "All fields required" });
    if (newPassword.length < 6) return res.status(400).json({ msg: "New password must be at least 6 characters" });
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ msg: "User not found" });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ msg: "Current password is incorrect" });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ msg: "Password updated successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    await User.findOneAndDelete({ username });
    await Thought.deleteMany({ username });
    await Message.deleteMany({ $or: [{ sender: username }, { receiver: username }] });
    res.json({ msg: "Account and data deleted successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================================
// NOTIFICATIONS
// =============================================================
app.get('/api/notifications/:username', async (req, res) => {
  try {
    const notifs = await Notification.find({ recipient: req.params.username }).sort({ createdAt: -1 }).limit(50);
    res.json(notifs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notifications/:username/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.params.username, read: false }, { read: true });
    res.json({ msg: "All marked as read" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try { await Notification.findByIdAndUpdate(req.params.id, { read: true }); res.json({ msg: "Marked as read" }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try { await Notification.findByIdAndDelete(req.params.id); res.json({ msg: "Deleted" }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================================
// GOSSIP ROOMS
// =============================================================
app.get('/api/rooms', async (req, res) => {
  try { res.json(await Room.find().sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/rooms', async (req, res) => {
  try { const newRoom = new Room(req.body); await newRoom.save(); res.status(201).json(newRoom); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/rooms/:id/messages', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    const newMsg = { id: new mongoose.Types.ObjectId().toString(), username: req.body.username, text: req.body.text, media: req.body.media, createdAt: new Date() };
    room.messages.push(newMsg);
    await room.save();
    io.to(`room-${req.params.id}`).emit('room-message-received', newMsg);
    res.json(newMsg);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/rooms/:roomId/messages/:messageId', async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const room = await Room.findById(roomId);
    room.messages = room.messages.filter(m => m.id !== messageId);
    await room.save();
    io.to(`room-${roomId}`).emit('room-message-deleted', messageId);
    res.json({ msg: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/rooms/:id', async (req, res) => {
  await Room.findByIdAndDelete(req.params.id);
  res.json({ msg: "Room Deleted" });
});

// =============================================================
// COLLABORATION ROUTES
// =============================================================
app.get('/api/collabs', async (req, res) => {
  try { res.json(await Collab.find().sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/collabs', async (req, res) => {
  try {
    const { title, description, techStack, admin, password } = req.body;
    const newCollab = new Collab({ title, description, techStack, admin, password: password || "", members: [{ username: admin, displayName: admin }] });
    await newCollab.save();
    res.status(201).json(newCollab);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/collabs/:id/join', async (req, res) => {
  try {
    const { username, displayName, password } = req.body;
    const collab = await Collab.findById(req.params.id);
    if (collab.password && collab.admin !== username) {
      if (password !== collab.password) return res.status(403).json({ msg: "Incorrect password" });
    }
    const alreadyMember = collab.members.find(m => m.username === username);
    if (!alreadyMember) { collab.members.push({ username, displayName: displayName || username }); await collab.save(); }
    res.json(collab);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/collabs/:id/verify-editor', async (req, res) => {
  try {
    const { password, username } = req.body;
    const collab = await Collab.findById(req.params.id);
    if (!collab) return res.status(404).json({ msg: "Not found" });
    if (collab.admin === username) return res.json({ ok: true });
    if (!collab.password) return res.json({ ok: true });
    if (password === collab.password) return res.json({ ok: true });
    return res.status(403).json({ msg: "Incorrect password" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/collabs/:id', async (req, res) => {
  try { await Collab.findByIdAndDelete(req.params.id); res.json({ msg: "Collab Deleted" }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================================
// MESSAGING
// =============================================================
app.get('/api/messages/inbox/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const msgs = await Message.find({ $or: [{ sender: username }, { receiver: username }], deletedBy: { $nin: [username] } }).sort({ createdAt: -1 });
    const partners = new Set();
    msgs.forEach(m => partners.add(m.sender === username ? m.receiver : m.sender));
    res.json(Array.from(partners));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/messages/:u1/:u2', async (req, res) => {
  try {
    const { u1, u2 } = req.params;
    const msgs = await Message.find({ $or: [{ sender: u1, receiver: u2 }, { sender: u2, receiver: u1 }], deletedBy: { $nin: [u1] } }).sort({ createdAt: 1 });
    res.json(msgs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/messages', async (req, res) => {
  try {
    const nm = new Message(req.body);
    await nm.save();
    await createNotification({ recipient: req.body.receiver, sender: req.body.sender, type: 'message', title: `New message from @${req.body.sender}`, body: req.body.text ? req.body.text.substring(0, 80) : '[Media]', link: '/pm', metadata: { sender: req.body.sender } });
    res.json(nm);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/messages/:u1/:u2', async (req, res) => {
  try {
    const { u1, u2 } = req.params;
    const msgs = await Message.find({ $or: [{ sender: u1, receiver: u2 }, { sender: u2, receiver: u1 }] });
    const toPhysicallyDelete = [], toSoftDelete = [];
    for (const msg of msgs) {
      if ((msg.deletedBy || []).includes(u2)) toPhysicallyDelete.push(msg._id);
      else toSoftDelete.push(msg._id);
    }
    if (toPhysicallyDelete.length > 0) await Message.deleteMany({ _id: { $in: toPhysicallyDelete } });
    if (toSoftDelete.length > 0) await Message.updateMany({ _id: { $in: toSoftDelete } }, { $addToSet: { deletedBy: u1 } });
    res.json({ msg: "Chat cleared successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================================
// THOUGHTS / POSTS
// =============================================================
app.get('/api/thoughts/recent', async (req, res) => {
  const ago = new Date(Date.now() - 24 * 60 * 60 * 1000);
  res.json(await Thought.find({ createdAt: { $gte: ago } }).sort({ createdAt: -1 }));
});

app.get('/api/thoughts/popular', async (req, res) => {
  res.json(await Thought.aggregate([{ $addFields: { likesCount: { $size: "$likes" } } }, { $sort: { likesCount: -1 } }, { $limit: 50 }]));
});

app.get('/api/thoughts/user/:username', async (req, res) => {
  res.json(await Thought.find({ username: req.params.username }).sort({ createdAt: -1 }));
});

app.get('/api/thoughts/category/:category', async (req, res) => {
  try { res.json(await Thought.find({ category: req.params.category }).sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/thoughts', async (req, res) => {
  try {
    const { content, mood, category, username, images, videos, files } = req.body;
    const nt = new Thought({ content, mood, category, username, images: images || [], videos: videos || [], files: files || [], likes: [], dislikes: [], comments: [] });
    await nt.save();
    res.status(201).json(nt);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/thoughts/:id', async (req, res) => {
  const updated = await Thought.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

app.delete('/api/thoughts/:id', async (req, res) => {
  await Thought.findByIdAndDelete(req.params.id);
  res.json({ msg: "Deleted" });
});

app.post('/api/thoughts/:id/:type', async (req, res) => {
  try {
    const { username } = req.body;
    const { id, type } = req.params;
    const thought = await Thought.findById(id);
    if (!thought) return res.status(404).json({ msg: "Thought not found" });
    if (type === 'like') {
      const wasLiked = thought.likes.includes(username);
      wasLiked ? thought.likes = thought.likes.filter(u => u !== username) : thought.likes.push(username);
      thought.dislikes = thought.dislikes.filter(u => u !== username);
      if (!wasLiked && thought.username !== username) {
        await createNotification({ recipient: thought.username, sender: username, type: 'post_like', title: `@${username} liked your whisper`, body: thought.content?.substring(0, 60) || '', link: '/workspace', metadata: { postId: id } });
      }
    } else if (type === 'dislike') {
      thought.dislikes.includes(username) ? thought.dislikes = thought.dislikes.filter(u => u !== username) : thought.dislikes.push(username);
      thought.likes = thought.likes.filter(u => u !== username);
    }
    await thought.save();
    res.json(thought);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/thoughts/:id/comment', async (req, res) => {
  try {
    const { username, text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ msg: "Comment text required" });
    const updatedThought = await Thought.findByIdAndUpdate(req.params.id, { $push: { comments: { username: username || "Anonymous", text: text.trim(), createdAt: new Date() } } }, { new: true });
    if (!updatedThought) return res.status(404).json({ msg: "Thought not found" });
    if (updatedThought.username !== username) {
      await createNotification({ recipient: updatedThought.username, sender: username, type: 'post_comment', title: `@${username} commented on your whisper`, body: text.trim().substring(0, 60), link: '/workspace', metadata: { postId: req.params.id } });
    }
    res.json(updatedThought);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================================
// COMMUNITY ROUTES
// =============================================================
app.get('/api/communities', async (req, res) => {
  try { res.json(await Community.find().sort({ createdAt: -1 }).select('-posts')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/communities/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json(await Community.find().sort({ createdAt: -1 }).select('-posts'));
    const communities = await Community.find({
      $or: [{ name: { $regex: q, $options: 'i' } }, { topic: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }]
    }).select('-posts').sort({ createdAt: -1 });
    res.json(communities);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/communities/:id', async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ msg: "Community not found" });
    res.json(community);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/communities', async (req, res) => {
  try {
    const { name, description, topic, admin, password, avatar, banner } = req.body;
    const newCommunity = new Community({ name, description, topic, admin, password: password || "", avatar: avatar || "", banner: banner || "", members: [{ username: admin }], joinRequests: [], posts: [] });
    await newCommunity.save();
    res.status(201).json(newCommunity);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Request to join (sends notification to admin for approval)
app.post('/api/communities/:id/request-join', async (req, res) => {
  try {
    const { username, password } = req.body;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ msg: "Community not found" });
    if (community.admin === username) {
      if (!community.members.find(m => m.username === username)) { community.members.push({ username }); await community.save(); }
      return res.json({ msg: "joined", community });
    }
    if (community.password && password !== community.password) return res.status(403).json({ msg: "Incorrect password" });
    if (community.members.find(m => m.username === username)) return res.json({ msg: "already_member", community });
    if (community.joinRequests.find(r => r.username === username)) return res.json({ msg: "already_requested" });
    community.joinRequests.push({ username });
    await community.save();
    await createNotification({ recipient: community.admin, sender: username, type: 'community_join_request', title: `Join Request: ${community.name}`, body: `@${username} wants to join your community "${community.name}"`, link: '/communities', metadata: { communityId: community._id, communityName: community.name, requester: username } });
    res.json({ msg: "requested" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/communities/:id/requests/:username/approve', async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ msg: "Not found" });
    community.joinRequests = community.joinRequests.filter(r => r.username !== req.params.username);
    if (!community.members.find(m => m.username === req.params.username)) community.members.push({ username: req.params.username });
    await community.save();
    await createNotification({ recipient: req.params.username, sender: community.admin, type: 'community_approved', title: 'Join Request Approved! 🎉', body: `You've been approved to join "${community.name}"!`, link: '/communities', metadata: { communityId: community._id } });
    res.json({ msg: "Approved", community });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/communities/:id/requests/:username/reject', async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ msg: "Not found" });
    community.joinRequests = community.joinRequests.filter(r => r.username !== req.params.username);
    await community.save();
    await createNotification({ recipient: req.params.username, sender: community.admin, type: 'community_rejected', title: 'Join Request Declined', body: `Your request to join "${community.name}" was not approved.`, link: '/communities', metadata: { communityId: community._id } });
    res.json({ msg: "Rejected" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/communities/:id/leave', async (req, res) => {
  try {
    const { username } = req.body;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ msg: "Community not found" });
    community.members = community.members.filter(m => m.username !== username);
    await community.save();
    res.json({ msg: "Left community" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/communities/:id/posts', async (req, res) => {
  try {
    const { username, content, media } = req.body;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ msg: "Community not found" });
    const newPost = { username, content, media: media || [], likes: [], comments: [], createdAt: new Date() };
    community.posts.push(newPost);
    await community.save();
    const savedPost = community.posts[community.posts.length - 1];
    io.to(`community-${req.params.id}`).emit('community-post', savedPost);
    res.json(savedPost);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/communities/:id/posts/:postId/like', async (req, res) => {
  try {
    const { username } = req.body;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ msg: "Not found" });
    const post = community.posts.id(req.params.postId);
    if (!post) return res.status(404).json({ msg: "Post not found" });
    const idx = post.likes.indexOf(username);
    if (idx === -1) post.likes.push(username);
    else post.likes.splice(idx, 1);
    await community.save();
    res.json(post);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/communities/:id/posts/:postId/comment', async (req, res) => {
  try {
    const { username, text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ msg: "Comment text required" });
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ msg: "Not found" });
    const post = community.posts.id(req.params.postId);
    if (!post) return res.status(404).json({ msg: "Post not found" });
    post.comments.push({ username, text: text.trim(), createdAt: new Date() });
    await community.save();
    res.json(post);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/communities/:id/posts/:postId', async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ msg: "Not found" });
    community.posts = community.posts.filter(p => p._id.toString() !== req.params.postId);
    await community.save();
    res.json({ msg: "Post deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/communities/:id', async (req, res) => {
  try { await Community.findByIdAndDelete(req.params.id); res.json({ msg: "Community deleted" }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================================
// USER SEARCH
// =============================================================
app.get('/api/users/search', async (req, res) => {
  const { q } = req.query;
  res.json(await User.find({ username: { $regex: q, $options: 'i' } }).select('username _id'));
});

// =============================================================
// START SERVER
// =============================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));