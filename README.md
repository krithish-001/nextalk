# ⚡ NexTalk — Production-Ready Real-Time Chat App

A full-stack real-time chat application built with React, Node.js, MongoDB, Socket.io, and Docker.

---

## 🏗 Tech Stack

| Layer        | Technology                              |
|--------------|-----------------------------------------|
| Frontend     | React 18, Tailwind CSS, Zustand         |
| Backend      | Node.js, Express.js (MVC pattern)       |
| Database     | MongoDB (Mongoose ODM)                  |
| Real-time    | Socket.io (WebSocket + polling fallback)|
| Auth         | JWT (JSON Web Tokens) + bcrypt          |
| Cache        | Redis (in-memory fallback if unavailable)|
| File uploads | Cloudinary                              |
| Deployment   | Docker + Docker Compose                 |
| CI/CD        | GitHub Actions                          |

---

## 📁 Project Structure

```
chatapp/
├── backend/
│   ├── src/
│   │   ├── config/          # DB & Redis connections
│   │   ├── controllers/     # Business logic (MVC)
│   │   ├── middleware/       # Auth, rate limiter, upload
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express route definitions
│   │   ├── socket/          # Socket.io event handlers
│   │   ├── utils/           # Logger, helpers
│   │   └── server.js        # App entry point
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/        # ProtectedRoute
│   │   │   ├── chat/        # Sidebar, ChatWindow, MessageBubble, MessageInput
│   │   │   └── ui/          # Avatar, shared UI
│   │   ├── hooks/           # useSocket (global socket listener)
│   │   ├── pages/           # LoginPage, RegisterPage, ChatPage
│   │   ├── store/           # Zustand stores (auth + chat)
│   │   ├── utils/           # api.js, socket.js, helpers.js
│   │   ├── App.jsx
│   │   └── index.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── .github/workflows/       # CI/CD pipeline
├── docker-compose.yml       # Production
├── docker-compose.dev.yml   # Development
└── README.md
```

---

## 🚀 Quick Start

### Option A — Docker (Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/your-username/chatapp.git
cd chatapp

# 2. Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# 3. Start all services
docker compose up -d

# App is now running at http://localhost
```

### Option B — Local Development

```bash
# 1. Start MongoDB & Redis (or use Docker just for these)
docker compose -f docker-compose.dev.yml up mongo redis -d

# 2. Backend
cd backend
cp .env.example .env   # fill in values
npm install
npm run dev            # runs on http://localhost:5000

# 3. Frontend (new terminal)
cd frontend
npm install
npm start              # runs on http://localhost:3000
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint            | Description          | Access  |
|--------|---------------------|----------------------|---------|
| POST   | /api/auth/register  | Register new user    | Public  |
| POST   | /api/auth/login     | Login & get JWT      | Public  |
| POST   | /api/auth/logout    | Logout               | Private |
| GET    | /api/auth/me        | Get current user     | Private |

### Users
| Method | Endpoint             | Description             | Access  |
|--------|----------------------|-------------------------|---------|
| GET    | /api/users           | List/search users       | Private |
| GET    | /api/users/:id       | Get user by ID          | Private |
| PUT    | /api/users/profile   | Update profile + avatar | Private |

### Conversations
| Method | Endpoint                         | Description                | Access  |
|--------|----------------------------------|----------------------------|---------|
| POST   | /api/conversations               | Create/get 1-on-1 chat     | Private |
| GET    | /api/conversations               | Get all my conversations   | Private |
| GET    | /api/conversations/:id/messages  | Paginated messages         | Private |
| PUT    | /api/conversations/:id/read      | Mark as read               | Private |

### Messages
| Method | Endpoint           | Description              | Access  |
|--------|--------------------|--------------------------|---------|
| POST   | /api/messages      | Send message + file      | Private |
| DELETE | /api/messages/:id  | Soft-delete message      | Private |

---

## ⚡ Socket.io Events

### Client → Server
| Event            | Payload                                    | Description             |
|------------------|--------------------------------------------|-------------------------|
| `message:send`   | `{ conversationId, content, tempId }`      | Send a text message     |
| `message:read`   | `{ conversationId }`                       | Mark messages as read   |
| `message:delete` | `{ messageId, conversationId }`            | Delete a message        |
| `typing:start`   | `{ conversationId }`                       | Start typing indicator  |
| `typing:stop`    | `{ conversationId }`                       | Stop typing indicator   |
| `conversation:join` | `{ conversationId }`                    | Join a room             |

### Server → Client
| Event                 | Payload                                 | Description                  |
|-----------------------|-----------------------------------------|------------------------------|
| `message:new`         | Full message object                     | New message received         |
| `message:deleted`     | `{ messageId, conversationId }`         | Message was deleted          |
| `message:read`        | `{ conversationId, readBy, readAt }`    | Read receipt                 |
| `conversation:updated`| `{ conversationId, lastMessage, ... }`  | Sidebar update               |
| `typing:start`        | `{ userId, username, conversationId }`  | User started typing          |
| `typing:stop`         | `{ userId, conversationId }`            | User stopped typing          |
| `user:online`         | `{ userId }`                            | User came online             |
| `user:offline`        | `{ userId, lastSeen }`                  | User went offline            |

---

## 🗄 MongoDB Schemas

### User
```
_id, username (unique), email (unique), password (hashed),
avatar, avatarPublicId, bio, isOnline, lastSeen, timestamps
```

### Conversation
```
_id, participants: [UserId], isGroup, groupName, groupAvatar,
groupAdmin, lastMessage: MessageId, unreadCounts: Map<UserId, Number>,
timestamps
```

### Message
```
_id, conversationId, sender: UserId, content, attachment: { url, type, name, size },
messageType, readBy: [{ user, readAt }], isDeleted, deletedAt, replyTo, timestamps
```

---

## 🛡 Security Features

- Password hashing with **bcrypt** (12 salt rounds)
- JWT token expiry (configurable, default 7d)
- **Helmet.js** HTTP security headers
- **CORS** with allowlist
- Rate limiting: 100 req/15min (API), 10 req/15min (auth), 5 msg/sec (messages)
- Non-root Docker user
- Input validation with **express-validator**
- Soft deletes (no data is permanently deleted)

---

## ☁️ Cloudinary Setup (for file uploads)

1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. Copy your Cloud Name, API Key, and API Secret
3. Add them to `backend/.env`

File uploads will silently degrade to text-only if not configured.

---

## 🔧 Environment Variables

```env
# backend/.env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://mongo:27017/chatapp
JWT_SECRET=your_super_secret_key_at_least_32_chars
JWT_EXPIRE=7d
REDIS_URL=redis://redis:6379
CLIENT_URL=http://localhost
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 📦 Production Deployment Checklist

- [ ] Set a strong `JWT_SECRET` (32+ random chars)
- [ ] Set `NODE_ENV=production`
- [ ] Configure Cloudinary credentials
- [ ] Set `CLIENT_URL` to your domain
- [ ] Use HTTPS (add SSL termination at load balancer/nginx)
- [ ] Set up GitHub Secrets for CI/CD deploy
- [ ] Monitor logs: `docker compose logs -f backend`

---

## 📄 License

MIT
