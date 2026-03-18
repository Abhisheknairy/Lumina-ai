# Login Redirect Troubleshooting Guide

## The Issue
After clicking "Sign in with Google", the app should redirect to the Dashboard page, but it's not happening.

## Root Causes & Solutions

### Solution 1: Backend Redirect Configuration (RECOMMENDED)

Your backend needs to redirect to the callback route. Update your backend's `/login` endpoint to:

```python
# Example: Python/Flask
@app.route('/login')
def login():
    user_id = request.args.get('user_id', 'test_user_1')
    # ... handle OAuth ...
    # Redirect back to frontend callback
    return redirect(f'http://localhost:5173/callback?user_id={user_id}')
```

Or in Node.js/Express:
```javascript
app.get('/login', (req, res) => {
  const userId = req.query.user_id || 'test_user_1';
  // ... handle OAuth ...
  res.redirect(`http://localhost:5173/callback?user_id=${userId}`);
});
```

### Solution 2: Direct Navigation (For Testing)

If you want to test without backend OAuth, modify `src/pages/Login.jsx`:

```javascript
const handleGoogleLogin = () => {
  // For testing: navigate directly to dashboard
  navigate('/dashboard?user_id=test_user_1');
};
```

Then import `useNavigate`:
```javascript
import { useNavigate } from 'react-router-dom';
```

### Solution 3: Check CORS Settings

If backend is on a different port, ensure CORS is enabled:

```python
# Flask example
from flask_cors import CORS
CORS(app)
```

```javascript
// Express example
const cors = require('cors');
app.use(cors());
```

## Flow Explanation

### Current Flow:
1. User clicks "Sign in with Google" on Login page (`/`)
2. Frontend redirects to `http://localhost:8000/login?user_id=test_user_1`
3. Backend handles OAuth and should redirect to `http://localhost:5173/callback?user_id=test_user_1`
4. Frontend's OAuthCallback component (`/callback`) receives the `user_id`
5. OAuthCallback redirects to `/dashboard?user_id=test_user_1`
6. Dashboard page loads with the user_id
7. User enters folder ID and submits
8. Dashboard redirects to `/chat?user_id={user_id}&folder_id={folder_id}`

### Files Involved:
- `src/pages/Login.jsx` - Initiates OAuth
- `src/pages/OAuthCallback.jsx` - Handles backend redirect
- `src/pages/Dashboard.jsx` - Folder selection
- `src/pages/Chat.jsx` - Chat interface
- `src/App.jsx` - Routes all pages

## Testing the Flow

### Step 1: Verify Backend is Running
```bash
curl http://localhost:8000/login?user_id=test_user_1
```

### Step 2: Check Frontend is Running
```bash
npm run dev
# Should be at http://localhost:5173
```

### Step 3: Test Login
1. Go to `http://localhost:5173`
2. Click "Sign in with Google"
3. Check browser console for any errors
4. Check network tab to see if backend is being called

### Step 4: Manual Test
If backend redirect isn't working, manually test by going to:
```
http://localhost:5173/callback?user_id=test_user_1
```

This should redirect you to the Dashboard page.

## Common Issues

| Issue | Solution |
|-------|----------|
| Blank page after login | Backend not redirecting to `/callback` |
| CORS error in console | Enable CORS on backend |
| 404 on backend | Backend `/login` endpoint doesn't exist |
| Stuck on login page | Backend redirect URL is wrong |
| Dashboard shows but no user_id | URL params not being passed correctly |

## Backend Redirect URL Format

Make sure your backend redirects to:
```
http://localhost:5173/callback?user_id=<user_id>
```

NOT to:
- `http://localhost:5173/dashboard` (skips callback)
- `http://localhost:5173/chat` (missing folder_id)
- `http://localhost:8000/callback` (wrong domain)

## Quick Fix for Testing

If you want to skip backend OAuth for now, edit `src/pages/Login.jsx`:

```javascript
import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    // Skip backend, go directly to dashboard
    navigate('/dashboard?user_id=test_user_1');
  };

  // ... rest of component
}
```

This will let you test the Dashboard → Chat flow immediately.
