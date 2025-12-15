# Subscription Tier Restrictions

This document outlines the feature restrictions between free and premium subscription tiers.

## Free Tier (Non-Premium Users)

### ✅ Allowed Features

1. **Note Creation**: Up to **3 notes maximum**
2. **Note Editing**: Can edit their own notes
   - Local editing (type in text area)
   - Changes saved via "Save" button (HTTP PUT request)
   - No real-time synchronization
3. **Share Links**: Can generate share links with **read-only permissions only**
4. **Content Access**: Can view shared notes via share links (read-only)

### ❌ Restricted Features

1. **Real-time Collaboration**: 
   - Cannot use real-time editing operations
   - Changes are NOT broadcasted live to other users
   - Changes only visible after clicking "Save"
   - Cannot see other users' cursors
   - Message shown: "Free Plan - Save to Update"

2. **Team Sharing**:
   - Cannot share notes with specific users via email
   - Cannot grant permissions to other users
   - Error message: "Team sharing requires premium subscription. Use share links instead."

3. **Share Permissions**:
   - Can only create read-only share links
   - Cannot share with write or admin permissions
   - Share links are view-only for recipients

4. **Note Limit**:
   - Maximum of 3 notes
   - Error message: "Note limit reached. Upgrade to premium for unlimited notes."

### 📝 How Free Users Edit Notes

1. Open their own note in the editor
2. Type and make changes locally
3. Click "Save" button to persist changes to database
4. Changes become visible to others only after save
5. No live synchronization with other viewers

## Premium Tier

### ✅ Full Access

1. **Unlimited Notes**: No limit on note creation
2. **Real-time Collaboration**: with write/admin permissions
5. **Full Edit Access**: Can edit shared notes with proper permissions
   - Live editing with operational transformation
   - Real-time cursor tracking
   - Multi-user collaboration sessions
3. **Team Sharing**: Share notes with specific users via email with granular permissions
4. **Share Links**: Generate share links (same as free tier)

## Implementation Details

### Backend Restrictions

#### WebSocket Restrictions ([websocket.py](backend/app/routes/websocket.py))

- Premium check on WebSocket connection (lines 231-241)
- Blocks `edit` message type for non-premium users (lines 266-272)
- Blocks `cursor` message type for non-premium users (lines 339-345)
- Allows `get_content` and `ping` for all users

#### Note Creation Restrictions ([notes.py](backend/app/routes/notes.py))

- Check `user.is_premium` flag (line 72)
- Count existing notes before allowing creation (lines 73-82)
- Enforced in `POST /api/notes/` endpoint

#### Sharing Restrictions ([notes.py](backend/app/routes/notes.py))

- Share link generation: ✅ Available to all users (lines 408-416)
- User-specific permissions: ❌ Premium only (lines 418-428)
- Enforced in `POST /api/notes/{note_id}/share` endpoint

### Frontend Implementation

#### Premium Status Display ([AuthContext.tsx](frontend/src/contexts/AuthContext.tsx))

- Fetches `is_premium` status from backend on authentication
- Stored in User context for global access

#### Error Handling ([NoteEditor.tsx](frontend/src/components/NoteEditor.tsx))

- WebSocket error handler shows upgrade modal for premium restrictions
- Premium feature errors trigger pricing modal automatically

#### Share Modal ([NoteEditor.tsx](frontend/src/components/NoteEditor.tsx))

- Team sharing email field disabled for non-premium users
- Shows "Premium Only" tag and warning message
- Share link generation remains enabled for all users

#### Note Limit Display ([NoteList.tsx](frontend/src/components/NoteList.tsx))

- Shows progress bar for free users (X/3 notes used)
- Displays upgrade prompt when limit reached
- Prevents creation when at limit with pricing modal

### API Endpoints

#### New Endpoint: Get Note Limit
```
GET /api/subscription/note-limit
```

Returns:
```json
{
  "note_count": 2,
  "limit": 3,
  "can_create_more": true,
  "is_premium": false
}
```

## Database Schema

The `users` table includes an `is_premium` boolean flag that determines access levels:

```python
class User(Base):
    is_premium = Column(Boolean, default=False)
```

This flag is set to `True` when a user has an active subscription via Stripe.

## User Experience Flow

### Free User Creating 4th Note
1. User clicks "Create Note"
2. Frontend checks note limit from `/api/subscription/note-limit`
3. Backend returns `can_create_more: false`
4. Frontend shows pricing modal instead of creating note
5. User can upgrade to premium or delete existing notes

### Free User Trying Real-time Collaboration
1. User opens a note in the editor
2. User types to trigger real-time edit
3. WebSocket sends `edit` message to backend
4. Backend checks `user.is_premium` → false
5. Backend sends error: "Real-time collaboration requires premium subscription"
6. Frontend shows upgrade modal with pricing

### Free User Trying Team Sharing
1. User clicks "Share" button
2. Share modal opens
3. Email input field is disabled with "Premium Only" tag
4. User can only generate share links
5. If user somehow submits email, backend returns 403
6. Frontend shows warning about premium requirement
