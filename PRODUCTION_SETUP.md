# 🚀 Production Setup Guide

## 🔧 **Production Configuration Changes**

### **1. Update Cron Schedule (IMPORTANT)**

**File:** `backend/jobs/expireUsersJob.js`
```javascript
// CHANGE FROM (testing):
cron.schedule('* * * * *', checkExpiredUsers);  // Every minute

// CHANGE TO (production):
cron.schedule('0 2 * * *', checkExpiredUsers);  // Daily at 2 AM

// Remove testing logs:
// console.log('⏰ Expiry job scheduled to run every minute for testing');
// console.log('📋 Change to "0 2 * * *" for production (daily at 2 AM)');
```

### **2. Production Environment Variables**

**File:** `backend/.env`
```env
# Database (Use production MongoDB cluster)
MONGODB_URI=mongodb+srv://username:password@production-cluster.mongodb.net/telegram_payment_prod

# Server Configuration
NODE_ENV=production
PORT=4000
BACKEND_URL=https://yourdomain.com
FRONTEND_URL=https://yourfrontend.com

# Admin System
DEFAULT_ADMIN_EMAIL=admin@yourcompany.com
DEFAULT_ADMIN_PASSWORD=SecurePassword123
SUPERADMIN_EMAIL=superadmin@yourcompany.com
SUPERADMIN_PASSWORD=SuperSecurePassword123

# Telegram Bot (Use production bot)
BOT_TOKEN=your_production_bot_token
CHANNEL_ID=your_production_channel_id
ADMIN_USER_IDS=your_telegram_user_id

# Cashfree (Use LIVE credentials)
CASHFREE_BASE_URL=https://api.cashfree.com/pg
CASHFREE_CLIENT_ID=your_live_client_id
CASHFREE_CLIENT_SECRET=your_live_client_secret

# Security
JWT_SECRET=strong_random_jwt_secret_for_production

# Email (Production SMTP)
EMAIL_SERVICE=gmail
EMAIL_USER=your_production_email@gmail.com
EMAIL_PASS=your_app_password

# Other services
DIGIO_CLIENT_ID=your_production_digio_id
DIGIO_CLIENT_SECRET=your_production_digio_secret
```

**File:** `TG Bot Script/.env`
```env
# Telegram Bot (Same as backend)
BOT_TOKEN=your_production_bot_token
CHANNEL_ID=your_production_channel_id
ADMIN_USER_IDS=your_telegram_user_id

# Backend URL (Production)
BACKEND_URL=https://yourdomain.com
```

### **3. Security Enhancements**

**Add to backend/server.js:**
```javascript
// Production security middleware
if (process.env.NODE_ENV === 'production') {
  const helmet = require('helmet');
  const rateLimit = require('express-rate-limit');
  
  app.use(helmet());
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use(limiter);
}
```

### **4. Remove Test Features**

**Remove from telegramController.js:**
```javascript
// Remove or comment out the test link storage endpoint
// router.post('/store-test-link', storeTestLink);
```

## 🌐 **Deployment Architecture**

### **Recommended Production Setup:**

```
🌍 INTERNET
    ↓
🔒 CLOUDFLARE/CDN
    ↓
🖥️  PRODUCTION SERVER (VPS/Cloud)
    ├── 🔧 PM2 Process Manager
    ├── 🐳 Docker Containers (Optional)
    ├── 🔄 Nginx Reverse Proxy
    └── 📊 MongoDB Atlas (Cloud)
```

### **Server Requirements:**
- **CPU:** 2+ cores
- **RAM:** 4GB+ 
- **Storage:** 20GB+ SSD
- **OS:** Ubuntu 20.04 LTS or newer
- **Node.js:** v16+
- **Python:** 3.8+

## 📦 **Production Deployment Steps**

### **1. Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python
sudo apt install python3 python3-pip -y

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

