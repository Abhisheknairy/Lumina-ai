# Visual Summary & Architecture

## User Interface Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHAT INTERFACE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │   SIDEBAR        │  │      CHAT AREA                       │ │
│  │  (Dark Theme)    │  │  ┌────────────────────────────────┐  │ │
│  │                  │  │  │ Bot: Hello! I'm ready to...    │  │ │
│  │ Google Drive RAG │  │  └────────────────────────────────┘  │ │
│  │                  │  │                                       │ │
│  │ User: test_user  │  │  ┌────────────────────────────────┐  │ │
│  │ Folder: abc123   │  │  │ User: What is this about?      │  │ │
│  │                  │  │  └────────────────────────────────┘  │ │
│  │ [Change Folder]  │  │                                       │ │
│  │ [Logout]         │  │  ┌────────────────────────────────┐  │ │
│  │                  │  │  │ Bot: Based on the documents... │  │ │
│  │                  │  │  │ [Doc1.pdf] [Doc2.docx]         │  │ │
│  │                  │  │  └────────────────────────────────┘  │ │
│  │                  │  │                                       │ │
│  │                  │  │  ┌────────────────────────────────┐  │ │
│  │                  │  │  │ [Input field]          [Send]  │  │ │
│  │                  │  │  └────────────────────────────────┘  │ │
│  └──────────────────┘  └──────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Folder Selection Modal

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Select Folder                                         [X]│  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  Google Drive Folder ID                                  │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │ Paste folder ID here                                │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │ [⟳] Connect Folder                                 │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Chat Component                                            │ │
│  │  ├─ State: folderId, messages, input                      │ │
│  │  ├─ Modal: Folder selection                              │ │
│  │  └─ Effects: Auto-scroll, initialize chat                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ↓                                    │
│                    API Calls (HTTP)                              │
│                              │                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  POST /ingest-folder/{user_id}/{folder_id}               │ │
│  │  ├─ Authenticate user                                    │ │
│  │  ├─ Fetch files from Google Drive                        │ │
│  │  ├─ Extract text (PDF, DOCX, Google Docs)               │ │
│  │  ├─ Split into chunks                                   │ │
│  │  └─ Save to ChromaDB                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  POST /chat/{user_id}/{folder_id}                         │ │
│  │  ├─ Retrieve chat history                                │ │
│  │  ├─ Search ChromaDB for context                          │ │
│  │  ├─ Call Gemini LLM                                      │ │
│  │  └─ Return answer + sources                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  GET /list-folders/{user_id}                              │ │
│  │  ├─ Authenticate user                                    │ │
│  │  ├─ Query Google Drive API                               │ │
│  │  ├─ Include shared drives                                │ │
│  │  └─ Return folder list                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ↓                                    │
│                    ┌─────────────────────┐                       │
│                    │  Google Drive API   │                       │
│                    │  ChromaDB (Vector)  │                       │
│                    │  Gemini LLM         │                       │
│                    └─────────────────────┘                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## State Management Flow

```
Initial State (No Folder)
    ↓
showFolderModal = true
    ↓
User enters folder ID
    ↓
handleFolderSubmit()
    ↓
POST /ingest-folder/{user_id}/{folder_id}
    ↓
folderLoading = true (show spinner)
    ↓
Response received
    ↓
folderId = folderInput
showFolderModal = false
messages = [bot greeting]
    ↓
Chat Ready
    ↓
User sends message
    ↓
POST /chat/{user_id}/{folder_id}
    ↓
loading = true (show spinner)
    ↓
Response received
    ↓
messages.push(bot response)
loading = false
    ↓
Chat continues...
```

## Component Hierarchy

```
App
├── Router
│   ├── Route: /
│   │   └── Login
│   ├── Route: /callback
│   │   └── OAuthCallback
│   ├── Route: /dashboard
│   │   └── Dashboard
│   └── Route: /chat
│       └── Chat
│           ├── Sidebar
│           │   ├── User Info
│           │   ├── Folder Info
│           │   ├── Change Folder Button
│           │   └── Logout Button
│           ├── Chat Area
│           │   ├── Messages Container
│           │   │   ├── User Message
│           │   │   ├── Bot Message
│           │   │   │   └── Source Badges
│           │   │   └── Loading Indicator
│           │   └── Input Bar
│           │       ├── Input Field
│           │       └── Send Button
│           └── Modal (Conditional)
│               ├── Close Button
│               ├── Input Field
│               ├── Error Message
│               └── Connect Button
```

