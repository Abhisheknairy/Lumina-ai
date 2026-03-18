# Google Drive RAG - Folder ID Modal Implementation

## Overview
The Chat interface now includes a modal for entering Google Drive Folder IDs. Users can connect folders directly from the chat page without needing to go through the Dashboard.

## Backend Changes

### Updated Endpoint: `/list-folders/{user_id}`
Located in `main.py`, this endpoint now includes critical parameters for fetching shared drives:

```python
@app.get("/list-folders/{user_id}")
def list_folders(user_id: str):
    """Fetches a list of all folders in the user's Google Drive, including shared drives."""
    if user_id not in user_sessions:
        raise HTTPException(status_code=401, detail="User not authenticated")
        
    from google.oauth2.credentials import Credentials
    creds = Credentials(**user_sessions[user_id])
    service = build('drive', 'v3', credentials=creds)
    
    try:
        # CRITICAL: Include all parameters to fetch personal AND shared folders
        query = "mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = service.files().list(
            q=query,
            includeItemsFromAllDrives=True,
            supportsAllDrives=True,
            fields="files(id, name)",
            orderBy="name",
            pageSize=100
        ).execute()
        
        folders = results.get('files', [])
        return {"folders": folders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Key Parameters:**
- `q="mimeType='application/vnd.google-apps.folder' and trashed=false"` - Filters for folders only
- `includeItemsFromAllDrives=True` - Includes shared drives
- `supportsAllDrives=True` - Enables shared drive support
- `fields="files(id, name)"` - Returns folder ID and name
- `orderBy="name"` - Sorts alphabetically
- `pageSize=100` - Fetches up to 100 folders

## Frontend Changes

### Updated Chat Component (`src/pages/Chat.jsx`)

#### New State Variables:
```javascript
const [folderId, setFolderId] = useState(initialFolderId || '');
const [showFolderModal, setShowFolderModal] = useState(!initialFolderId);
const [folderInput, setFolderInput] = useState('');
const [folderLoading, setFolderLoading] = useState(false);
const [folderError, setFolderError] = useState('');
```

#### Modal Behavior:
1. **On Mount**: If no `folder_id` in URL params, modal shows automatically
2. **On Submit**: 
   - Validates folder ID input
   - Makes POST request to `/ingest-folder/{user_id}/{folder_id}`
   - Shows loading spinner during processing
   - Displays success message with file/chunk counts
   - Closes modal and initializes chat
3. **Change Folder**: Button in sidebar allows switching folders

#### Modal Features:
- Clean, centered design with white card
- Close button (X) in top-right
- Input field for folder ID
- Error message display
- Loading state with spinner
- "Connect Folder" button

#### Chat Features:
- Input disabled until folder is selected
- Placeholder text changes based on folder selection
- "Change Folder" button in sidebar
- Bot greeting includes folder ID
- Source badges below bot messages
- Auto-scroll to latest message

## User Flow

### First Time (No Folder Selected):
1. User navigates to `/chat?user_id=test_user_1`
2. Modal appears automatically
3. User enters folder ID
4. System ingests folder
5. Modal closes, chat initializes
6. User can start asking questions

### Subsequent Visits (Folder Already Selected):
1. User navigates to `/chat?user_id=test_user_1&folder_id=abc123`
2. Modal doesn't appear
3. Chat loads with bot greeting
4. User can immediately start chatting

### Changing Folders:
1. User clicks "Change Folder" button in sidebar
2. Modal appears
3. User enters new folder ID
4. System ingests new folder
5. Chat resets with new folder's data

## API Endpoints Used

### 1. Ingest Folder
```
POST /ingest-folder/{user_id}/{folder_id}
```
- No request body
- Response: `{ "message": "...", "files_processed": 7, "total_chunks_saved": 36 }`

### 2. Chat
```
POST /chat/{user_id}/{folder_id}
```
- Request: `{ "question": "user input" }`
- Response: `{ "question": "...", "answer": "...", "sources_used": [...] }`

### 3. List Folders (Optional - for future folder picker)
```
GET /list-folders/{user_id}
```
- Response: `{ "folders": [{ "id": "...", "name": "..." }] }`

## Styling Details

### Modal:
- Background: `bg-white` with `rounded-2xl`
- Shadow: `shadow-xl`
- Overlay: `bg-black bg-opacity-50`
- Z-index: `z-50` (above chat)

### Input Field:
- Border: `border-gray-300`
- Focus: `focus:ring-2 focus:ring-blue-600`
- Disabled: `disabled:bg-gray-100`

### Button:
- Primary: `bg-blue-600 hover:bg-blue-700`
- Disabled: `disabled:bg-blue-400`
- Loading: Shows spinner with "Processing..." text

### Sidebar:
- Background: `bg-gray-900`
- Text: `text-white`
- Buttons: `bg-gray-800 hover:bg-gray-700`

## Error Handling

### Folder Input Validation:
- Empty input: "Please enter a folder ID"
- API error: Displays error message from backend
- Network error: "An error occurred. Please try again."

### Chat Input:
- Disabled if no folder selected
- Disabled during loading
- Placeholder changes based on state

## Future Enhancements

1. **Visual Folder Picker**: Replace text input with searchable folder list
2. **Folder Preview**: Show file count before connecting
3. **Recent Folders**: Display recently used folders
4. **Folder Favorites**: Allow bookmarking frequently used folders
5. **Multi-Folder Support**: Chat across multiple folders simultaneously

## Testing

### Test Scenario 1: First Time User
1. Go to `http://localhost:5173/chat?user_id=test_user_1`
2. Modal should appear
3. Enter a valid Google Drive folder ID
4. Click "Connect Folder"
5. Wait for ingestion to complete
6. Chat should initialize with bot greeting

### Test Scenario 2: Direct Link with Folder
1. Go to `http://localhost:5173/chat?user_id=test_user_1&folder_id=abc123`
2. Modal should NOT appear
3. Chat should load immediately
4. Bot greeting should include folder ID

### Test Scenario 3: Change Folder
1. Start with a folder connected
2. Click "Change Folder" button
3. Modal should appear
4. Enter different folder ID
5. Chat should reset with new folder

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Modal doesn't appear | Check URL params - if `folder_id` is present, modal won't show |
| Ingestion fails | Verify folder ID is valid and user has access |
| Chat disabled | Ensure folder is selected (modal completed) |
| Error message persists | Close and reopen modal to clear errors |
| Sidebar buttons overlap | Check responsive design on smaller screens |

## Code Structure

```
src/pages/Chat.jsx
├── State Management
│   ├── Chat messages
│   ├── Folder selection
│   ├── Loading states
│   └── Error handling
├── Effects
│   ├── Initialize chat on mount
│   └── Auto-scroll messages
├── Handlers
│   ├── handleFolderSubmit - Ingest folder
│   ├── handleSubmit - Send chat message
│   ├── handleLogout - Return to login
│   └── handleChangeFolderClick - Open modal
├── Render
│   ├── Sidebar
│   ├── Chat area
│   ├── Input bar
│   └── Modal overlay
```

## Performance Considerations

- Modal loads instantly (no API call on open)
- Ingestion happens in background (shows spinner)
- Chat messages auto-scroll smoothly
- Input field responsive to user typing
- No unnecessary re-renders

## Accessibility

- Proper label associations (`htmlFor`)
- Keyboard navigation support
- Clear error messages
- Loading state indicators
- Focus management in modal
