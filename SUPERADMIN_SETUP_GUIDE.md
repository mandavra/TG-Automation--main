# 👑 Superadmin Setup Guide
**Multi-Tenant System Administration Setup**

## 🎯 **Overview**

This guide covers setting up the multi-tenant system with superadmin capabilities. The system supports:

- **Regular Admins**: Manage their own tenant data (users, payments, documents, etc.)
- **Superadmin**: Global system access across all tenants with oversight capabilities

---

## 🚀 **Quick Setup (Development)**

### **1. Run Setup Scripts**
```bash
cd backend

# Install dependencies if not already done
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database and service credentials

# Run tenant migration (assigns existing data to default admin)
node scripts/migrateTenantData.js

# Create superadmin account
node scripts/createSuperAdmin.js

# Start development server
npm run dev
```

### **2. Access Admin Panel**
```bash
# Development URLs
Frontend: http://localhost:5173
Backend API: http://localhost:4000

# Login with superadmin credentials
Email: superadmin@yourcompany.com
Password: SuperSecurePassword123

# Or regular admin (created during migration)
Email: admin@example.com  
Password: defaultpassword123
```

---

## 🏭 **Production Setup**

### **1. Environment Configuration**

**File:** `backend/.env`
```env
# Production Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/telegram_payment_prod

# Admin System
SUPERADMIN_EMAIL=superadmin@yourcompany.com
SUPERADMIN_PASSWORD=YourSuperSecurePassword123
DEFAULT_ADMIN_EMAIL=admin@yourcompany.com
DEFAULT_ADMIN_PASSWORD=SecurePassword123

# Other production settings...
NODE_ENV=production
JWT_SECRET=your_super_secure_jwt_secret_for_production
```

### **2. Database Migration**
```bash
cd backend

# Run migration to add tenant isolation to existing data
node scripts/migrateTenantData.js

# Expected output:
# ✅ Connected to MongoDB
# 👤 Creating default admin...
# 📊 Migrating User records...
# 💳 Migrating PaymentLink records...
# 📄 Migrating DigioDocument records...
# 🧾 Migrating Invoice records...
# 👥 Migrating ChannelMember records...
# 🏷️ Migrating Group records...
# ✅ Migration completed successfully!
```

### **3. Superadmin Account Creation**
```bash
# Create superadmin account
node scripts/createSuperAdmin.js

# Expected output:
# 🚀 Starting Superadmin Account Creation...
# ✅ Connected to MongoDB
# 🔐 Hashing password...
# 👑 Creating superadmin account...
# ✅ Superadmin account created successfully!
# 🔐 Login Credentials:
#    Email: superadmin@yourcompany.com
#    Password: YourSuperSecurePassword123
```

### **4. Production Deployment**
```bash
# Start with PM2 for production
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Monitor
pm2 logs
pm2 monit
```

---

## 🔐 **Admin Account Management**

### **Default Accounts Created**

#### **Default Admin** (Created by migration)
```javascript
{
  email: "admin@example.com",           // or DEFAULT_ADMIN_EMAIL
  password: "defaultpassword123",       // or DEFAULT_ADMIN_PASSWORD
  role: "admin",
  firstName: "Default",
  lastName: "Admin"
}
```

#### **Superadmin** (Created by setup script)
```javascript
{
  email: "superadmin@yourcompany.com",  // or SUPERADMIN_EMAIL
  password: "SuperSecurePassword123",   // or SUPERADMIN_PASSWORD  
  role: "superadmin",
  firstName: "Super",
  lastName: "Admin"
}
```

### **Creating Additional Admins**

#### **Via Superadmin Panel**
```javascript
// Login as superadmin, then:
POST /api/admin/create-admin
Headers: { "Authorization": "Bearer <superadmin_token>" }
Body: {
  "email": "newadmin@example.com",
  "password": "SecurePassword123",
  "firstName": "New",
  "lastName": "Admin",
  "role": "admin"
}
```

#### **Via Script**
```javascript
// Create a custom script
const bcrypt = require('bcrypt');
const Admin = require('../models/admin.model');

async function createAdmin(email, password, firstName, lastName) {
  const hashedPassword = await bcrypt.hash(password, 12);
  
  const admin = new Admin({
    email,
    password: hashedPassword,
    role: 'admin',
    firstName,
    lastName
  });
  
  await admin.save();
  console.log(`Admin created: ${email}`);
}
```

---

## 🔍 **Superadmin Features Overview**

