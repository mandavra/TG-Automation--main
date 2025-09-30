# 🔐 Authentication & Authorization System
**Telegram Subscription Management System - Security Architecture**

## 🏗️ **Overview**

The system implements a robust multi-tenant authentication and authorization architecture with three distinct access levels:

1. **Public Users** - No authentication required for landing pages and user dashboards
2. **Regular Admins** - Tenant-isolated access to their own data only
3. **Superadmin** - Full system access across all tenants

---

## 🔑 **Authentication System**

### **JWT Token-Based Authentication**

#### **Admin Login Process**
```javascript
POST /api/admin/login
Body: {
  "email": "admin@example.com", 
  "password": "securePassword123"
}

Response: {
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "admin123",
    "email": "admin@example.com",
    "role": "admin", // or "superadmin"
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### **Token Validation Middleware**
```javascript
// backend/middlewares/adminAuth.js
const adminAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // Contains: { id, email, role, ... }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};
```

#### **Token Usage in Requests**
```javascript
// All admin routes require this header
headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

---

## 🛡️ **Authorization System**

### **Role-Based Access Control (RBAC)**

#### **Role Hierarchy**
```
superadmin (highest)
    ↓
admin (tenant-specific)
    ↓  
public (no auth)
```

#### **Role Middleware Implementation**
```javascript
// backend/middlewares/roleMiddleware.js
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.admin.role;
    const roles = ['admin', 'superadmin'];
    const requiredIndex = roles.indexOf(requiredRole);
    const userIndex = roles.indexOf(userRole);

    if (userIndex < requiredIndex) {
      return res.status(403).json({ 
        message: `Access denied. ${requiredRole} role required.` 
      });
    }

    next();
  };
};

// Usage examples:
router.use(requireRole('admin'));        // Admin or superadmin can access
router.use(requireRole('superadmin'));   // Only superadmin can access
```

### **Admin Context Injection**
```javascript
// backend/middlewares/injectAdminContext.js
const injectAdminContext = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ message: 'Admin authentication required' });
  }

  // Inject admin context for consistent access patterns
  req.adminContext = {
    adminId: req.admin._id || req.admin.id,
    role: req.admin.role,
    email: req.admin.email,
    firstName: req.admin.firstName,
    lastName: req.admin.lastName
  };

  next();
};
```

---

## 🏢 **Multi-Tenant Architecture**

### **Tenant Isolation Middleware**
```javascript
// backend/middlewares/tenantMiddleware.js
const tenantMiddleware = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ message: 'Admin authentication required' });
  }

  // Helper for standard tenant filtering (users, payments, documents, etc.)
  req.getTenantFilter = () => {
    if (req.admin.role === 'superadmin') {
      return {}; // No filter - see all data
    } else {
      return { adminId: req.admin._id }; // Filter by admin
    }
  };

  // Helper for group/channel bundle queries (uses createdBy field)
  req.getGroupTenantFilter = () => {
    if (req.admin.role === 'superadmin') {
      return {};
    } else {
      return { createdBy: req.admin._id };
    }
  };

  // Helper to check resource access
  req.canAccessResource = (resourceAdminId) => {
    if (req.admin.role === 'superadmin') {
      return true;
    }
    return resourceAdminId && resourceAdminId.toString() === req.admin._id.toString();
  };

  // Helper for create operations
  req.setAdminOwnership = (data) => {
    if (req.admin.role !== 'superadmin') {
      data.adminId = req.admin._id;
    }
    return data;
  };

  req.setGroupOwnership = (data) => {
    if (req.admin.role !== 'superadmin') {
      data.createdBy = req.admin._id;
    }
    return data;
  };

  next();
};
```

### **Data Isolation Patterns**

#### **Pattern 1: Manual Superadmin Check** (Used in most admin routes)
```javascript
// Standard pattern in controllers
const adminId = req.adminContext?.adminId || req.admin._id;
const isSuper = req.admin?.role === 'superadmin';

const query = {
  // Other filters...
  ...(isSuper ? {} : { adminId: adminId })
};

const results = await Model.find(query);
```

#### **Pattern 2: Tenant Middleware** (Used in analytics, groups)
```javascript
// Using tenant middleware helpers
const filter = req.getTenantFilter();
const results = await Model.find(filter);

// For groups
const groupFilter = req.getGroupTenantFilter();
const groups = await Group.find(groupFilter);
```

### **Database Field Mapping**
```javascript
// Standard tenant fields by model
Users, Payments, Documents, KYC, Invoices, ChannelMembers:
  adminId: ObjectId // Links to admin who owns this data

Groups (Channel Bundles):
  createdBy: ObjectId // Admin who created this group

WithdrawalRequests:
  adminId: ObjectId // Admin requesting withdrawal
```

---

## 🔒 **Access Control Examples**

