# Google Drive RAG Application - Complete Setup & Documentation

## ✅ Installation Complete

All dependencies have been installed. Your project is ready to run!

### Quick Start

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
rag-ui/
├── src/
│   ├── pages/
│   │   ├── Login.jsx       # OAuth login page
│   │   ├── Dashboard.jsx   # Folder selection & ingestion
│   │   └── Chat.jsx        # Chat interface with RAG
│   ├── App.jsx             # Main routing setup
│   ├── index.css           # Global Tailwind styles
│   ├── main.jsx            # React entry point
│   └── assets/
├── tailwind.config.js      # Tailwind configuration
├── postcss.config.js       # PostCSS with Tailwind v4
├── vite.config.js          # Vite configuration
├── index.html              # HTML entry point
└── package.json
```

## 🔧 Tech Stack

- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS v4 with @tailwindcss/postcss
- **Routing**: react-router-dom v7
- **Icons**: lucide-react
- **Build Tool**: Vite

## 🎨 Design System

| Element | Value |
|---------|-------|
| Background | `bg-gray-50` (light gray) |
| Cards | `bg-white` with subtle shadows |
| Primary Action | `bg-blue-600` / `text-blue-600` |
| Borders | `rounded-xl` or `rounded-2xl` |
| Sidebar | `bg-gray-900` (dark theme) |
| Icons | lucide-react library |

## 📱 3-Page User Flow

### Page 1: Login (`/`)
- Centered card with logo and "Sign in with Google" button
- Redirects to: `http://localhost:8000/api/list-drive-items/?user_id=test_user_1`
- Backend handles OAuth and redirects to `/dashboard?user_id=test_user_1`

### Page 2: Dashboard (`/dashboard`)
- Extracts `user_id` from URL params (redirects to `/` if missing)
- Form to input Google Drive Folder ID
- Loading spinner during ingestion
- Success message with file/chunk counts
- Auto-navigates to `/chat?user_id={user_id}&folder_id={folder_id}` after 1.5s

### Page 3: Chat (`/chat`)
- Left sidebar (dark) with user ID and folder ID
- Main chat area with message history
- Sticky input bar at bottom
- Bot greeting on mount
- Source badges below bot messages
- Auto-scroll to latest message
- Logout button returns to login

## 🔌 Backend API Requirements

Ensure your backend runs on `http://localhost:8000` with these endpoints:

### 1. Login
```
GET /login?user_id=test_user_1
```
- Handles OAuth flow
- Redirects to `/dashboard?user_id=test_user_1`

### 2. Ingest Folder
```
POST /ingest-folder/{user_id}/{folder_id}
```
- No request body required
- Response:
```json
{
  "message": "...",
  "files_processed": 7,
  "total_chunks_saved": 36
}
```

### 3. Chat
```
POST /chat/{user_id}/{folder_id}
```
- Request body:
```json
{
  "question": "user input here"
}
```
- Response:
```json
{
  "question": "...",
  "answer": "...",
  "sources_used": ["Doc1.pdf", "Doc2.docx"]
}
```

## 📝 File Details

### `src/App.jsx`
Main routing component with React Router setup for 3 pages.

### `src/index.css`
Global styles using Tailwind v4 `@import "tailwindcss"` syntax.

### `tailwind.config.js`
Tailwind configuration with content paths for JSX files.

### `postcss.config.js`
PostCSS configuration using `@tailwindcss/postcss` plugin (Tailwind v4).

### `src/pages/Login.jsx`
- Centered card design
- Google OAuth redirect button
- Uses LogIn icon from lucide-react

### `src/pages/Dashboard.jsx`
- Form with folder ID input
- Loading state with spinner
- Error and success messages
- Auto-navigation after success
- Try/catch error handling

### `src/pages/Chat.jsx`
- Dark sidebar with session info
- Message history with auto-scroll
- User messages (blue, right-aligned)
- Bot messages (white, left-aligned)
- Source badges for citations
- Sticky input bar with send button
- Logout functionality

## ✨ Features Implemented

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
✅ Disabled button states during loading
✅ Input validation

## 🚀 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm lint
```

## 🔍 Troubleshooting

### Tailwind styles not loading?
- Ensure `@tailwindcss/postcss` is installed
- Check `postcss.config.js` uses `@tailwindcss/postcss` plugin
- Verify `src/index.css` has `@import "tailwindcss"`

### Backend connection issues?
- Ensure backend is running on `http://localhost:8000`
- Check CORS settings on backend
- Verify API endpoints match the specifications

### Navigation not working?
- Ensure `react-router-dom` is installed
- Check URL parameters are being passed correctly
- Verify redirect logic in each page component

## 📦 Dependencies

All dependencies are already installed:
- react@^19.2.0
- react-dom@^19.2.0
- react-router-dom@^7.13.1
- lucide-react@^0.577.0
- tailwindcss@^4.2.1
- @tailwindcss/postcss@^4.2.1
- vite@^7.3.1

## 🎯 Next Steps

1. Ensure backend is running on `http://localhost:8000`
2. Run `npm run dev` to start the development server
3. Navigate to `http://localhost:5173`
4. Test the complete user flow:
   - Login → Dashboard → Chat

Enjoy your production-grade RAG application! 🚀