### **System-Wide Access**
```javascript
// Superadmin can access ANY data without tenant restrictions

// Users across all tenants
GET /api/users/admin
// Result: ALL users from ALL admins

// Payments across all tenants  
GET /api/payments/admin
// Result: ALL payments from ALL admins

// Documents across all tenants
GET /api/documents/admin
// Result: ALL documents from ALL admins
```

### **Admin Management**
```javascript
// Superadmin-only routes
GET /api/admin/list                           # List all admins
POST /api/admin/create-admin                  # Create new admin
PUT /api/admin/:id/email                      # Update admin email
PUT /api/admin/:id/password                   # Update admin password
DELETE /api/admin/:id                         # Delete admin
```

### **System Statistics**
```javascript
// Global system overview
GET /api/admin/dashboard/stats
Response: {
  "totalAdmins": 5,
  "totalUsers": 1000,
  "totalRevenue": 500000,
  "systemHealth": "excellent"
}

// Individual admin statistics
GET /api/admin/dashboard/admin/:adminId/stats
Response: {
  "admin": { "email": "admin@example.com" },
  "stats": {
    "users": 200,
    "revenue": 100000,
    "groups": 5
  }
}
```

### **Admin Impersonation**
```javascript
// Temporarily act as another admin
POST /api/admin/impersonate/:adminId
Headers: { "Authorization": "Bearer <superadmin_token>" }
Response: {
  "success": true,
  "impersonationToken": "temp_token_for_target_admin",
  "targetAdmin": { "email": "admin@example.com" }
}
```

### **Withdrawal Management**
```javascript
// Superadmin-only withdrawal routes
GET /api/withdrawal/admin/dashboard          # All withdrawal requests
GET /api/withdrawal/admin/all-requests       # Paginated request list
PUT /api/withdrawal/admin/process/:id        # Approve/reject requests
POST /api/withdrawal/admin/direct-withdrawal # Direct withdrawal for any admin
GET /api/withdrawal/admin/statistics         # System-wide withdrawal stats
```

---

## 🧪 **Testing the Setup**

### **1. Test Regular Admin Access**
```bash
# Login as regular admin
curl -X POST "http://localhost:4000/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "defaultpassword123"}'

# Test tenant isolation (should only see own data)
curl -H "Authorization: Bearer <admin_token>" \
  "http://localhost:4000/api/users/admin"

# Test superadmin routes (should get 403)
curl -H "Authorization: Bearer <admin_token>" \
  "http://localhost:4000/api/admin/list"
```

### **2. Test Superadmin Access**
```bash
# Login as superadmin
curl -X POST "http://localhost:4000/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@yourcompany.com", "password": "SuperSecurePassword123"}'

# Test global access (should see all data)
curl -H "Authorization: Bearer <superadmin_token>" \
  "http://localhost:4000/api/users/admin"

# Test superadmin routes (should work)
curl -H "Authorization: Bearer <superadmin_token>" \
  "http://localhost:4000/api/admin/list"
```

### **3. Test Tenant Isolation**
```bash
# Create test data for different admins
# Verify each admin only sees their own data
# Verify superadmin sees all data
```

---

## 🔒 **Security Configuration**

### **JWT Secret Configuration**
```javascript
// Generate secure JWT secret
const crypto = require('crypto');
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_SECRET=' + jwtSecret);

// Add to .env file
JWT_SECRET=your_generated_secure_secret
```

### **Password Policy**
```javascript
// Enforce strong passwords
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

  return password.length >= minLength && 
         hasUpperCase && 
         hasLowerCase && 
         hasNumbers && 
         hasSpecialChar;
};
```

### **Rate Limiting**
```javascript
// Add to server.js for production
const rateLimit = require('express-rate-limit');

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts'
});

app.use('/api/', apiLimiter);
app.use('/api/admin/login', authLimiter);
```

---

## 📊 **Admin Dashboard Features**

### **Superadmin Dashboard**
```javascript
// System overview for superadmin
{
  "systemStats": {
    "totalAdmins": 10,
    "totalUsers": 5000,
    "totalRevenue": 2500000,
    "totalGroups": 50,
    "activeMemberships": 4500
  },
  "adminBreakdown": [
    {
      "adminId": "admin1",
      "email": "admin1@example.com", 
      "users": 500,
      "revenue": 250000,
      "groups": 5
    }
  ],
  "recentActivity": [...],
  "systemHealth": "excellent"
}
```

