<div align="center">

<img src="https://img.shields.io/badge/Lumina_AI-Enterprise_RAG-1a1a18?style=for-the-badge&logo=google&logoColor=white" alt="Lumina AI" />

<h1>Lumina AI</h1>
<p><strong>Enterprise RAG platform — chat with your Google Drive documents, instantly.</strong></p>

<p>
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Django-6.0-092E20?style=flat-square&logo=django&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Gemini_2.0_Flash-AI-4285F4?style=flat-square&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/ChromaDB-Vector_Store-FF6B35?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

<p>
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-requirements-coverage">Requirements</a> •
  <a href="#-screenshots">Screenshots</a>
</p>

</div>

---

## What is Lumina AI?

Lumina AI is a production-grade **Retrieval-Augmented Generation (RAG)** platform built for Managed Services teams. It connects to your Google Drive, indexes your documents, and lets you ask questions in plain English — returning accurate, cited answers in under 3 seconds.

Built to meet enterprise requirements: role-based access control, full interaction logging, ticket escalation, collaborative knowledge bases, and a super admin portal.

---

## ✨ Features

### Core RAG
- 🔗 **Google Drive integration** — connect any file or folder via the native Google Picker UI
- 📄 **Multi-format support** — PDF, DOCX, Google Docs, Sheets, Slides, plain text
- ⚡ **Streaming responses** — token-by-token answer streaming via Gemini 2.0 Flash
- 📎 **Clickable source citations** — every answer links back to the exact Drive document
- 🎯 **Per-user vector isolation** — ChromaDB collections scoped per user, no data bleed

### Collaboration
- 🤝 **Shared Knowledge Bases** — admins create named KBs, link a Drive folder, invite team members
- 🔗 **Invite links** — shareable URLs to onboard members; accepted on first login
- 📂 **Shared sidebar section** — members see shared KBs alongside personal chats

### Access Control (RBAC)
- 🛡️ **3-tier roles** — `super_admin` / `admin` / `user`
- 🔐 **Auto role assignment** — super admin email auto-promoted on first login
- 🔑 **Bearer token auth** — all protected endpoints require `Authorization: Bearer <user_id>`
- 📜 **Immutable audit log** — every role change, KB creation, and admin action recorded

### Super Admin Portal
- 👥 **User management** — view all users, session counts, query counts, files accessed
- 🎭 **Promote/demote** — make any user an admin or revert to user in one click
- 📊 **Platform analytics** — cross-user query totals, deflection rate, SLA compliance
- 🗂️ **KB oversight** — view all knowledge bases across the platform
- 📋 **Audit trail** — full log of every admin action with timestamps

### Analytics Dashboard
- 📈 **Deflection rate** — tracks BR-001: reduce L1 tickets by ≥20%
- ⏱️ **Response time SLA** — tracks NFR-001: all responses under 3 seconds
- 📅 **14-day timeline** — real per-day query and ticket data (no mock data)
- ✅ **Requirements compliance table** — live pass/fail for FR-004, FR-006, FR-007, NFR-001, BR-001

### UX
- 🌙 **Dark / light mode** — Notion-inspired warm palette, persisted to localStorage
- 💬 **Dynamic session history** — auto-named from first query, stored in DB, loadable from sidebar
- 🖥️ **Gemini-style Drive Picker** — tabbed Recent/My Drive/Shared/Starred, grid/list, thumbnail preview, breadcrumb navigation
- 🎫 **Raise ticket** — one-click escalation to Jira/ServiceNow (stub ready to configure)

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 7, Tailwind CSS v3 |
| **Backend** | Django 6, Django Ninja (FastAPI-style) |
| **AI / LLM** | Google Gemini 2.0 Flash via LangChain |
| **Embeddings** | `paraphrase-MiniLM-L3-v2` (HuggingFace) |
| **Vector Store** | ChromaDB (local persist) |
| **Auth** | Google OAuth 2.0 + Bearer token guard |
| **Database** | SQLite (dev) → PostgreSQL ready |
| **Drive** | Google Drive API v3 + Google Picker API |

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│  Login → OAuth → Chat → Analytics → Collaboration → Admin   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS  Authorization: Bearer <id>
┌──────────────────────────▼──────────────────────────────────┐
│                   Django Ninja API                           │
│                                                              │
│  /login  /auth/callback  /get-token   ← Public              │
│  /ingest-item  /chat  /sessions       ← Protected           │
│  /kb/create  /kb/list  /kb/join       ← Admin+              │
│  /admin/users  /admin/analytics       ← Super admin only    │
└────────┬───────────────────┬──────────────────────────────-─┘
         │                   │