### **Regular Admin Access**
```javascript
// Admin ID: "admin123", Role: "admin"

// 1. Users Route
GET /api/users/admin
// Query: { adminId: "admin123" }
// Result: Only sees users belonging to admin123

// 2. Payments Route  
GET /api/payments/admin
// Query: { adminId: "admin123" }
// Result: Only sees payments belonging to admin123

// 3. Groups Route
GET /api/groups/all
// Query: { createdBy: "admin123" }
// Result: Only sees groups created by admin123

// 4. Document Detail
GET /api/documents/admin/doc456
// Query: { documentId: "doc456", adminId: "admin123" }
// Result: 404 if document doesn't belong to admin123
```

### **Superadmin Access**
```javascript
// Admin ID: "superadmin456", Role: "superadmin"

// 1. Users Route
GET /api/users/admin
// Query: {} (no filter)
// Result: Sees ALL users across ALL tenants

// 2. Payments Route
GET /api/payments/admin  
// Query: {} (no filter)
// Result: Sees ALL payments across ALL tenants

// 3. Groups Route
GET /api/groups/all
// Query: {} (no filter)
// Result: Sees ALL groups across ALL tenants

// 4. Document Detail
GET /api/documents/admin/doc456
// Query: { documentId: "doc456" } (no adminId filter)
// Result: Can access ANY document regardless of owner
```

---

## 🚨 **Security Mechanisms**

### **Route Protection Layers**

#### **Layer 1: Authentication**
```javascript
router.use(adminAuth); // Validates JWT token
```

#### **Layer 2: Role Authorization**
```javascript
router.use(requireRole('admin')); // Ensures admin or superadmin role
```

#### **Layer 3: Tenant Isolation**
```javascript
router.use(injectAdminContext); // Injects admin context
// OR
router.use(tenantMiddleware); // Provides tenant filtering helpers
```

#### **Layer 4: Resource-Level Access**
```javascript
// In controller logic
const canAccess = req.canAccessResource(resource.adminId);
if (!canAccess) {
  return res.status(403).json({ error: 'Access denied' });
}
```

### **Superadmin-Only Routes**
```javascript
// Withdrawal management
router.get('/admin/dashboard', requireRole('superadmin'), controller.getDashboard);
router.put('/admin/process/:id', requireRole('superadmin'), controller.processRequest);

// Admin management  
router.post('/create-admin', requireRole('superadmin'), controller.createAdmin);
router.delete('/:id', requireRole('superadmin'), controller.deleteAdmin);

// System oversight
router.get('/dashboard/stats', requireRole('superadmin'), controller.getSystemStats);
router.post('/impersonate/:id', requireRole('superadmin'), controller.impersonateAdmin);
```

---

## 🔧 **Implementation Guidelines**

### **Adding New Admin Routes**

#### **Step 1: Apply Standard Middleware**
```javascript
const router = express.Router();

// Required for all admin routes
router.use(adminAuth);
router.use(requireRole('admin'));
router.use(injectAdminContext);

// Optional: for automatic tenant filtering
router.use(tenantMiddleware);
```

#### **Step 2: Implement Tenant Filtering**
```javascript
// Option A: Manual filtering (most common)
router.get('/admin', async (req, res) => {
  const adminId = req.adminContext?.adminId || req.admin._id;
  const isSuper = req.admin?.role === 'superadmin';
  
  const query = isSuper ? {} : { adminId: adminId };
  const results = await Model.find(query);
  
  res.json({ results });
});

// Option B: Using tenant middleware
router.get('/admin', async (req, res) => {
  const filter = req.getTenantFilter();
  const results = await Model.find(filter);
  
  res.json({ results });
});
```

#### **Step 3: Handle Individual Resource Access**
```javascript
router.get('/admin/:resourceId', async (req, res) => {
  const adminId = req.adminContext?.adminId || req.admin._id;
  const isSuper = req.admin?.role === 'superadmin';
  
  const query = isSuper ? 
    { _id: req.params.resourceId } : 
    { _id: req.params.resourceId, adminId: adminId };
    
  const resource = await Model.findOne(query);
  
  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  
  res.json({ resource });
});
```

### **Adding Superadmin-Only Routes**
```javascript
// Require superadmin role explicitly
router.get('/admin/global-stats', requireRole('superadmin'), async (req, res) => {
  // No tenant filtering - superadmin sees everything
  const stats = await Model.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  res.json({ stats });
});
```

---

## 🧪 **Testing Access Control**

### **Regular Admin Test**
```bash
# Login as regular admin
curl -X POST "http://localhost:4000/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# Extract token and test access
TOKEN="extracted_jwt_token"

# Should only see own data
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/users/admin"

# Should get 403 for superadmin routes
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/admin/list"
```

