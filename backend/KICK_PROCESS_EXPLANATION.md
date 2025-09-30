# 🔥 User Kick Process - Complete Code Explanation

## 📋 **Overview:**
यहाँ complete process है कि कैसे users automatically kick होते हैं जब उनका plan expire हो जाता है।

---

## 🕐 **Step 1: Cron Job Schedule**
```javascript
// Every 5 minutes, this function runs automatically
cron.schedule('*/5 * * * *', kickExpiredUsers);
```

**Location:** `backend/server.js` - Line 355

---

## 🔍 **Step 2: Find Expired Users**
```javascript
const kickExpiredUsers = async () => {
    // Check if MONGODB is connected
    if (mongoose.connection.readyState !== 1) {
        console.log('MONGODB not connected, skipping kick job');
        return;
    }
    
    try {
        const now = new Date();
        console.log(`KICK_JOB: Checking for expired users at ${now.toISOString()}`);
        
        // 🔍 Find users with expired subscriptions
        const expiredUsers = await PaymentLink.find({
            status: 'SUCCESS',
            expiry_date: { $lt: now }  // Expiry date is less than current time
        }).populate('userid');
        
        let usersKicked = 0;
```

**What this does:**
- ✅ **Every 5 minutes** check करता है
- ✅ **MONGODB connection** verify करता है
- ✅ **Expired users** find करता है
- ✅ **PaymentLink collection** से data fetch करता है

---

## 👤 **Step 3: Process Each Expired User**
```javascript
for (const paymentLink of expiredUsers) {
    const user = paymentLink.userid;
    
    // Skip if user has no telegramUserId
    if (!user || !user.telegramUserId) {
        console.log(`KICK_JOB: User ${user?._id} has no telegramUserId, skipping`);
        continue;
    }
    
    try {
        console.log(`KICK_JOB: Processing user ${user.telegramUserId} (${user.firstName} ${user.lastName})`);
        console.log(`KICK_JOB: Plan: ${paymentLink.plan_name}, Duration: ${paymentLink.duration} days, Expired: ${paymentLink.expiry_date}`);
```

**What this does:**
- ✅ **Each expired user** को process करता है
- ✅ **telegramUserId** check करता है
- ✅ **User details** log करता है
- ✅ **Plan information** show करता है

---

## 🚫 **Step 4: Kick User from Channel**
```javascript
// 🚫 Kick user from channel
await bot.banChatMember(CHANNEL_ID, user.telegramUserId);
console.log(`KICK_JOB: Ban successful for ${user.telegramUserId}`);

// 🔓 Unban user (allows future joins)
await bot.unbanChatMember(CHANNEL_ID, user.telegramUserId);
console.log(`KICK_JOB: Unban successful for ${user.telegramUserId}`);
```

**What this does:**
- ✅ **Ban user** - Channel से remove करता है
- ✅ **Unban user** - Future में join कर सकता है
- ✅ **Log success** - Console में confirmation

---

## 📝 **Step 5: Update Database & Notifications**
```javascript
// Add to kicked users list for admin panel
const kickedUser = addKickedUser({
    userId: user.telegramUserId,
    userName: `${user.firstName} ${user.lastName}`,
    reason: `Plan expired: ${paymentLink.plan_name} (${paymentLink.duration} days)`
});

// Emit notification to admin panel
io.emit('telegramKick', {
    userId: user.telegramUserId,
    user: `${user.firstName} ${user.lastName}`,
    reason: `Plan expired: ${paymentLink.plan_name} (${paymentLink.duration} days)`,
    time: new Date().toISOString(),
    channelId: CHANNEL_ID,
    planName: paymentLink.plan_name,
    duration: paymentLink.duration
});

usersKicked++;
console.log(`KICK_JOB: Successfully kicked user ${user.telegramUserId} - Plan: ${paymentLink.plan_name}`);
```

**What this does:**
- ✅ **Kicked users list** में add करता है
- ✅ **Real-time notification** admin panel को भेजता है
- ✅ **Complete details** store करता है
- ✅ **Success counter** increment करता है

---

## ❌ **Step 6: Error Handling**
```javascript
} catch (error) {
    console.error(`KICK_JOB: EXCEPTION caught for user ${user.telegramUserId}:`, error);
    
    // Emit error notification
    io.emit('telegramError', {
        userId: user.telegramUserId,
        error: error.message,
        time: new Date().toISOString()
    });
}
```

**What this does:**
- ✅ **Error catch** करता है
- ✅ **Error notification** admin panel को भेजता है
- ✅ **Process continue** करता है (other users के लिए)

---

## 📊 **Step 7: Final Summary**
```javascript
if (usersKicked > 0) {
    console.log(`KICK_JOB: Finished. Removed ${usersKicked} user(s) from channel.`);
} else {
    console.log('KICK_JOB: No expired users found.');
}
```

**What this does:**
- ✅ **Total kicked users** count करता है
- ✅ **Summary log** print करता है
- ✅ **Status report** provide करता है

---

## 🔄 **Complete Flow:**

```
1. ⏰ Every 5 minutes
   ↓
2. 🔍 Check MONGODB connection
   ↓
3. 📋 Find expired users in PaymentLink
   ↓
4. 👤 For each expired user:
   ↓
5. 🚫 Ban from Telegram channel
   ↓
6. 🔓 Unban (for future access)
   ↓
7. 📝 Add to kicked users list
   ↓
8. 📢 Send real-time notification
   ↓
9. ✅ Log success
   ↓
10. 📊 Show summary
```

---

## 🎯 **Key Functions:**

### **1. `kickExpiredUsers()`**
- **Location:** `backend/server.js` - Line 299
- **Purpose:** Main kick function
- **Frequency:** Every 5 minutes

### **2. `addKickedUser()`**
- **Location:** `backend/server.js` - Line 47
- **Purpose:** Add to kicked users list
- **Data:** User details and kick reason

### **3. `io.emit('telegramKick')`**
- **Location:** `backend/server.js` - Line 340
- **Purpose:** Real-time notification
- **Recipient:** Admin panel

---

## 📱 **Admin Panel Notifications:**

### **Success Notification:**
```javascript
{
  type: 'TELEGRAM_KICK',
  message: 'User kicked: John Doe (123456789)',
  reason: 'Plan expired: Pro Plan (30 days)',
  time: '2025-07-29T12:00:00.000Z',
  userId: '123456789',
  user: 'John Doe',
  planName: 'Pro Plan',
  duration: 30
}
```

### **Error Notification:**
```javascript
{
  type: 'TELEGRAM_KICK',
  message: 'Telegram bot error: User not found',
  userId: '123456789',
  error: 'User not found in channel',
  time: '2025-07-29T12:00:00.000Z'
}
```

---

## 🚀 **Summary:**

**User kick process:**
1. **⏰ Automatic** - Every 5 minutes
2. **🔍 Smart** - Only expired users
3. **🚫 Safe** - Ban + Unban method
4. **📢 Real-time** - Instant notifications
5. **📝 Complete** - Full tracking
6. **❌ Error-proof** - Handles failures

** आपका code automatically users को kick करता है जब उनका plan expire हो जाता है!** 🎯 