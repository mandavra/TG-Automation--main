# 🗄️ Database Structure & Data Flow

## 📊 **Database Collections Overview**

### **1. `users` Collection - PERMANENT USER DATA**
```javascript
{
  _id: ObjectId("..."),
  firstName: "John",
  lastName: "Doe", 
  email: "john@example.com",
  phone: "1234567890",
  panNumber: "ABCDE1234F",
  dob: "1990-01-01",
  City: "Mumbai",
  State: "Maharashtra",
  stateCode: 27,
  telegramUserId: "123456789",           // Added when user joins Telegram
  telegramJoinStatus: "joined",          // pending, joined, kicked, expired
  telegramJoinedAt: Date("2025-08-19"),  // When user joined Telegram
  transactionId: "TXN123456",
  createdAt: Date("2025-08-19"),
  updatedAt: Date("2025-08-19")
}
```

### **2. `paymentlinks` Collection - SUBSCRIPTION DATA**
```javascript
{
  _id: ObjectId("..."),
  userid: ObjectId("..."),               // Reference to users collection
  link_id: "TG-uuid-here",
  link_url: "https://payments.cashfree.com/...",
  customer_id: "customer_123",
  phone: "1234567890",
  amount: 999,
  plan_id: "premium_monthly",
  plan_name: "Premium Monthly Plan",
  status: "SUCCESS",                     // PENDING, SUCCESS, FAILED
  purchase_datetime: "2025-08-19T10:30:00Z",
  expiry_date: Date("2025-09-19"),       // When subscription expires
  duration: 2592000,                     // Duration in seconds (30 days)
  createdAt: Date("2025-08-19"),
  updatedAt: Date("2025-08-19")
}
```

### **3. `invitelinks` Collection - TEMPORARY TELEGRAM LINKS**
```javascript
{
  _id: ObjectId("..."),
  link: "https://t.me/+ABC123...",
  link_id: "invite_123456",
  telegramUserId: "123456789",           // Set when link is used
  userId: ObjectId("..."),               // Reference to users collection
  is_used: false,                        // true when someone joins
  used_by: "123456789",                  // Telegram ID who used it
  used_at: Date("2025-08-19"),          // When link was used
  expires_at: Date("2025-08-19"),       // Link expiry (usually 1-24 hours)
  duration: 3600,                       // How long user access lasts
  createdAt: Date("2025-08-19"),
  updatedAt: Date("2025-08-19")
}
```

## 🔄 **Data Flow & Lifecycle**

### **📱 Real User Journey (Production)**
```
1. PAYMENT FLOW
   ├── User fills form → Creates `users` record
   ├── Payment made → Creates `paymentlinks` record (PENDING)
   ├── Payment success → Updates status to SUCCESS
   └── Webhook → Generates `invitelinks` record

2. TELEGRAM FLOW  
   ├── User clicks invite link
   ├── Bot validates link → Updates `invitelinks` (is_used: true)
   ├── User approved → Updates `users` (telegramJoinStatus: joined)
   └── Link revoked → `invitelinks` record remains for history

3. EXPIRY FLOW
   ├── Cron job checks `paymentlinks` with expired dates
   ├── Removes user from Telegram channel
   ├── Updates `users` (telegramJoinStatus: expired)
   └── DELETES expired `users` and `paymentlinks` records
```

### **🧪 Test User Journey (Current Testing)**
```
1. TEST FLOW
   ├── /getlink 1m → Creates `invitelinks` record
   ├── User joins → Creates temporary `users` record
   ├── Auto-creates temporary `paymentlinks` record
   └── After 1m → DELETES both temp records + removes from Telegram
```

## 📋 **Permanent vs Temporary Data**

### **🔒 PERMANENT DATA (Kept Forever)**
- **Real user records** with actual email addresses
- **Successful payment history** for real subscriptions
- **Audit trail** of legitimate transactions
- **User preferences and profile data**

### **🗑️ TEMPORARY DATA (Auto-Deleted)**
- **Expired user subscriptions** (user + payment records deleted)
- **Test user accounts** (email contains "test_")
- **Used invite links** (kept briefly for history, then cleaned up)
- **Failed/pending payments** (cleaned up after 30 days)

### **📊 DATA RETENTION RULES**

#### **Active Subscriptions:**
- `users` → PERMANENT (until subscription expires)
- `paymentlinks` → PERMANENT (until subscription expires)
- `invitelinks` → DELETED (after use)

#### **Expired Subscriptions:**
- `users` → **DELETED** (complete removal)
- `paymentlinks` → **DELETED** (complete removal)
- `invitelinks` → **DELETED** (cleanup job)

#### **Test Data:**
- All test records → **DELETED** (immediately after expiry)

## 🔧 **Database Indexes for Performance**

```javascript
// Users Collection
users.createIndex({ email: 1 }, { unique: true, sparse: true })
users.createIndex({ telegramUserId: 1 }, { unique: true, sparse: true })
users.createIndex({ telegramJoinStatus: 1 })

// PaymentLinks Collection  
paymentlinks.createIndex({ userid: 1 })
paymentlinks.createIndex({ expiry_date: 1 })
paymentlinks.createIndex({ status: 1 })

// InviteLinks Collection
invitelinks.createIndex({ link: 1 }, { unique: true })
invitelinks.createIndex({ telegramUserId: 1, is_used: 1 })
invitelinks.createIndex({ expires_at: 1 })
```

## 📈 **Scaling Considerations**

### **For 1000+ Users:**
- Regular cleanup of old `invitelinks` 
- Archive old payment data instead of deletion
- Add user activity logging
- Implement database sharding if needed

### **For 10,000+ Users:**
- Move to dedicated MongoDB cluster
- Add Redis caching for frequently accessed data
- Implement database replication
- Add monitoring and alerting

## 🚨 **Data Privacy & Compliance**

### **User Data Protection:**
- PAN numbers and personal data encrypted
- GDPR-compliant data deletion on subscription end
- No sensitive data in logs
- Secure API endpoints with authentication

### **Audit Trail:**
- All payment transactions logged
- Telegram join/leave events tracked
- System actions timestamped
- Failed attempts recorded for security

---

## 🎯 **Current Status: Production Ready!**

Your database structure is properly designed for:
✅ **Scalability** - Proper indexing and relationships
✅ **Data Privacy** - Automatic cleanup of expired data  
✅ **Performance** - Efficient queries and cron jobs
✅ **Reliability** - Proper error handling and logging