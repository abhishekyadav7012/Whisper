<div align="center">

<img src="https://img.shields.io/badge/Whisper.io-Anonymous%20Social%20Platform-blue?style=for-the-badge&logo=ghost&logoColor=white" alt="Whisper.io" />

# 🤫 Whisper.io

### *Say it anonymously. Vanish without a trace.*

A full-stack anonymous social platform where you can share secrets, chat in ephemeral rooms, send private messages, and collaborate on code — all in real time.

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

<br/>

[✨ Features](#-features) · [🛠 Tech Stack](#-tech-stack) · [🚀 Getting Started](#-getting-started) · [📁 Project Structure](#-project-structure) · [🔌 API Reference](#-api-reference) · [🤝 Contributing](#-contributing)

</div>

---

## ✨ Features

### 🏠 Social Feed
- **Anonymous posting** — share thoughts, secrets, and confessions without revealing your identity
- **Mood tagging** — attach emotional context to every post (😊 Happy, 🔥 Lit, 💖 Ishq, and more)
- **Category channels** — organize posts under Internet Culture, Games, Tech, Sports, and more
- **Reddit-style voting** — upvote ▲ and downvote ▼ any post
- **Comment threads** — real-time comment system on every post
- **Image uploads** — attach up to 5 images per post
- **Share** — native share sheet or clipboard copy

### 💬 Gossip Rooms
- **Ephemeral chat rooms** — every room auto-deletes after **5 hours**
- **Anonymous nicknames** — join rooms under a custom alias or a random generated name
- **Password-protected rooms** — create private rooms with access control
- **Media sharing** — share images and videos inside rooms
- **Live countdown** — real-time timer showing when the room vanishes
- **Real-time sync** — powered by Socket.io, messages appear instantly for all members

### 🔒 Private Messages
- **End-to-end DMs** — direct messaging between any two users
- **Media support** — share images, videos, PDFs, and other files
- **Inbox** — organized conversation list with quick search
- **Clear chat** — wipe entire conversation history at any time

### 🛠️ Developer Platform
- **Collab rooms** — create shared coding workspaces with teammates
- **Live code editor** — VS Code-style Monaco editor with real-time sync via Socket.io
- **🌈 Rainbow mode** — each character gets a unique color as you type
- **Whiteboard** — collaborative drawing canvas with pen, eraser, shapes, arrows, and text tools
- **Password-protected projects** — control who can enter the editor
- **Member management** — see who's in the collab room with display names

### ⚙️ Account & Settings
- **OTP email verification** — secure signup with one-time passwords
- **JWT authentication** — stateless, secure sessions
- **Profile settings** — update display name, bio, and mood
- **Privacy controls** — anonymous mode, private profile, hide status, disable DMs
- **Account deletion** — permanently delete account and all associated data

### 🛡️ Admin Panel
- **Dashboard stats** — total users, posts, rooms, messages, collabs
- **User management** — view all users, delete accounts and their data
- **Content moderation** — delete any post, message, or room
- **Secure login** — bcrypt-hashed password + JWT-protected admin routes
- **Password rotation** — change admin password from the dashboard

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose ODM) |
| **Real-time** | Socket.io (WebSockets) |
| **Auth** | JWT, bcryptjs |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Email** | Nodemailer (OTP verification) |
| **Styling** | Tailwind CSS, custom CSS animations |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://mongodb.com/) (local or Atlas cloud)
- [npm](https://npmjs.com/) or [yarn](https://yarnpkg.com/)
- A Gmail account (for OTP emails via Nodemailer)

---

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/whisper-io.git
cd whisper-io
```

---

### 2. Backend Setup

```bash
# Navigate to the backend folder
cd server

# Install dependencies
npm install
```

Create a `.env` file in the `/server` directory:

```env
# MongoDB connection string
MONGO_URI=mongodb://127.0.0.1:27017/thoughtDB

# JWT secret for user auth (change this!)
JWT_SECRET=your_super_secret_jwt_key_here

# Admin panel JWT secret (change this!)
ADMIN_JWT_SECRET=your_admin_jwt_secret_here

# Default admin password (change immediately after first login)
ADMIN_PASSWORD=admin123

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:3000

# Server port
PORT=5000

# Email credentials for OTP
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

> **Note:** For Gmail, you need to generate an [App Password](https://support.google.com/accounts/answer/185833) — not your regular password.

Start the backend server:

```bash
npm run dev
# or
node server.js
```

The server will start on `http://localhost:5000`.  
On first run, a default admin account is created:
- **Username:** `admin`
- **Password:** `admin123` (change this immediately!)

---

### 3. Frontend Setup

```bash
# Navigate to the frontend folder
cd client

# Install dependencies
npm install
```

Create a `.env.local` file in the `/client` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

### 4. Open the App

| Page | URL |
|------|-----|
| Main App | `http://localhost:3000` |
| Login | `http://localhost:3000/login` |
| Signup | `http://localhost:3000/signup` |
| Admin Panel | `http://localhost:3000/admin` |

---

## 📁 Project Structure

```
whisper-io/
│
├── server/                     # Express.js backend
│   ├── models/
│   │   ├── User.js             # User schema (username, email, password, OTP)
│   │   └── Thought.js          # Post schema (content, mood, likes, comments)
│   ├── utils/
│   │   └── sendEmail.js        # Nodemailer OTP helper
│   └── server.js               # Main server file (routes, sockets, schemas)
│
├── client/                     # Next.js frontend
│   ├── app/
│   │   ├── page.tsx            # Root redirect
│   │   ├── login/page.tsx      # Login page
│   │   ├── signup/page.tsx     # Signup + OTP verification
│   │   ├── dashboard/page.tsx  # Main app dashboard ← (the big one)
│   │   └── admin/page.tsx      # Admin panel
│   ├── public/                 # Static assets
│   └── tailwind.config.js      # Tailwind configuration
│
└── README.md
```

---

## 🔌 API Reference

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Register new user, sends OTP |
| `POST` | `/api/auth/verify-otp` | Verify OTP to activate account |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `DELETE` | `/api/users/:username` | Delete user account |

### Posts (Thoughts)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/thoughts/recent` | Get posts from last 24h |
| `GET` | `/api/thoughts/popular` | Get top 50 posts by likes |
| `GET` | `/api/thoughts/user/:username` | Get posts by user |
| `GET` | `/api/thoughts/category/:category` | Get posts by category |
| `POST` | `/api/thoughts` | Create a new post |
| `PUT` | `/api/thoughts/:id` | Edit a post |
| `DELETE` | `/api/thoughts/:id` | Delete a post |
| `POST` | `/api/thoughts/:id/like` | Toggle like |
| `POST` | `/api/thoughts/:id/dislike` | Toggle dislike |
| `POST` | `/api/thoughts/:id/comment` | Add a comment |

### Gossip Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/rooms` | Get all rooms |
| `POST` | `/api/rooms` | Create a room |
| `DELETE` | `/api/rooms/:id` | Delete a room |
| `POST` | `/api/rooms/:id/messages` | Send a message to a room |
| `DELETE` | `/api/rooms/:roomId/messages/:messageId` | Delete a room message |

### Private Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/messages/inbox/:username` | Get inbox (list of conversations) |
| `GET` | `/api/messages/:u1/:u2` | Get conversation between two users |
| `POST` | `/api/messages` | Send a private message |

### Collaborations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/collabs` | Get all collab rooms |
| `POST` | `/api/collabs` | Create a collab room |
| `POST` | `/api/collabs/:id/join` | Join a collab room |
| `POST` | `/api/collabs/:id/verify-editor` | Verify editor password |
| `DELETE` | `/api/collabs/:id` | Delete a collab room |

### Admin (🔒 Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/login` | Admin login |
| `GET` | `/api/admin/verify` | Verify admin token |
| `POST` | `/api/admin/change-password` | Change admin password |
| `GET` | `/api/admin/stats` | Dashboard statistics |
| `GET` | `/api/admin/users` | List all users |
| `DELETE` | `/api/admin/users/:username` | Delete user + all data |
| `GET` | `/api/admin/thoughts` | List all posts |
| `DELETE` | `/api/admin/thoughts/:id` | Delete a post |
| `GET` | `/api/admin/rooms` | List all rooms |
| `DELETE` | `/api/admin/rooms/:id` | Delete a room |
| `GET` | `/api/admin/messages` | List recent messages |
| `DELETE` | `/api/admin/messages/:id` | Delete a message |
| `GET` | `/api/admin/collabs` | List all collabs |
| `DELETE` | `/api/admin/collabs/:id` | Delete a collab |

---

## 🔌 Socket.io Events

### Gossip Rooms
| Event | Direction | Description |
|-------|-----------|-------------|
| `join-room` | Client → Server | Join a room's socket channel |
| `leave-room` | Client → Server | Leave a room's socket channel |
| `room-message` | Client → Server | Send a message (via HTTP preferred) |
| `room-message-received` | Server → Client | New message broadcast |
| `room-message-deleted` | Server → Client | Message deletion broadcast |

### Code Editor
| Event | Direction | Description |
|-------|-----------|-------------|
| `join-editor` | Client → Server | Join a collab editor session |
| `code-change` | Client → Server | Broadcast code changes |
| `code-update` | Server → Client | Receive others' code changes |

### Whiteboard
| Event | Direction | Description |
|-------|-----------|-------------|
| `join-whiteboard` | Client → Server | Join whiteboard session |
| `whiteboard-draw` | Client → Server | Send draw action |
| `whiteboard-draw-update` | Server → Client | Receive draw action |
| `whiteboard-clear` | Client → Server | Clear the board |
| `whiteboard-cleared` | Server → Client | Board cleared broadcast |

---

## 🗄️ Data Models

### User
```js
{
  username: String,       // unique
  email: String,          // unique
  password: String,       // bcrypt hashed
  otp: String,            // 6-digit OTP
  otpExpires: Date,       // OTP expiry (10 min)
  isVerified: Boolean,    // email verified?
  createdAt: Date
}
```

### Thought (Post)
```js
{
  username: String,
  content: String,
  mood: String,           // emoji
  category: String,
  images: [String],       // base64 image URLs
  likes: [String],        // array of usernames
  dislikes: [String],     // array of usernames
  comments: [{
    username: String,
    text: String,
    createdAt: Date
  }],
  createdAt: Date
}
```

### Room
```js
{
  name: String,
  description: String,
  admin: String,
  password: String,       // optional
  messages: [{
    id: String,
    username: String,
    text: String,
    media: { url: String, fileType: String },
    createdAt: Date
  }],
  createdAt: Date,        // TTL: auto-deletes after 5h
}
```

### Collab
```js
{
  title: String,
  description: String,
  techStack: String,
  admin: String,
  password: String,       // optional
  code: String,           // live code content
  members: [{
    username: String,
    displayName: String
  }],
  createdAt: Date
}
```

---

## 🔐 Security Notes

- All passwords are hashed with **bcrypt** (12 salt rounds)
- Admin routes are protected with a **separate JWT secret**
- OTP codes expire after **10 minutes**
- Gossip rooms and private messages auto-expire via **MongoDB TTL indexes** (5 hours)
- CORS is restricted to the configured `CLIENT_URL`

> ⚠️ **Before deploying to production:**
> - Change all default secrets in `.env`
> - Change the default admin password immediately after first login
> - Use HTTPS in production
> - Consider rate limiting on auth routes
> - Store images in a proper service (S3, Cloudinary) instead of base64 in MongoDB

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

```bash
# 1. Fork the repo on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/whisper-io.git

# 3. Create a feature branch
git checkout -b feature/your-feature-name

# 4. Make your changes and commit
git add .
git commit -m "feat: add your feature description"

# 5. Push to your fork
git push origin feature/your-feature-name

# 6. Open a Pull Request on GitHub
```

### Commit Convention
```
feat:     new feature
fix:      bug fix
style:    UI/styling changes
refactor: code refactoring
docs:     documentation updates
chore:    config / tooling changes
```

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ and a lot of anonymous secrets

⭐ **Star this repo if you found it useful!** ⭐

</div>