### **Regular Admin Dashboard**
```javascript
// Tenant-specific dashboard for regular admin
{
  "tenantStats": {
    "totalUsers": 500,        // Only this admin's users
    "totalRevenue": 250000,   // Only this admin's revenue
    "totalGroups": 5,         // Only this admin's groups
    "activeMemberships": 450  // Only this admin's memberships
  },
  "recentActivity": [...],    // Only this admin's activities
  "tenantSpecific": true      // Indicates filtered data
}
```

---

## 🔧 **Maintenance & Updates**

### **Updating Admin Roles**
```javascript
// Promote admin to superadmin
await Admin.findByIdAndUpdate(adminId, { role: 'superadmin' });

// Demote superadmin to admin  
await Admin.findByIdAndUpdate(adminId, { role: 'admin' });
```

### **Data Cleanup Scripts**
```javascript
// Clean up orphaned records (no associated admin)
const cleanupOrphanedData = async () => {
  const validAdminIds = await Admin.find().distinct('_id');
  
  // Remove users without valid adminId
  await User.deleteMany({ 
    adminId: { $nin: validAdminIds } 
  });
  
  // Remove payments without valid adminId
  await PaymentLink.deleteMany({ 
    adminId: { $nin: validAdminIds } 
  });
  
  console.log('Cleanup completed');
};
```

### **Admin Account Audit**
```javascript
// Generate admin account report
const auditAdmins = async () => {
  const admins = await Admin.find();
  
  for (const admin of admins) {
    const userCount = await User.countDocuments({ adminId: admin._id });
    const revenue = await PaymentLink.aggregate([
      { $match: { adminId: admin._id, status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    console.log(`Admin: ${admin.email}`);
    console.log(`  Role: ${admin.role}`);
    console.log(`  Users: ${userCount}`);
    console.log(`  Revenue: ₹${revenue[0]?.total || 0}`);
    console.log('---');
  }
};
```

---

## 🚨 **Security Best Practices**

### **1. Change Default Passwords**
```bash
# Immediately after setup, change default passwords
# Via admin panel or directly in database

# For superadmin
curl -X PUT "https://yourdomain.com/api/admin/:superadminId/password" \
  -H "Authorization: Bearer <superadmin_token>" \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "YourNewSuperSecurePassword"}'

# For default admin
curl -X PUT "https://yourdomain.com/api/admin/:adminId/password" \
  -H "Authorization: Bearer <superadmin_token>" \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "YourNewSecurePassword"}'
```

### **2. Environment Variable Security**
```bash
# Remove sensitive values from .env after initial setup
# Keep only runtime configuration

# Remove after setup:
# SUPERADMIN_PASSWORD=...
# DEFAULT_ADMIN_PASSWORD=...

# Keep for runtime:
JWT_SECRET=...
MONGODB_URI=...
```

### **3. Access Logging**
```javascript
// Enable admin action logging in production
const logAdminAction = (req, action, resource) => {
  const logEntry = {
    timestamp: new Date(),
    adminId: req.adminContext?.adminId,
    adminEmail: req.adminContext?.email,
    role: req.adminContext?.role,
    action: action,
    resource: resource,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };
  
  console.log('ADMIN_ACTION:', JSON.stringify(logEntry));
  
  // In production, send to logging service
  // logger.info('admin_action', logEntry);
};
```

---

## 🎯 **Feature Verification**

### **1. Tenant Isolation Test**
```javascript
// Create test data for multiple admins
// Verify data isolation is working

const testTenantIsolation = async () => {
  // Login as Admin A
  const adminAToken = await loginAdmin('adminA@test.com');
  
  // Login as Admin B  
  const adminBToken = await loginAdmin('adminB@test.com');
  
  // Create user under Admin A
  const userA = await createUser(adminAToken, { name: 'User A' });
  
  // Try to access User A with Admin B token (should fail)
  const response = await fetch(`/api/users/admin/${userA.id}`, {
    headers: { 'Authorization': `Bearer ${adminBToken}` }
  });
  
  console.log('Cross-tenant access test:', response.status); // Should be 404
};
```

