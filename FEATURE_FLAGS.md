# Feature Flags Guide

This document explains how to enable or disable authentication and subscription features in ShareNotes.

## Quick Toggle

The app now uses feature flags that can be easily toggled to hide/show authentication and subscription features.

### Current Configuration (Basic Note Sharing - No Auth/Subscriptions)

**Status**: Authentication and Subscriptions are **DISABLED**

The app currently runs as a basic note-sharing platform where:
- ✅ Anyone can create and edit notes anonymously
- ✅ No login required
- ✅ No note limits
- ✅ No subscription prompts
- ✅ Full functionality without authentication

### Configuration File

All feature flags are controlled in: `/frontend/src/config.ts`

```typescript
features: {
  enableAuth: false,              // Controls login/logout functionality
  enableSubscriptions: false,     // Controls premium features and limits
}
```

---

## How to Enable Features

### Option 1: Edit config.ts Directly (Quick Toggle)

**File**: `frontend/src/config.ts`

```typescript
const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
  keycloak: {
    url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
    realm: import.meta.env.VITE_KEYCLOAK_REALM || 'syncpad',
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'syncpad-frontend',
  },
  features: {
    // Change these values to enable/disable features
    enableAuth: true,              // Set to true to enable login
    enableSubscriptions: true,     // Set to true to enable subscriptions
  },
};
```

After changing, restart the frontend:
```bash
docker compose restart frontend
```

### Option 2: Use Environment Variables (Production Ready)

Create a `.env` file in the `frontend/` directory:

```bash
# Enable authentication
VITE_ENABLE_AUTH=true

# Enable subscriptions
VITE_ENABLE_SUBSCRIPTIONS=true
```

Then rebuild:
```bash
docker compose up --build frontend
```

---

## Feature Combinations

### 1. Basic Note Sharing (Current - Default)
```typescript
enableAuth: false
enableSubscriptions: false
```

**What's visible:**
- ✅ No login button
- ✅ No subscription prompts
- ✅ Unlimited notes
- ✅ Full note sharing
- ✅ Dark/light theme toggle

**Use case:** Simple, open note-sharing platform

---

### 2. With Authentication Only
```typescript
enableAuth: true
enableSubscriptions: false
```

**What's visible:**
- ✅ Login/Logout button
- ✅ User profile menu
- ✅ Unlimited notes for all users
- ✅ Notes tied to user accounts
- ❌ No subscription limits

**Use case:** Private note-taking with user accounts but no monetization

---

### 3. Full SaaS Mode (Auth + Subscriptions)
```typescript
enableAuth: true
enableSubscriptions: true
```

**What's visible:**
- ✅ Login/Logout button
- ✅ User profile menu
- ✅ Free plan limit (3 notes)
- ✅ Upgrade to Premium button
- ✅ Pricing modal
- ✅ Real-time sync tag for premium users
- ✅ Note limit progress bar

**Use case:** Full SaaS business with freemium model

---

### 4. Anonymous with Limits (Unusual)
```typescript
enableAuth: false
enableSubscriptions: true
```

**What's visible:**
- ❌ No login
- ✅ Note limits enforced
- ✅ Upgrade prompts (but nowhere to login)

**Use case:** Not recommended - creates confusing UX

---

## What Each Feature Controls

### `enableAuth: true`

**Shows:**
- Login button in header
- User avatar/dropdown menu
- "Anonymous Mode" alert when not logged in
- Logout option

**Hides:**
- All authentication UI when false

**Code Locations:**
- `frontend/src/App.tsx` - Header login/logout button
- `frontend/src/components/NoteList.tsx` - Anonymous mode alert

---

### `enableSubscriptions: true`

**Shows:**
- Note limit banner (Free Plan: X/3 notes)
- Progress bar for note usage
- "Upgrade to Premium" buttons
- Pricing modal
- Premium-only tags (Real-time Sync)
- 403 error handling for note limits

**Hides:**
- All subscription/premium UI when false
- Note creation limits
- Pricing modals

**Code Locations:**
- `frontend/src/components/NoteList.tsx` - Limit banner, pricing modal, note limit checks
- `frontend/src/components/NoteEditor.tsx` - Real-time sync tag

---

## Testing Different Configurations

### Test Scenario 1: Basic Platform (Current)
```bash
# No changes needed - this is the default
```

1. Open app
2. Create notes freely
3. No login prompt
4. No subscription limits

### Test Scenario 2: Enable Everything
```bash
# Edit frontend/src/config.ts
features: {
  enableAuth: true,
  enableSubscriptions: true,
}

# Restart
docker compose restart frontend
```

1. See login button
2. Try creating 4 notes as anonymous user
3. Should hit limit and see upgrade prompt
4. Login to get unlimited notes (if premium)

---

## Deployment Recommendations

### Development
```typescript
enableAuth: false
enableSubscriptions: false
```
Quick testing without authentication overhead.

### Staging/Testing
```typescript
enableAuth: true
enableSubscriptions: true
```
Test full flow before production.

### Production - Phase 1 (MVP Launch)
```typescript
enableAuth: true
enableSubscriptions: false
```
Get users onboard without payment friction initially.

### Production - Phase 2 (Monetization)
```typescript
enableAuth: true
enableSubscriptions: true
```
Enable billing once you have user base.

---

## Environment-Specific Configuration

### Docker Compose (docker-compose.yml)

Add environment variables:

```yaml
services:
  frontend:
    build: ./frontend
    environment:
      - VITE_ENABLE_AUTH=true
      - VITE_ENABLE_SUBSCRIPTIONS=true
```

### Kubernetes (05-frontend.yaml)

```yaml
env:
  - name: VITE_ENABLE_AUTH
    value: "true"
  - name: VITE_ENABLE_SUBSCRIPTIONS
    value: "true"
```

### Vercel/Netlify

Add to environment variables in dashboard:
- `VITE_ENABLE_AUTH=true`
- `VITE_ENABLE_SUBSCRIPTIONS=true`

---

## Reverting to Full SaaS Mode

When you're ready to enable authentication and subscriptions:

1. **Edit config.ts**:
```typescript
features: {
  enableAuth: true,
  enableSubscriptions: true,
}
```

2. **Restart services**:
```bash
docker compose restart frontend
```

3. **Verify Keycloak is running**:
```bash
docker compose ps keycloak
```

4. **Test login flow**:
   - Click login button
   - Should redirect to Keycloak
   - Login with admin@sharenotes.com

5. **Test subscription limits**:
   - Logout
   - Create 3 notes as anonymous
   - 4th note should show upgrade prompt

---

## Backend Configuration

The backend doesn't need changes for these feature flags. However, you may want to disable subscription enforcement:

**File**: `backend/app/routes/notes.py`

To completely disable limits on backend (optional):

```python
# Comment out the limit check
# if not user.is_premium and user_note_count >= FREE_TIER_NOTE_LIMIT:
#     raise HTTPException(status_code=403, ...)
```

---

## Summary

**Current State**: Basic note-sharing platform (no auth, no limits)

**To enable login**: Set `enableAuth: true` in config.ts

**To enable subscriptions**: Set `enableSubscriptions: true` in config.ts

**To revert**: Change back to `false` and restart frontend

All changes are controlled through simple boolean flags - easy to toggle on/off as needed!

---

**Last Updated**: December 15, 2025
