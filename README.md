<div align="center">

<br />

<img width="48" src="https://img.icons8.com/fluency/96/artificial-intelligence.png" alt="Lumina AI" />

<h1>Lumina AI</h1>

<p><strong>Enterprise RAG platform — chat with your Google Drive, instantly.</strong><br/>
Built for Managed Services teams at iSteer Technologies.</p>

<p>
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Django_Ninja-2.0-092E20?style=flat-square&logo=django&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Gemini_2.0_Flash-LLM-4285F4?style=flat-square&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/ChromaDB-Vector_Store-FF6B35?style=flat-square" />
  <img src="https://img.shields.io/badge/BGE_Large-Embeddings-blueviolet?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat-square" />
</p>

<p>
  <a href="#-features">Features</a> ·
  <a href="#-rag-pipeline">RAG Pipeline</a> ·
  <a href="#-tech-stack">Tech Stack</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-getting-started">Getting Started</a> ·
  <a href="#-api-reference">API Reference</a> ·
  <a href="#-requirements-coverage">Requirements</a>
</p>

<br />

</div>

---

## What is Lumina AI?

Lumina AI is a production-grade **Retrieval-Augmented Generation (RAG)** platform. It connects to your Google Drive, indexes your documents with state-of-the-art embeddings and reranking, and lets anyone on your team ask questions in plain English — returning accurate, fully-cited answers in under 3 seconds.

Built to meet real enterprise requirements: RBAC with custom permission roles, shared team knowledge bases, automated email invitations, full audit logging, a super admin portal, and a live analytics dashboard tracking SLA compliance.

---

## ✨ Features

### 🔍 Core RAG
- **Google Drive integration** — connect any file or folder via the native Google Picker UI or folder browser
- **Multi-format extraction** — Google Docs, Sheets, Slides, PDF (with pdfminer fallback), DOCX (including tables), plain text
- **Streaming responses** — Gemini 2.0 Flash streams tokens in real-time; no waiting for the full response
- **Numbered source citations** — every answer references `[1]`, `[2]`... mapped to the exact Drive document and folder
- **Conversation history** — last 3 Q&A turns injected into the prompt for natural follow-up questions
- **Per-scope vector isolation** — ChromaDB collections scoped per user (`user_{id}`) and per KB (`kb_{id}`) — no data bleed

### 🤝 Collaboration & Knowledge Bases
- **Shared Knowledge Bases** — admins name a KB, attach one or more Drive folders, add members by email
- **Live ingest progress** — real-time streaming card shows crawl phase → per-file processing → embedding phase → done
- **Automated invite emails** — beautiful HTML email sent to each invited member with a one-click accept link
- **Invite link sharing** — unique token-based shareable URL per KB
- **Shared sidebar section** — accepted members see shared KBs pinned below personal sessions

### 🛡️ Access Control (RBAC)
- **3-tier base roles** — `super_admin` / `admin` / `user`
- **Custom `PlatformRole` model** — super admin can create custom roles with granular permissions:
  - `can_view_analytics` · `can_manage_kbs` · `can_manage_users` · `can_manage_roles`
- **Auto role assignment** — `SUPER_ADMIN_EMAILS` list in `models.py`; first login auto-promotes
- **Bearer token guard** — `LuminaAuth` HttpBearer on every protected endpoint; 401 if missing or invalid
- **Canonical user_id** — email-based deduplication prevents duplicate profiles across OAuth sessions

### 👑 Super Admin Portal
Five-tab portal, exclusive to super admin:

| Tab | What it shows |
|---|---|
| **Users** | All users, session count, query count, tickets raised, files accessed, last seen |
| **Roles & Permissions** | Create/edit custom roles with per-permission toggles, assign to users |
| **Platform Analytics** | Cross-user totals, deflection rate, avg response time, 14-day query timeline |
| **Knowledge Bases** | All KBs platform-wide, member counts, session counts, active/inactive status |
| **Audit Log** | Immutable log of every admin action (role changes, KB creation) with actor + timestamp |

