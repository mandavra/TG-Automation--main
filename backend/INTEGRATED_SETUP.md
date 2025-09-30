# Integrated Server Setup with Telegram Bot

This server now includes both the main API functionality and Telegram bot features in a single process.

## 🚀 Quick Start

### 1. Environment Variables
Create a `.env` file in the backend directory:

```env
# MONGODB
MONGODB_URI=MONGODB://localhost:27017/telegram-bot

# Telegram Bot (Required for bot functionality)
BOT_TOKEN=your_bot_token_here
CHANNEL_ID=your_channel_id_here
ADMIN_USER_IDS=your_admin_user_id_here

# Other required variables
AMAZESMS_USER=your_amazesms_user
AMAZESMS_AUTHKEY=your_amazesms_authkey
AMAZESMS_SENDER=your_sender_id
CASHFREE_BASE_URL=https://sandbox.cashfree.com/pg
CASHFREE_CLIENT_ID=your_cashfree_client_id
CASHFREE_CLIENT_SECRET=your_cashfree_client_secret
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Start the Server
```bash
npm run dev
```

## ✅ What's Running

When you start the server, you'll see:

```
Server running on port 4000
MONGODB connected successfully
Telegram Bot: Running (or Not configured)
Press Ctrl+C to stop the server.
```

## 🔧 Features

### Main Server Features:
- ✅ User authentication and KYC
- ✅ Payment processing with Cashfree
- ✅ Invoice generation and email
- ✅ Plan management
- ✅ Real-time notifications via WebSocket

### Telegram Bot Features:
- ✅ Automatic subscription checking
- ✅ Join request approval/rejection
- ✅ Expired user kicking
- ✅ Admin notifications
- ✅ Real-time kick tracking

## 📱 Bot Commands

### For Users:
- `/start` - Welcome message and instructions

### For Admins:
- `/check <user_id>` - Check subscription status of a user

## 🔄 How It Works

1. **User Payment** → Subscription created with expiry date
2. **Telegram ID Link** → User links their Telegram ID via `/telegram-id`
3. **Join Request** → User requests to join channel
4. **Auto Check** → Bot checks MONGODB for active subscription
5. **Auto Action**:
   - ✅ Active subscription → Approve join request
   - ❌ No/Expired subscription → Reject join request
6. **Expiry Monitoring** → Every minute, check and kick expired users

## 🛠️ API Endpoints

### Health Check:
- `GET /health` - Server and bot status

### Payment:
- `POST /api/payment/update-telegram-id` - Update user's Telegram ID

### All existing endpoints remain the same

## 📊 Admin Panel Features

- **Kicked Users Page**: View all kicked users with details
- **Real-time Notifications**: Get notified when users are kicked
- **Statistics**: Track total kicks, today's kicks, errors, etc.

## 🚨 Troubleshooting

### Bot Not Starting:
- Check if `BOT_TOKEN`, `CHANNEL_ID`, and `ADMIN_USER_IDS` are set
- Verify bot has admin permissions in the channel
- Check bot token is valid

### MONGODB Issues:
- Ensure MONGODB is running
- Check `MONGODB_URI` is correct
- Verify network connectivity

### WebSocket Issues:
- Frontend should connect to `http://localhost:4000`
- Check CORS settings if needed

## 🔄 Development

### Hot Reload:
```bash
npm run dev
```

### Production:
```bash
npm start
```

## 📝 Notes

- Bot functionality is optional - server works without bot config
- All bot features are integrated into the main server process
- WebSocket events are sent from the same server
- Kicked users data is stored in memory (resets on restart)

## 🎯 Next Steps

1. Set up your `.env` file with all required variables
2. Start the server with `npm run dev`
3. Test bot functionality with `/start` command
4. Check admin panel for kicked users tracking
5. Monitor logs for any issues 