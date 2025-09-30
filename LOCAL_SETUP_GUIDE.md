# 🚀 Local Setup Guide - Telegram Payment Integration

This guide will help you run the complete Telegram payment integration locally for testing.

## 📋 Prerequisites

### 1. Software Requirements
- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **MongoDB** (local or cloud instance)
- **Git** (for version control)

### 2. Telegram Setup Requirements
- **Telegram Bot** (created via BotFather)
- **Telegram Channel** (private channel where users will be added)
- **Admin Telegram User ID** (your Telegram user ID)

## 🔧 Step 1: Telegram Configuration

### Create Telegram Bot
1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow instructions to create your bot
4. **Save the Bot Token** (e.g., `1234567890:ABC123def456...`)

### Create Telegram Channel
1. Create a new **private channel** (not group)
2. Add your bot as admin with these permissions:
   - ✅ Invite users via link
   - ✅ Manage join requests
   - ✅ Ban users
3. Get Channel ID using this method:
   - Add bot to channel
   - Send a message in channel
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find your channel ID (starts with `-100`)

### Get Your Telegram User ID
1. Search for `@userinfobot` on Telegram
2. Send `/start` command
3. **Save your User ID** (numbers only)

## 🛠️ Step 2: Backend Setup

### 1. Install Dependencies
```bash
cd "E:\Codes\Vyom Payment\2\TG Automation\backend"
npm install
```

### 2. Environment Configuration
Create `.env` file in backend folder:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/telegram_payment_db
# OR for cloud MongoDB:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/telegram_payment_db

# Telegram Bot Configuration
BOT_TOKEN=YOUR_BOT_TOKEN_HERE
CHANNEL_ID=YOUR_CHANNEL_ID_HERE

# Cashfree Payment Gateway
CASHFREE_BASE_URL=https://sandbox.cashfree.com/pg
CASHFREE_CLIENT_ID=your_cashfree_client_id
CASHFREE_CLIENT_SECRET=your_cashfree_client_secret

# Server Configuration
BACKEND_URL=http://localhost:4000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=4000

# Email Configuration (optional for testing)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Other services (can be mock values for testing)
DIGIO_BASE_URL=https://ext.digio.in:444
DIGIO_CLIENT_ID=test_client_id
DIGIO_CLIENT_SECRET=test_client_secret
```

### 3. Start Backend Server
```bash
npm start
# OR for development with auto-restart:
npm run dev
```

Backend should run on: `http://localhost:4000`

## 🐍 Step 3: Telegram Bot Setup

### 1. Install Python Dependencies
```bash
cd "E:\Codes\Vyom Payment\2\TG Automation\TG Bot Script"
pip install python-telegram-bot python-dotenv requests
```

### 2. Bot Environment Configuration
Create `.env` file in bot folder:
```env
# Telegram Bot Configuration
BOT_TOKEN=YOUR_BOT_TOKEN_HERE
CHANNEL_ID=YOUR_CHANNEL_ID_HERE
ADMIN_USER_IDS=YOUR_TELEGRAM_USER_ID

# Backend Configuration
BACKEND_URL=http://localhost:4000
```

### 3. Start Telegram Bot
```bash
python TG_Automation.py
```

## 🎨 Step 4: Frontend Setup

### 1. Install Dependencies
```bash
cd "E:\Codes\Vyom Payment\2\TG Automation\frontend"
npm install
```

### 2. Start Frontend
```bash
npm run dev
```

Frontend should run on: `http://localhost:5173`

## 🧪 Step 5: Testing the Complete Flow

### 1. Test Backend APIs
First, test if backend is working:
```bash
# Test server health
curl http://localhost:4000/api/payment/test-config

# Test invite link generation (replace USER_ID with actual ObjectId)
curl -X GET "http://localhost:4000/api/invite/user-invite/USER_ID"
```

### 2. Test Bot Connection
Check bot logs - you should see:
```
Bot has started successfully.
```

### 3. Test Complete Payment Flow

#### Option A: Frontend Testing
1. Open `http://localhost:5173`
2. Go through the payment flow:
   - Select plan → Payment → KYC → E-sign
   - Check if Telegram invite link appears

#### Option B: API Testing
Create a test user and payment:
```bash
# 1. Create test user
curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User", 
    "email": "test@example.com",
    "phone": "1234567890"
  }'

# 2. Create test payment (use user ID from step 1)
curl -X POST http://localhost:4000/api/payment/create-payment-link \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "test_customer",
    "phone": "1234567890",
    "amount": 100,
    "plan_id": "test_plan",
    "plan_name": "Test Plan",
    "userid": "USER_ID_FROM_STEP_1",
    "expiry_date": "2024-12-31T23:59:59.000Z",
    "duration": 86400
  }'
```

### 4. Test Telegram Integration

#### Generate Test Invite Link
1. Message your bot with `/start`
2. Use `/getlink` command (as admin)
3. Bot should generate a test invite link

#### Test Join Request Flow
1. Use the generated invite link
2. Click "Request to Join" in Telegram
3. Check bot logs for validation process
4. Bot should approve/decline based on backend validation

## 🔍 Step 6: Monitoring & Debugging

### Backend Logs
Monitor backend console for:
- ✅ Payment webhook events
- ✅ Invite link generation
- ✅ Database operations
- ❌ Error messages

### Bot Logs
Monitor bot console for:
- ✅ Join request processing
- ✅ Backend API calls
- ✅ Approval/decline actions
- ❌ Connection errors

### Database Checks
Use MongoDB Compass or CLI to check:
- `users` collection - User records
- `paymentlinks` collection - Payment records  
- `invitelinks` collection - Telegram invite links

## 🚨 Common Issues & Solutions

### Backend Won't Start
- ✅ Check MongoDB connection
- ✅ Verify all environment variables
- ✅ Ensure port 4000 is available

### Bot Won't Start
- ✅ Verify BOT_TOKEN is correct
- ✅ Check CHANNEL_ID format (should start with -100)
- ✅ Ensure bot is admin in channel

### Join Requests Declined
- ✅ Check backend API is running
- ✅ Verify BACKEND_URL in bot .env
- ✅ Check backend logs for validation errors

### Payment Integration Issues
- ✅ Verify Cashfree credentials
- ✅ Check webhook URL configuration
- ✅ Test with Cashfree sandbox

## 📝 Testing Checklist

- [ ] Backend server starts successfully
- [ ] MongoDB connection established
- [ ] Telegram bot starts and connects
- [ ] Bot responds to `/start` command
- [ ] Frontend loads at localhost:5173
- [ ] Payment link creation works
- [ ] Webhook processing works
- [ ] Invite link generation works
- [ ] Join request validation works
- [ ] User approval/decline works
- [ ] Expiry job runs correctly

## 🎯 Production Deployment Notes

When moving to production:
1. **Update environment URLs** (remove localhost)
2. **Use production Cashfree credentials**
3. **Set up proper MongoDB cluster**
4. **Configure proper domain/SSL**
5. **Set up process managers** (PM2 for Node.js, systemd for Python)
6. **Monitor logs and errors**

---

🎉 **You're all set!** Follow this guide step by step, and you'll have a fully functional Telegram payment integration system running locally.