### **2. Deploy Backend**
```bash
# Clone your repository
git clone https://github.com/yourusername/telegram-payment-system.git
cd telegram-payment-system/backend

# Install dependencies
npm install --production

# Create production .env file
cp .env.example .env
nano .env  # Add your production values

# Run tenant data migration (IMPORTANT for multi-tenant setup)
node scripts/migrateTenantData.js

# Create superadmin account
node scripts/createSuperAdmin.js

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### **3. Deploy Telegram Bot**
```bash
cd ../TG\ Bot\ Script

# Install Python dependencies
pip3 install -r requirements.txt

# Create production .env file
cp .env.example .env
nano .env  # Add your production values

# Start with PM2
pm2 start ecosystem.config.js --name telegram-bot
```

### **4. Configure Nginx**
```nginx
# /etc/nginx/sites-available/telegram-payment
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **5. SSL Certificate**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔄 **Process Management with PM2**

**File:** `ecosystem.config.js`
```javascript
module.exports = {
  apps: [
    {
      name: 'telegram-backend',
      script: 'server.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    },
    {
      name: 'telegram-bot',
      script: 'TG_Automation.py',
      cwd: './TG Bot Script',
      interpreter: 'python3',
      instances: 1,
      env_production: {
        PYTHONPATH: '/usr/bin/python3'
      }
    }
  ]
};
```

## 📊 **Monitoring & Logging**

### **1. PM2 Monitoring**
```bash
# View logs
pm2 logs

# Monitor processes
pm2 monit

# Restart services
pm2 restart all

# View status
pm2 status
```

### **2. Database Monitoring**
```bash
# MongoDB Atlas provides built-in monitoring
# Set up alerts for:
# - High connection count
# - Slow queries
# - Storage usage
# - Memory usage
```

### **3. Application Monitoring**
```javascript
// Add to server.js for production logging
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 🔒 **Security Checklist**

### **Basic Security**
- [ ] **Environment Variables** - All sensitive data in .env files
- [ ] **HTTPS** - SSL certificate installed and configured
- [ ] **Rate Limiting** - API endpoints protected from abuse
- [ ] **Input Validation** - All user inputs sanitized
- [ ] **Database Security** - MongoDB authentication enabled
- [ ] **Bot Token Security** - Telegram bot token kept secret
- [ ] **Firewall** - Only necessary ports open (80, 443, 22)
- [ ] **Regular Updates** - System and dependencies updated
- [ ] **Backup Strategy** - Database backups automated
- [ ] **Monitoring** - Error alerts configured

### **Multi-Tenant Security**
- [ ] **Tenant Data Migration** - All existing data assigned to default admin
- [ ] **Superadmin Account** - Created with strong password
- [ ] **Admin Access Control** - Role-based permissions verified
- [ ] **Data Isolation** - Cross-tenant access prevented
- [ ] **Audit Logging** - Admin actions logged with context
- [ ] **Default Passwords Changed** - All default credentials updated

## 🚨 **Go-Live Checklist**

### **Pre-Launch**
- [ ] Test all payment flows with real money (small amounts)
- [ ] Verify Telegram bot permissions in production channel
- [ ] Test webhook endpoints with production URLs
- [ ] Confirm email notifications work
- [ ] Test user removal/expiry system
- [ ] Load test with expected user volume
- [ ] Set up monitoring and alerts

### **Launch Day**
- [ ] Switch DNS to production server
- [ ] Monitor logs for any errors
- [ ] Test first few real user registrations
- [ ] Verify payment gateway integration
- [ ] Check Telegram bot responsiveness
- [ ] Monitor database performance

### **Post-Launch**
- [ ] Daily monitoring of user activity
- [ ] Weekly review of payment success rates
- [ ] Monthly database cleanup and optimization
- [ ] Regular security updates
- [ ] Backup verification

---

## 🎯 **Your System is Production Ready!**

With these configurations, your Telegram payment integration system will be:
✅ **Secure** - Industry-standard security practices
✅ **Scalable** - Can handle thousands of users
✅ **Reliable** - Automated monitoring and recovery
✅ **Maintainable** - Proper logging and process management