### 📊 Analytics Dashboard
- **Deflection rate** — tracks BR-001: reduce L1 tickets by ≥20%
- **Response time SLA** — tracks NFR-001: responses under 3 seconds
- **Sparkline charts** — mini trend lines on each KPI card
- **14-day query timeline** — real per-day bar chart, not mock data
- **Requirements compliance table** — live pass/fail for FR-004, FR-006, FR-007, NFR-001, BR-001

### 🎨 UX & Design
- **Landing page** — animated hero with parallax doc cards, scroll-reveal feature grid, animated counters, testimonials
- **Notion-warm design system** — CSS variable-based light/dark palette, persisted to localStorage
- **Session history** — auto-named from first query, stored in DB, reload-safe
- **Raise ticket** — one-click escalation (Jira/ServiceNow stub) per unanswered query

---

## 🧠 RAG Pipeline

This is the core differentiator — a proper two-stage retrieval pipeline, not naive top-k similarity.

```
User Question
      │
      ▼
┌─────────────────────────────────────────────────────┐
│  Stage 1 — Dense Retrieval                          │
│  Model: BAAI/bge-large-en-v1.5 (768-dim, MTEB SOTA)│
│  Fetch k=8 candidates from ChromaDB                 │
│  Filter: cosine similarity ≥ 0.30                   │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  Stage 2 — Cross-Encoder Reranking                  │
│  Model: ms-marco-MiniLM-L-6-v2                      │
│  Score each (query, passage) pair                   │
│  Select top 4 by reranker score                     │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  RAG Prompt Builder                                 │
│  - Numbered source blocks: [1] folder › filename    │
│  - Last 3 conversation turns (follow-up awareness)  │
│  - Strict grounding: cite or say "not found"        │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
            Gemini 2.0 Flash (streaming)
                          │
                          ▼
         Token-by-token NDJSON stream → Frontend
```

**Chunking:** 512 chars / 64 overlap, sentence-aware separator hierarchy (`\n\n` → `\n` → `. ` → ` `)

**Fallback:** If cross-encoder unavailable → falls back to embedding-score top-4 automatically

---

## 🏗️ Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | React 19, Vite 7, Tailwind CSS v3 | CSS variables for theming |
| **Backend** | Django 6, Django Ninja | FastAPI-style, streaming responses |
| **LLM** | Google Gemini 2.0 Flash | Via LangChain, token streaming |
| **Embeddings** | `BAAI/bge-large-en-v1.5` | 768-dim, MTEB SOTA for retrieval |
| **Reranker** | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Two-stage precision retrieval |
| **Vector Store** | ChromaDB | Persistent, per-scope collections |
| **Auth** | Google OAuth 2.0 + Bearer guard | DB-backed sessions, LRU cache |
| **Drive** | Drive API v3 + Google Picker API | Exponential backoff retry |
| **Email** | Django `send_mail` + HTML template | Invite emails on KB creation |
| **Database** | SQLite (dev) → PostgreSQL-ready | All models with proper FK/indexes |

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          React Frontend                              │
│  Landing · Login · Chat · Analytics · Collaboration · SuperAdmin     │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │  HTTPS  ·  Authorization: Bearer <user_id>
┌────────────────────────────────▼─────────────────────────────────────┐
│                       Django Ninja API  v2.0                         │
│                                                                      │
│  PUBLIC            /login  /auth/callback  /get-token  /kb/join/:t  │
│  PROTECTED         /ingest-item  /chat  /sessions  /analytics        │
│  ADMIN+            /kb/create  /kb/create-and-ingest  /kb/list       │
│  SUPER ADMIN       /admin/users  /admin/roles  /admin/analytics      │
│                    /admin/audit-log  /admin/kb-list                  │
└──────────────────────────────────────────────────────────────────────┘
          │                          │                       │