### **2. Superadmin Access Test**
```javascript
// Verify superadmin can access all tenant data
const testSuperadminAccess = async () => {
  const superadminToken = await loginAdmin('superadmin@yourcompany.com');
  
  // Should see all users across all tenants
  const allUsers = await fetch('/api/users/admin', {
    headers: { 'Authorization': `Bearer ${superadminToken}` }
  });
  
  const userData = await allUsers.json();
  console.log('Superadmin sees users from all tenants:', userData.users.length);
  
  // Should access admin management routes
  const adminList = await fetch('/api/admin/list', {
    headers: { 'Authorization': `Bearer ${superadminToken}` }
  });
  
  console.log('Admin list access:', adminList.status); // Should be 200
};
```

---

## 📚 **Common Use Cases**

### **1. Onboarding New Admin**
```javascript
// Superadmin creates new admin account
1. Login to superadmin panel
2. Navigate to Admin Management
3. Click "Create New Admin"
4. Fill admin details:
   - Email: newadmin@business.com
   - Password: SecurePassword123
   - Name: Business Owner
   - Role: admin
5. New admin can now login and create their groups/plans
```

### **2. Managing Admin Withdrawals**
```javascript
// Superadmin processes withdrawal requests
1. Login to superadmin panel
2. Navigate to Withdrawal Management  
3. View pending requests from all admins
4. Review request details and admin balance
5. Approve or reject with processing notes
6. System updates admin balance automatically
```

### **3. System Monitoring**
```javascript
// Superadmin monitors system health
1. View system-wide statistics dashboard
2. Monitor individual admin performance
3. Check for suspicious activities or errors
4. Review cross-tenant access attempts (should be none)
5. Generate system health reports
```

### **4. Data Recovery/Migration**
```javascript
// Superadmin handles data issues
1. Access any tenant's data for troubleshooting
2. Move users between admins if needed
3. Recover deleted data from backups
4. Migrate data during admin account changes
```

---

## 🔧 **Troubleshooting**

### **Common Setup Issues**

#### **Migration Script Fails**
```bash
# Error: Cannot connect to database
# Solution: Check MONGODB_URI in .env

# Error: Admin model not found
# Solution: Ensure you're running from backend directory

# Error: Validation failed
# Solution: Check admin model schema requirements
```

#### **Superadmin Creation Fails**
```bash
# Error: Email already exists
# Solution: Use different email or delete existing admin

# Error: Password too weak
# Solution: Use password with 8+ characters

# Error: Database connection failed
# Solution: Verify MongoDB URI and network access
```

#### **Access Control Issues**
```bash
# Problem: Regular admin can see other tenant data
# Solution: Verify tenant middleware is applied to routes

# Problem: Superadmin cannot access certain routes
# Solution: Check if requireRole('superadmin') is correctly applied

# Problem: 404 errors for valid resources
# Solution: Verify tenant filtering is not too restrictive
```

---

## 📈 **Scaling Considerations**

### **Multiple Superadmins**
```javascript
// For large systems, create multiple superadmins
const createAdditionalSuperAdmin = async (email, password) => {
  const hashedPassword = await bcrypt.hash(password, 12);
  
  const superAdmin = new Admin({
    email: email,
    password: hashedPassword,
    role: 'superadmin',
    firstName: 'Super',
    lastName: 'Admin'
  });
  
  await superAdmin.save();
};
```

### **Admin Role Hierarchy**
```javascript
// Consider adding intermediate roles for large systems
const roleHierarchy = {
  'user': 0,
  'admin': 1,
  'manager': 2,      // Can manage multiple admins
  'superadmin': 3    // Full system access
};
```

---

## 🎉 **Setup Complete!**

After completing this setup, you will have:

✅ **Multi-Tenant System** - Complete data isolation between admins
✅ **Superadmin Account** - Full system oversight and management
✅ **Secure Authentication** - JWT-based with role-based access control
✅ **Tenant Migration** - Existing data properly attributed to admins
✅ **Production Ready** - Secure configuration for live deployment

Your system is now ready to support multiple independent admin businesses with complete data privacy and superadmin oversight capabilities!

### **Next Steps**
1. 🔐 Change all default passwords
2. 🧪 Test the system with small amounts
3. 📊 Set up monitoring and alerts
4. 🚀 Launch and monitor first real users
5. 📈 Scale based on usage patterns

---

## 📞 **Support & Resources**

- 📖 **API Documentation**: `API_DOCUMENTATION.md`
- 🔐 **Auth System**: `AUTHENTICATION_AUTHORIZATION.md`
- 🏢 **Tenant Architecture**: `TENANT_ARCHITECTURE.md`
- 🗄️ **Multi-Tenant Setup**: `MULTI_TENANT_SETUP.md`
