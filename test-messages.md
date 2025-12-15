# Messages Real-Time Chat - Testing Guide

## ✅ What Was Fixed

### 1. **getConversations() Method**

- Completely rewrote to avoid `selectDistinctOn` which was causing Drizzle errors
- Now uses simple queries + in-memory processing
- Added early-return when no conversations exist
- Added try/catch with detailed error logging

### 2. **WebSocket Real-Time Updates**

- Enhanced message broadcasting to target specific users
- Added multi-tab support (messages sync across tabs)
- Added detailed console logging for debugging
- Added toast notifications for incoming messages
- Proper query invalidation when messages arrive

### 3. **Message Targeting**

- Messages now only broadcast to sender and recipient
- Prevents unnecessary broadcasts to unrelated users
- Improves performance and security

## 🧪 How to Test

### Test 1: Basic Messaging

1. Login as **admin** (admin@medivault.com / admin123)
2. Navigate to **Messages** page
3. Click **"+ New Message"** button
4. Select a doctor (e.g., "Dr. Silva")
5. Type a message and click Send
6. ✅ **Expected**: Message appears immediately in chat

### Test 2: Real-Time Updates

1. Open **two browser windows**:
   - Window 1: Login as **admin**
   - Window 2: Login as **dr.silva** (dr.silva@medivault.com / doctor123)
2. In Window 1, send message to Dr. Silva
3. ✅ **Expected**:
   - Window 2 shows toast notification
   - Conversations list updates immediately
   - If chat is open, message appears instantly

### Test 3: Conversation List

1. Login and navigate to Messages
2. Check left sidebar shows all conversation partners
3. Each should display:
   - ✅ User name and role badge
   - ✅ Last message preview
   - ✅ Timestamp (e.g., "2 minutes ago")
   - ✅ Unread count badge (if unread messages)

### Test 4: Unread Messages

1. Login as User A, send message to User B
2. Logout and login as User B
3. Navigate to Messages
4. ✅ **Expected**:
   - Unread badge shows count
   - Clicking conversation marks messages as read
   - Badge disappears

### Test 5: Search & Filter

1. Click **"+ New Message"**
2. Type in search box (e.g., "doctor")
3. ✅ **Expected**: Filters users by name/username/role
4. Select role filter (e.g., "doctor")
5. ✅ **Expected**: Shows only doctors

## 🔍 Console Monitoring

### Frontend Console (Browser DevTools)

```
✅ WebSocket connected for real-time chat
📨 WebSocket message received: {type: "message", data: {...}}
🔄 Refreshed messages for current chat
```

### Backend Console (Terminal)

```
📤 WebSocket message from user: [userId] {type: "message", ...}
  ✅ Sent to user: [recipientId]
📡 Broadcast to 2 client(s)
```

## 🐛 Troubleshooting

### Issue: Conversations not loading

**Check**: Server logs for `getConversations error`
**Fix**: Restart server - new code is loaded

### Issue: Messages not real-time

**Check**: Browser console for WebSocket connection
**Look for**: `✅ WebSocket connected`
**Fix**: Refresh browser to reconnect WebSocket

### Issue: "Cannot convert undefined or null to object"

**Status**: ✅ FIXED - Replaced selectDistinctOn with simple queries
**Verify**: No errors in server console on GET /api/conversations

## 📊 API Endpoints

| Endpoint                     | Method    | Description                               |
| ---------------------------- | --------- | ----------------------------------------- |
| `/api/conversations`         | GET       | List all conversations with unread counts |
| `/api/messages/:userId`      | GET       | Get all messages with specific user       |
| `/api/messages`              | POST      | Send new message                          |
| `/api/messages/:userId/read` | PATCH     | Mark all messages from user as read       |
| `/api/users/available`       | GET       | List all users for new message            |
| `/ws`                        | WebSocket | Real-time message broadcasting            |

## 🎯 Key Features

✅ Real-time message delivery via WebSocket
✅ Unread message badges
✅ Auto-scroll to latest message
✅ Search conversations
✅ Filter users by role
✅ Multi-tab synchronization
✅ Toast notifications
✅ Mark messages as read
✅ Last message preview
✅ Relative timestamps

## 🔐 Security

- WebSocket authenticated via session
- Users can only see their own messages
- Messages only broadcast to sender/recipient
- Session verification on every WebSocket connection