┌────────▼──────┐   ┌────────▼──────────────────────────────┐
│   SQLite DB   │   │           ChromaDB                     │
│               │   │  collection per user: user_{id}        │
│ OAuthSession  │   │  collection per KB:   kb_{id}          │
│ UserProfile   │   │                                        │
│ ChatSession   │   │  Embedding: paraphrase-MiniLM-L3-v2   │
│ InteractionLog│   │  LLM: Gemini 2.0 Flash (streaming)    │
│ KnowledgeBase │   └───────────────────────────────────────┘
│ KBMembership  │
│ AdminAuditLog │
└───────────────┘
```

---

## 📋 Requirements Coverage

| ID | Category | Requirement | Status |
|---|---|---|---|
| FR-001 | Functional | Web interface | ✅ React SPA |
| FR-002 | Functional | Google Drive as knowledge source | ✅ Drive API + Picker |
| FR-003 | Functional | Natural language queries | ✅ Gemini 2.0 Flash |
| FR-004 | Functional | Direct link to source document | ✅ `webViewLink` stored + shown |
| FR-005 | Functional | PDF, DOCX, Google Docs support | ✅ All formats |
| FR-006 | Functional | Raise ticket if unresolved | ✅ Button + endpoint (Jira/ServiceNow stub) |
| FR-007 | Functional | Log all interactions | ✅ `InteractionLog` model |
| NFR-001 | Performance | Response time < 3 seconds | ✅ Tracked + displayed in Analytics |
| NFR-002 | Security | OAuth 2.0 | ✅ Google OAuth + Bearer guard |
| NFR-003 | Security | RBAC for authenticated users | ✅ 3-tier role system |
| NFR-004 | Maintainability | Admin performance dashboard | ✅ Django Admin + Analytics page |
| NFR-005 | Usability | Responsive design | ✅ Mobile-friendly sidebar |
| BR-001 | Business | Reduce L1 tickets ≥20% | ✅ Tracked — deflection rate dashboard |
| BR-002 | Business | Managed Services branding | ✅ Lumina AI / iSteer branding |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Google Cloud project with Drive API + People API enabled
- Gemini API key

### 1. Clone

```bash
git clone https://github.com/Abhisheknairy/Lumina-ai.git
cd Lumina-ai
```

### 2. Backend setup

```bash
cd core_backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Fill in: DJANGO_SECRET_KEY, GOOGLE_API_KEY, DJANGO_DEBUG=True
```

```bash
# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```

### 3. Frontend setup

```bash
cd rag-ui

npm install

# Create .env file
cp .env.example .env
# Fill in: VITE_API_BASE_URL=http://localhost:8000
#          VITE_GOOGLE_API_KEY=your_google_api_key

npm run dev
```

### 4. Google Cloud setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable: **Drive API**, **People API**, **Generative Language API**
3. Create OAuth 2.0 credentials → Web application
4. Add authorized redirect URI: `http://localhost:8000/api/auth/callback`
5. Download `client_secret.json` → place in `core_backend/`
6. In API key settings: remove HTTP referrer restrictions (backend key)

### 5. Environment variables

**`core_backend/.env`**
```env
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
GOOGLE_API_KEY=your-gemini-api-key
OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/callback
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

**`rag-ui/.env`**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_API_KEY=your-google-api-key
```

---

## 📁 Project Structure

```
Lumina-ai/
├── core_backend/               # Django backend
│   ├── chatbot/
│   │   ├── api.py              # All API endpoints (Django Ninja)
│   │   ├── models.py           # OAuthSession, UserProfile, ChatSession,
│   │   │                       # InteractionLog, KnowledgeBase, KBMembership,
│   │   │                       # AdminAuditLog, SourceDocument
│   │   ├── admin.py            # Django Admin — all models registered
│   │   └── migrations/
│   ├── core_backend/
│   │   └── settings.py         # Config via env vars
│   └── client_secret.json      # Google OAuth credentials (gitignored)
│
└── rag-ui/                     # React frontend
    └── src/
        ├── pages/
        │   ├── Login.jsx        # Landing page with Google OAuth
        │   ├── Chat.jsx         # Main chat interface + Drive Picker
        │   ├── Analytics.jsx    # KPI dashboard
        │   ├── Collaboration.jsx # Knowledge base management
        │   └── SuperAdmin.jsx   # Super admin portal
        ├── components/
        │   ├── AppLayout.jsx    # Shared layout with sidebar
        │   ├── Navbar.jsx       # Top nav with role-aware tabs
        │   ├── DrivePicker.jsx  # Google Drive file picker
        │   └── FolderPicker.jsx # Folder selection component
        ├── context/
        │   └── ThemeContext.jsx # Dark/light mode
        └── utils/
            └── api.js           # authFetch — Bearer token injector
```

---

## 🔐 Role System

| Role | Access |
|---|---|
| `user` | Chat, personal sessions, shared KBs they're invited to |
| `admin` | All of above + create/manage Knowledge Bases, invite members |
| `super_admin` | All of above + user management, promote/demote, platform analytics, audit log |

Super admin is auto-assigned on first login based on email. Configured in `models.py`:

```python
SUPER_ADMIN_EMAIL = "n.abhishek@isteer.com"
```

---

## 🤝 Contributing

This project is currently maintained by the iSteer Technologies team. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ by **Abhishek N Nairy** · [iSteer Technologies](https://isteer.com)

<sub>Powered by Google Gemini 2.0 Flash · ChromaDB · Django · React</sub>

</div>