### **Superadmin Test**
```bash
# Login as superadmin
curl -X POST "http://localhost:4000/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@example.com", "password": "superPassword123"}'

# Extract token and test access
SUPER_TOKEN="extracted_jwt_token"

# Should see all data
curl -H "Authorization: Bearer $SUPER_TOKEN" \
  "http://localhost:4000/api/users/admin"

# Should access superadmin routes
curl -H "Authorization: Bearer $SUPER_TOKEN" \
  "http://localhost:4000/api/admin/list"
```

---

## 🗄️ **Database Security**

### **Indexed Tenant Fields**
All models include indexed tenant fields for efficient filtering:
```javascript
// Standard user-related models
const schema = new mongoose.Schema({
  adminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin',
    required: true,
    index: true // Essential for performance
  },
  // other fields...
});

// Group-related models  
const groupSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin', 
    required: true,
    index: true
  },
  // other fields...
});
```

### **Query Optimization**
```javascript
// Good: Tenant filter applied early
const query = { adminId: adminId, status: 'active' };
const users = await User.find(query).limit(10);

// Bad: Filtering after query (performance issue)
const allUsers = await User.find({ status: 'active' });
const filteredUsers = allUsers.filter(u => u.adminId === adminId);
```

---

## 🎯 **Access Patterns by Route Type**

### **List Routes** (GET /admin)
```javascript
// Pattern: Apply tenant filter to main query
const adminId = req.adminContext?.adminId || req.admin._id;
const isSuper = req.admin?.role === 'superadmin';

let query = {
  // Search filters...
  status: req.query.status
};

// Apply tenant isolation
if (!isSuper) {
  query.adminId = adminId;
}

const results = await Model.find(query);
```

### **Detail Routes** (GET /admin/:id)
```javascript
// Pattern: Include tenant filter in resource lookup
const adminId = req.adminContext?.adminId || req.admin._id;
const isSuper = req.admin?.role === 'superadmin';

const resourceQuery = isSuper ? 
  { _id: req.params.id } : 
  { _id: req.params.id, adminId: adminId };

const resource = await Model.findOne(resourceQuery);

if (!resource) {
  return res.status(404).json({ error: 'Resource not found' });
}
```

### **Statistics Routes** (GET /admin/stats/*)
```javascript
// Pattern: Apply tenant filter to aggregation pipeline
const adminId = req.adminContext?.adminId || req.admin._id;
const isSuper = req.admin?.role === 'superadmin';

const baseQuery = isSuper ? {} : { adminId: adminId };

const stats = await Model.aggregate([
  { $match: baseQuery },
  { $group: { _id: '$status', count: { $sum: 1 } } }
]);
```

### **Update/Delete Routes** (PUT/DELETE /admin/:id)
```javascript
// Pattern: Ensure resource access before operation
const adminId = req.adminContext?.adminId || req.admin._id;
const isSuper = req.admin?.role === 'superadmin';

const resourceQuery = isSuper ? 
  { _id: req.params.id } : 
  { _id: req.params.id, adminId: adminId };

const resource = await Model.findOne(resourceQuery);

if (!resource) {
  return res.status(404).json({ error: 'Resource not found' });
}

// Proceed with update/delete
await Model.findByIdAndUpdate(req.params.id, updateData);
```

---

## 🔍 **Middleware Stack Examples**

### **Standard Admin Route Stack**
```javascript
// Most admin routes use this stack
router.use(adminAuth);              // 1. Validate JWT
router.use(requireRole('admin'));   // 2. Ensure admin role
router.use(injectAdminContext);     // 3. Add admin context

// Route handlers can now use:
// - req.admin (JWT payload)
// - req.adminContext (structured admin data)
```

### **Tenant-Aware Route Stack**
```javascript
// Analytics and group routes use this stack
router.use(adminAuth);              // 1. Validate JWT
router.use(requireRole('admin'));   // 2. Ensure admin role  
router.use(tenantMiddleware);       // 3. Add tenant helpers
router.use(injectAdminContext);     // 4. Add admin context

// Route handlers can now use:
// - req.getTenantFilter()
// - req.getGroupTenantFilter()
// - req.canAccessResource(id)
// - req.setAdminOwnership(data)
```

### **Superadmin-Only Route Stack**
```javascript
// Superadmin routes use this stack
router.use(adminAuth);                    // 1. Validate JWT
router.use(requireRole('superadmin'));    // 2. Ensure superadmin role

// Route handlers have full system access
// No tenant filtering applied
```

---

## 🛡️ **Security Best Practices**

### **Token Security**
```javascript
// Secure JWT configuration
const token = jwt.sign(
  { 
    id: admin._id,
    email: admin.email,
    role: admin.role 
  },
  process.env.JWT_SECRET,
  { 
    expiresIn: '24h',          // Token expiry
    issuer: 'tg-automation',   // Token issuer
    audience: 'admin-api'      // Token audience
  }
);
```

