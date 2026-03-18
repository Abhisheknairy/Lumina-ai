# Google Drive RAG Application - Complete Setup Guide

## Installation Steps

### 1. Install Dependencies

Run these commands in the `rag-ui` directory:

```bash
npm install
npm install -D tailwindcss postcss autoprefixer
npm install react-router-dom lucide-react
```

### 2. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
rag-ui/
├── src/
│   ├── pages/
│   │   ├── Login.jsx       # Login page with Google OAuth redirect
│   │   ├── Dashboard.jsx   # Folder selection and ingestion
│   │   └── Chat.jsx        # Chat interface with RAG
│   ├── App.jsx             # Main app with routing
│   ├── index.css           # Global styles with Tailwind
│   ├── main.jsx            # React entry point
│   └── assets/
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
├── vite.config.js          # Vite configuration
├── index.html              # HTML entry point
└── package.json
```

## Backend Requirements

Ensure your backend is running on `http://localhost:8000` with these endpoints:

### 1. Login Endpoint
```
GET /login?user_id=test_user_1
```
- Handles OAuth flow
- Redirects back to `/dashboard?user_id=test_user_1`

### 2. Ingest Folder Endpoint
```
POST /ingest-folder/{user_id}/{folder_id}
```
- No request body required
- Response: `{ "message": "...", "files_processed": 7, "total_chunks_saved": 36 }`

### 3. Chat Endpoint
```
POST /chat/{user_id}/{folder_id}
```
- Request body: `{ "question": "user input here" }`
- Response: `{ "question": "...", "answer": "...", "sources_used": ["Doc1.pdf", "Doc2.docx"] }`

## User Flow

### Page 1: Login (`/`)
- Centered card with logo and "Sign in with Google" button
- Redirects to backend OAuth flow
- Backend redirects back to `/dashboard?user_id=test_user_1`

### Page 2: Dashboard (`/dashboard`)
- Extracts `user_id` from URL params (redirects to `/` if missing)
- Form to input Google Drive Folder ID
- Shows loading spinner during ingestion
- Displays success message with file/chunk counts
- Auto-navigates to `/chat?user_id={user_id}&folder_id={folder_id}` after 1.5s

### Page 3: Chat (`/chat`)
- Left sidebar (dark theme) showing user ID and folder ID
- Main chat area with message history
- Sticky input bar at bottom
- Bot greeting on mount
- Messages display with source badges
- Auto-scroll to latest message
- Logout button returns to login

## Design System

- **Background**: Light gray (`bg-gray-50`)
- **Cards**: White (`bg-white`) with subtle shadows
- **Primary Action**: Professional blue (`bg-blue-600`, `text-blue-600`)
- **Borders**: Rounded corners (`rounded-xl`, `rounded-2xl`)
- **Icons**: lucide-react library
- **Loading States**: Animated spinners with disabled button states

## Features Implemented

✅ Clean, modern ChatGPT-like UI
✅ Google OAuth integration
✅ Folder ingestion with progress feedback
✅ Real-time chat with source citations
✅ Responsive design
✅ Loading states and error handling
✅ Auto-scroll chat messages
✅ Session management with sidebar
✅ Logout functionality
✅ Try/catch error handling on all API calls

## Development Notes

- Uses React Router for navigation
- Tailwind CSS for styling
- Lucide React for icons
- Vite for fast development and building
- All components use React hooks (useState, useEffect, useRef)
- URL parameters used for state management across pages