┌─────────▼──────────┐   ┌───────────▼──────────┐  ┌───────▼────────┐
│     SQLite DB       │   │      ChromaDB         │  │  Google APIs   │
│                     │   │                       │  │                │
│  OAuthSession       │   │  user_{id}            │  │  Drive v3      │
│  UserProfile        │   │  kb_{id}              │  │  People v1     │
│  PlatformRole       │   │                       │  │  Picker        │
│  ChatSession        │   │  BAAI/bge-large-en    │  │  Gmail SMTP    │
│  InteractionLog     │   │  768-dim vectors      │  │                │
│  SourceDocument     │   │  LRU cache (50 cols)  │  └────────────────┘
│  KnowledgeBase      │   └───────────────────────┘
│  KBMembership       │
│  AdminAuditLog      │
└─────────────────────┘
```

---

## 📁 Project Structure

```
Lumina-ai/
├── core_backend/
│   ├── chatbot/
│   │   ├── api.py              # All endpoints — Django Ninja, streaming, RAG pipeline
│   │   ├── models.py           # OAuthSession, UserProfile, PlatformRole, ChatSession,
│   │   │                       # InteractionLog, SourceDocument, KnowledgeBase,
│   │   │                       # KBMembership, AdminAuditLog
│   │   ├── admin.py            # Django Admin — rich list views, inline interactions
│   │   └── migrations/
│   ├── core_backend/
│   │   └── settings.py         # All config via env vars
│   └── client_secret.json      # Google OAuth credentials (gitignored)
│
└── rag-ui/
    └── src/
        ├── pages/
        │   ├── Landing.jsx      # Marketing page — animated hero, features, testimonials
        │   ├── Login.jsx        # Google OAuth entry point
        │   ├── Chat.jsx         # Main chat + Drive Picker + session history
        │   ├── Analytics.jsx    # KPI dashboard with sparklines + requirements table
        │   ├── Collaboration.jsx # KB management with live ingest progress stream
        │   └── SuperAdmin.jsx   # 5-tab admin portal — users, roles, analytics, KBs, audit
        ├── components/
        │   ├── AppLayout.jsx    # Shell — sidebar (personal + shared sessions) + Navbar
        │   ├── Navbar.jsx       # Role-aware tabs, dark mode toggle, profile dropdown
        │   ├── DrivePicker.jsx  # Gemini-style Drive Picker (tabs, grid/list, thumbnails)
        │   └── FolderPicker.jsx # Multi-folder selector for KB creation
        ├── context/
        │   └── ThemeContext.jsx # Dark/light mode — html.dark toggle + localStorage
        └── utils/
            └── api.js           # authFetch / authFetchStream — Bearer token injector
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+, Node.js 18+
- Google Cloud project with **Drive API**, **People API**, **Gmail API** enabled
- Gemini API key from [Google AI Studio](https://aistudio.google.com)

### 1. Clone

```bash
git clone https://github.com/Abhisheknairy/Lumina-ai.git
cd Lumina-ai
```

### 2. Backend

```bash
cd core_backend

python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

pip install -r requirements.txt

# Migrations
python manage.py migrate

# Start
python manage.py runserver
```

### 3. Frontend

```bash
cd rag-ui
npm install
npm run dev
```

### 4. Google Cloud Setup

1. [Create a project](https://console.cloud.google.com) and enable: **Drive API**, **People API**, **Generative Language API**
2. Create **OAuth 2.0 credentials** → Web application
3. Add redirect URI: `http://localhost:8000/api/auth/callback`
4. Download `client_secret.json` → place in `core_backend/`
5. Create an **API key** → restrict to your backend server IP

### 5. Environment Variables

**`core_backend/.env`**
```env
DJANGO_SECRET_KEY=your-long-secret-key
DJANGO_DEBUG=True

# Google
GOOGLE_API_KEY=your-gemini-api-key
OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/callback

# CORS
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Email (for KB invite emails)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=Lumina AI <your-email@gmail.com>
```

**`rag-ui/.env`**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_API_KEY=your-google-api-key
```

---

## 📡 API Reference

### Public (no auth)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/login` | Start Google OAuth flow |
| `GET` | `/api/auth/callback` | OAuth callback — creates session, assigns role |
| `GET` | `/api/get-token/{user_id}` | Returns access token + display name + email + role |
| `GET` | `/api/kb/accept-invite/{token}` | Accept KB invitation via link |

### Protected (`Authorization: Bearer <user_id>`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ingest-item/{user_id}/{item_id}` | Stream-ingest a Drive file or folder |
| `POST` | `/api/chat/{user_id}/{folder_id}` | Streaming RAG chat with two-stage retrieval |
| `GET` | `/api/sessions/{user_id}` | Returns `{personal: [...], shared: [...]}` |
| `GET` | `/api/sessions/{user_id}/{session_id}/messages` | Load full session history |
| `DELETE` | `/api/sessions/{user_id}/{session_id}` | Delete a session |
| `POST` | `/api/raise-ticket/{user_id}` | Flag an interaction as escalated |
| `GET` | `/api/analytics/{user_id}` | Personal KPI data + 14-day timeline |

### Admin+ (`role: admin or super_admin`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/kb/create` | Create a Knowledge Base |
| `POST` | `/api/kb/create-and-ingest/{user_id}` | Create KB + stream multi-folder ingestion |
| `GET` | `/api/kb/list` | KBs the current user is a member of |
| `POST` | `/api/kb/{kb_id}/add-member` | Add a member by email |
| `DELETE` | `/api/kb/{kb_id}` | Deactivate a KB |

### Super Admin only
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/users` | All users with stats |
| `POST` | `/api/admin/update-role` | Promote / demote a user |
| `GET` | `/api/admin/roles` | All custom `PlatformRole` definitions |
| `POST` | `/api/admin/roles` | Create a custom role |
| `PUT` | `/api/admin/roles/{role_id}` | Update a custom role's permissions |
| `GET` | `/api/admin/analytics` | Platform-wide KPIs |
| `GET` | `/api/admin/audit-log` | Immutable admin action log |
| `GET` | `/api/admin/kb-list` | All KBs across the platform |

---

## 📋 Requirements Coverage

| ID | Category | Requirement | Implementation | Status |
|---|---|---|---|---|
| FR-001 | Functional | Web interface | React 19 SPA, mobile-responsive | ✅ |
| FR-002 | Functional | Google Drive as knowledge source | Drive API v3 + Google Picker | ✅ |
| FR-003 | Functional | Natural language queries | Gemini 2.0 Flash + two-stage RAG | ✅ |
| FR-004 | Functional | Direct link to source document | `webViewLink` stored per chunk, cited in response | ✅ |
| FR-005 | Functional | PDF, DOCX, Google Docs support | pdfminer fallback, DOCX table extraction | ✅ |
| FR-006 | Functional | Raise ticket on unresolved query | Per-interaction escalation button + endpoint | ✅ |
| FR-007 | Functional | Log all interactions | `InteractionLog` model, every Q&A persisted | ✅ |
| NFR-001 | Performance | Response time < 3 seconds | Tracked in ms, displayed + pass/fail in Analytics | ✅ |
| NFR-002 | Security | OAuth 2.0 | Google OAuth + DB-backed sessions + Bearer guard | ✅ |
| NFR-003 | Security | RBAC for authenticated users | 3-tier roles + custom `PlatformRole` + permissions | ✅ |
| NFR-004 | Maintainability | Admin performance dashboard | Django Admin + Analytics page + Super Admin portal | ✅ |
| NFR-005 | Usability | Responsive design | Collapsible sidebar, mobile-friendly | ✅ |
| BR-001 | Business | Reduce L1 tickets ≥20% | Deflection rate tracked, target pass/fail shown | ✅ |
| BR-002 | Business | Managed Services branding | Lumina AI / iSteer branding throughout | ✅ |

---

## 🔐 Role System

```
super_admin  ──▶  Full access — user mgmt, role editor, platform analytics, audit log
     │
     └── promotes/demotes ──▶  admin  ──▶  Create & manage KBs, invite members
                                  │
                                  └── invites ──▶  user  ──▶  Chat, personal sessions,
                                                               accepted shared KBs
```

Super admin emails configured in `models.py`:
```python
SUPER_ADMIN_EMAILS = ["n.abhishek@isteer.com"]
```

Custom roles (created in the Admin portal) can grant any combination of:
`can_view_analytics` · `can_manage_kbs` · `can_manage_users` · `can_manage_roles`

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch — `git checkout -b feature/your-feature`
3. Commit — `git commit -m 'feat: add your feature'`
4. Push — `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built by **Abhishek N Nairy** · [iSteer Technologies](https://isteer.com)

<sub>Gemini 2.0 Flash · BAAI/bge-large-en-v1.5 · ChromaDB · Django Ninja · React 19</sub>

</div>
