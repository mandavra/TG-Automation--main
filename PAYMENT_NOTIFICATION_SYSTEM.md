# 🔔 Complete Payment Notification System

A real-time notification system for instant payment alerts to administrators when payments are received.

## ✨ Features

### 🚀 Real-time Notifications
- **WebSocket-based** real-time communication
- **Instant alerts** when payments are received
- **Browser notifications** with sound alerts
- **Auto-reconnection** with exponential backoff
- **Offline support** with local storage

### 💰 Payment-specific Notifications
- **Payment Success** - Instant notification when payment is completed
- **Payment Failed** - Alert when payment attempts fail  
- **Payment Link Created** - Notification when new payment links are generated
- **Rich Payment Details** - Amount, customer info, plan details

### 🎨 UI Components
- **Notification Bell** - Shows unread count and connection status
- **Notification Dropdown** - View recent notifications history
- **Toast Notifications** - Pop-up alerts with action buttons
- **Sound Alerts** - Different sounds for different notification types

### 👤 Admin-specific Features
- **Multi-admin support** - Each admin sees their own notifications
- **Admin attribution** - Payments are attributed to correct admin
- **Super admin visibility** - Super admins can see all notifications
- **Role-based filtering** - Notifications filtered by admin permissions

## 🏗️ Architecture

### Backend Components

#### 1. NotificationService (`backend/services/notificationService.js`)
```javascript
// Main notification service with WebSocket server
class NotificationService extends EventEmitter {
  // WebSocket connection management
  // Notification history storage  
  // Payment notification methods
  // Admin connection tracking
}
```

#### 2. Notification Routes (`backend/routes/notificationRoutes.js`)
- `GET /api/notifications/history` - Get notification history
- `POST /api/notifications/send` - Send custom notification
- `GET /api/notifications/stats` - Get connection stats
- `POST /api/notifications/test` - Test notifications (dev only)

#### 3. WebSocket Integration (`backend/server.js`)
```javascript
// Initialize WebSocket server for notifications
notificationService.initializeWebSocketServer(server);
```

#### 4. Payment Workflow Integration
- **Payment Success** - `handlePaymentSuccess()` in `cashfreeService.js`
- **Payment Failed** - `handlePaymentFailure()` in `cashfreeService.js`  
- **Payment Link** - `create-payment-link` route in `paymentRoutes.js`

### Frontend Components

#### 1. Notification Service (`frontend/src/services/notificationService.js`)
```javascript
// WebSocket client with auto-reconnection
// Browser notification API integration
// Local storage for offline notifications
// Sound alert system
```

#### 2. UI Components
- **NotificationBell** - Bell icon with unread count
- **NotificationToast** - Pop-up toast with actions
- **NotificationContainer** - Toast container manager

#### 3. Integration Points
- **App.jsx** - NotificationContainer for admin routes
- **Navbar.jsx** - NotificationBell in admin navbar

## 🔧 Setup & Configuration

### 1. Backend Setup

The backend is already configured with:
- WebSocket server on same port as HTTP server
- Notification routes mounted at `/api/notifications`
- Payment webhook integration
- Admin authentication middleware

### 2. Frontend Setup

The frontend is configured with:
- WebSocket client auto-connecting for admin users
- Notification components integrated in admin layout
- Browser notification permissions requested automatically

### 3. WebSocket Connection

```javascript
// WebSocket endpoint
ws://localhost:4000/api/notifications/ws

// Authentication message
{
  type: 'authenticate',
  adminId: 'admin123',
  token: 'jwt_token'
}
```

## 📡 WebSocket Protocol

### Client → Server Messages

#### Authentication
```json
{
  "type": "authenticate",
  "adminId": "admin_id",
  "token": "jwt_token"
}
```

#### Ping
```json
{
  "type": "ping"
}
```

### Server → Client Messages

#### Authentication Success
```json
{
  "type": "authentication_success",
  "message": "Connected to notification service"
}
```

#### New Notification
```json
{
  "type": "notification",
  "data": {
    "type": "payment_success",
    "title": "💰 Payment Received!",
    "message": "New payment of ₹999 received from customer123",
    "data": {
      "orderId": "TG-abc123",
      "amount": 999,
      "customer": "customer123",
      "planName": "Premium Plan",
      "timestamp": "2023-12-01T10:00:00Z"
    },
    "priority": "high",
    "sound": "success",
    "actions": [
      {
        "action": "view_details", 
        "title": "View Details",
        "icon": "👁️"
      }
    ]
  }
}
```