### **Password Security**
```javascript
// Password hashing with bcrypt
const bcrypt = require('bcrypt');

// On registration/password change
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// On login
const isValidPassword = await bcrypt.compare(password, admin.password);
```

### **Input Validation**
```javascript
// Express validator middleware
const { body, validationResult } = require('express-validator');

router.post('/admin/create',
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['admin', 'superadmin']),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  controller.createAdmin
);
```

### **CORS Configuration**
```javascript
// Secure CORS setup
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',      // Development frontend
    'https://yourdomain.com'      // Production frontend
  ],
  credentials: true,              // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 🚨 **Common Security Pitfalls & Solutions**

### **❌ Insecure Pattern**
```javascript
// DON'T: Filtering after database query
const allUsers = await User.find({});
const filteredUsers = allUsers.filter(u => u.adminId === adminId);
```

### **✅ Secure Pattern**
```javascript
// DO: Filter in database query
const adminId = req.adminContext?.adminId;
const isSuper = req.admin?.role === 'superadmin';
const query = isSuper ? {} : { adminId: adminId };
const users = await User.find(query);
```

### **❌ Bypassing Access Control**
```javascript
// DON'T: Direct model access without tenant filtering
const user = await User.findById(userId);
```

### **✅ Proper Access Control**
```javascript
// DO: Include tenant filter in resource lookup
const userQuery = isSuper ? 
  { _id: userId } : 
  { _id: userId, adminId: adminId };
const user = await User.findOne(userQuery);
```

### **❌ Hardcoded Role Checks**
```javascript
// DON'T: Hardcode role checks
if (req.admin.role === 'superadmin') {
  // superadmin logic
}
```

### **✅ Middleware-Based Role Checks**
```javascript
// DO: Use middleware for consistent role checking
router.use(requireRole('superadmin'));
// OR
const isSuper = req.admin?.role === 'superadmin';
```

---

## 🔄 **Migration & Setup**

### **Creating Initial Superadmin**
```javascript
// Run this script to create first superadmin
const bcrypt = require('bcrypt');
const Admin = require('./models/admin.model');

async function createSuperAdmin() {
  const hashedPassword = await bcrypt.hash('superSecurePassword123', 12);
  
  const superAdmin = new Admin({
    email: 'superadmin@yourcompany.com',
    password: hashedPassword,
    role: 'superadmin',
    firstName: 'Super',
    lastName: 'Admin'
  });
  
  await superAdmin.save();
  console.log('Superadmin created successfully');
}

createSuperAdmin();
```

### **Existing Data Migration**
```javascript
// Migrate existing data to include adminId
const defaultAdmin = await Admin.findOne({ role: 'admin' });

// Update all existing records
await User.updateMany(
  { adminId: { $exists: false } },
  { adminId: defaultAdmin._id }
);

await PaymentLink.updateMany(
  { adminId: { $exists: false } },
  { adminId: defaultAdmin._id }
);
```

---

## 📊 **Monitoring & Auditing**

### **Access Logging**
```javascript
// Log all admin actions with context
const logAdminAction = (req, action, resource) => {
  console.log({
    timestamp: new Date(),
    adminId: req.adminContext?.adminId,
    adminEmail: req.adminContext?.email,
    role: req.adminContext?.role,
    action: action,
    resource: resource,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
};

// Usage in controllers
router.get('/admin/:id', async (req, res) => {
  logAdminAction(req, 'VIEW', `User:${req.params.id}`);
  // ... rest of handler
});
```

### **Security Metrics**
```javascript
// Track security-related metrics
const securityMetrics = {
  failedLogins: 0,
  successfulLogins: 0,
  unauthorizedAccess: 0,
  superadminActions: 0
};

// Update in middleware and controllers
```

---

## 🎯 **Quick Reference**

### **Superadmin Capabilities**
- ✅ View all admin accounts
- ✅ Create/update/delete admin accounts  
- ✅ Access all tenant data (users, payments, documents, etc.)
- ✅ Process withdrawal requests
- ✅ View system-wide statistics
- ✅ Impersonate other admins
- ✅ Global search across all tenants

### **Regular Admin Capabilities**
- ✅ Manage own users (with adminId = admin._id)
- ✅ Manage own payments (with adminId = admin._id)
- ✅ Manage own groups (with createdBy = admin._id)
- ✅ View own analytics and statistics
- ✅ Request withdrawals from own earnings
- ❌ Cannot access other tenants' data
- ❌ Cannot access superadmin routes

### **Security Guarantees**
- 🔒 Complete data isolation between tenants
- 🔒 Superadmin access is explicitly controlled
- 🔒 No data leakage between admin accounts
- 🔒 All access attempts are validated and logged
- 🔒 Role-based access control at multiple layers

This authentication and authorization system provides enterprise-grade security with complete tenant isolation while maintaining superadmin oversight capabilities.