## API Endpoint Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    API ENDPOINTS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ GET /login?user_id=test_user_1                                  │
│ └─ Initiates OAuth flow                                         │
│                                                                   │
│ GET /auth/callback?state=...&code=...                           │
│ └─ Handles OAuth callback                                       │
│                                                                   │
│ GET /list-folders/{user_id}                                     │
│ └─ Returns: {"folders": [{"id": "...", "name": "..."}]}        │
│                                                                   │
│ POST /ingest-folder/{user_id}/{folder_id}                       │
│ └─ Returns: {"message": "...", "files_processed": 7, ...}      │
│                                                                   │
│ POST /chat/{user_id}/{folder_id}                                │
│ ├─ Body: {"question": "user input"}                             │
│ └─ Returns: {"question": "...", "answer": "...", ...}          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND                                      │
├─────────────────────────────────────────────────────────────────┤
│ React 19                    - UI Framework                       │
│ Vite                        - Build Tool                         │
│ Tailwind CSS v4             - Styling                            │
│ react-router-dom v7         - Routing                            │
│ lucide-react                - Icons                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND                                       │
├─────────────────────────────────────────────────────────────────┤
│ FastAPI                     - Web Framework                      │
│ Google Auth OAuth           - Authentication                     │
│ Google Drive API            - File Access                        │
│ LangChain                   - RAG Framework                      │
│ ChromaDB                    - Vector Database                    │
│ HuggingFace Embeddings      - Text Embeddings                    │
│ Gemini 2.5 Flash            - LLM                                │
│ PyPDF2                      - PDF Processing                     │
│ python-docx                 - DOCX Processing                    │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
RAG-Application/
├── main.py                          ← Backend (FastAPI)
├── client_secret.json               ← OAuth Credentials
├── chroma_db/                       ← Vector Database
│
└── rag-ui/                          ← Frontend (React)
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx            ← OAuth Login
    │   │   ├── OAuthCallback.jsx    ← OAuth Callback
    │   │   ├── Dashboard.jsx        ← Folder Selection
    │   │   └── Chat.jsx             ← Chat + Modal
    │   ├── App.jsx                  ← Routing
    │   ├── index.css                ← Global Styles
    │   └── main.jsx                 ← Entry Point
    ├── tailwind.config.js           ← Tailwind Config
    ├── postcss.config.js            ← PostCSS Config
    ├── vite.config.js               ← Vite Config
    └── package.json                 ← Dependencies
```

## Styling System

```
┌─────────────────────────────────────────────────────────────────┐
│                    COLOR PALETTE                                │
├─────────────────────────────────────────────────────────────────┤
│ Primary:        bg-blue-600, text-blue-600                      │
│ Background:     bg-gray-50                                      │
│ Cards:          bg-white                                        │
│ Sidebar:        bg-gray-900                                     │
│ Borders:        border-gray-300                                 │
│ Text:           text-gray-900, text-gray-600                    │
│ Hover:          hover:bg-blue-700, hover:bg-gray-700            │
│ Disabled:       disabled:bg-blue-400, disabled:bg-gray-100      │
│ Error:          bg-red-50, text-red-700                         │
│ Success:        bg-green-50, text-green-700                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    SPACING & SIZING                             │
├─────────────────────────────────────────────────────────────────┤
│ Rounded:        rounded-xl, rounded-2xl                         │
│ Padding:        p-4, p-6, p-8                                   │
│ Margin:         space-y-4, space-x-2                            │
│ Shadows:        shadow-sm, shadow-lg, shadow-xl                 │
│ Sidebar Width:  w-64                                            │
│ Modal Max:      max-w-md                                        │
│ Chat Max:       max-w-3xl                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE TARGETS                          │
├─────────────────────────────────────────────────────────────────┤
│ Modal Load:             < 100ms                                 │
│ Folder Ingestion:       < 30 seconds                            │
│ Chat Response:          < 5 seconds                             │
│ Auto-scroll:            Smooth (60fps)                          │
│ Bundle Size:            < 500KB                                 │
│ Memory Usage:           < 100MB                                 │
│ API Response Time:      < 1 second                              │
└─────────────────────────────────────────────────────────────────┘
```

---

**Last Updated**: Today
**Version**: 1.0
**Status**: Production Ready