## 🎵 Notification Types & Sounds

### Payment Success
- **Sound**: `success.mp3`  
- **Icon**: 💰
- **Color**: Green
- **Priority**: High
- **Auto-close**: No (requires interaction)

### Payment Failed  
- **Sound**: `error.mp3`
- **Icon**: ❌ 
- **Color**: Red
- **Priority**: Medium
- **Auto-close**: 10 seconds

### Payment Link Created
- **Sound**: `notification.mp3`
- **Icon**: 🔗
- **Color**: Blue  
- **Priority**: Low
- **Auto-close**: 10 seconds

## 🧪 Testing

### 1. Test Endpoint (Development)
```bash
POST /api/notifications/test
{
  "type": "payment_success"  # or "payment_failed"
}
```

### 2. Manual Testing Steps

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend Server** 
   ```bash
   cd frontend
   npm run dev
   ```

3. **Login as Admin** - Navigate to `/loginAdmin`

4. **Check Connection** - Look for green dot in notification bell

5. **Test Notification** - Use test endpoint or create actual payment

### 3. Browser Console Testing
```javascript
// Test browser notifications
new Notification('Test Payment', {
  body: 'Payment of ₹999 received',
  icon: '/icons/payment-success.png'
});

// Test WebSocket connection
const ws = new WebSocket('ws://localhost:4000/api/notifications/ws');
ws.onopen = () => console.log('Connected');
```

## 🔍 Troubleshooting

### Common Issues

#### 1. WebSocket Connection Failed
- **Check**: Backend server is running
- **Check**: WebSocket endpoint is accessible
- **Fix**: Ensure port 4000 is available

#### 2. No Notifications Received  
- **Check**: Admin authentication working
- **Check**: Payment has adminId assigned
- **Fix**: Verify payment → admin attribution

#### 3. Browser Notifications Blocked
- **Check**: Browser notification permission
- **Fix**: Click allow when prompted or enable in browser settings

#### 4. Toast Notifications Not Showing
- **Check**: NotificationContainer is rendered
- **Check**: Admin route detection
- **Fix**: Verify App.jsx integration

### Debug Commands

```javascript
// Check connection status
notificationService.getConnectionStatus()

// View local notifications  
notificationService.getLocalNotifications()

// Test notification service
notificationService.sendTestNotification()
```

## 📊 Connection Stats

Access notification service stats:
```bash
GET /api/notifications/stats
```

Response:
```json
{
  "totalConnections": 3,
  "adminConnections": {
    "admin1": 2,
    "admin2": 1  
  },
  "notificationHistorySize": {
    "admin1": 15,
    "admin2": 8
  }
}
```

## 🔐 Security Features

- **JWT Authentication** - WebSocket connections authenticated
- **Admin Authorization** - Notifications filtered by admin permissions  
- **Replay Attack Prevention** - Timestamp verification
- **Rate Limiting** - Built-in connection limits
- **Secure WebSocket** - Supports WSS for production

## 🚀 Production Deployment

### Environment Variables
```bash
# Backend
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# Frontend  
REACT_APP_WS_URL=wss://api.yourdomain.com
```

### WebSocket URL Update
```javascript
// Update in frontend/src/services/notificationService.js
const wsUrl = process.env.NODE_ENV === 'production' 
  ? `wss://${window.location.hostname}/api/notifications/ws`
  : `ws://${window.location.hostname}:4000/api/notifications/ws`;
```

## 📈 Future Enhancements

- **Push Notifications** - Mobile app integration
- **Email Notifications** - Backup notification method
- **SMS Alerts** - Critical payment notifications
- **Notification Templates** - Customizable notification formats
- **Analytics** - Notification engagement metrics
- **Scheduling** - Delayed or recurring notifications

## 🎉 Summary

The complete payment notification system provides:

✅ **Real-time WebSocket communication**
✅ **Instant payment alerts with rich details**  
✅ **Browser notifications with sound**
✅ **Toast notifications with actions**
✅ **Multi-admin support with role-based filtering**
✅ **Offline support with local storage**  
✅ **Auto-reconnection and error handling**
✅ **Integrated with existing payment workflow**
✅ **Ready for production deployment**

The system is now complete and ready to provide instant payment notifications to administrators as soon as payments are received from users!