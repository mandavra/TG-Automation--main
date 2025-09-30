# 🔐 Admin API Documentation
**Telegram Subscription Management System - Admin Routes**

## 🏗️ **Authentication & Authorization**

### **Authentication**
All admin routes require JWT authentication:
```javascript
headers: {
  'Authorization': 'Bearer <jwt_token>'
}
```

### **Role-Based Access Control**
- **Regular Admin**: Can only access their own tenant data
- **Superadmin**: Can access all data across all tenants

### **Tenant Filtering Pattern**
Most admin routes follow this pattern:
```javascript
const adminId = req.adminContext?.adminId || req.admin._id;
const isSuper = req.admin?.role === 'superadmin';

// For most models (users, payments, documents, etc.)
const query = isSuper ? {} : { adminId: adminId };

// For groups/channel bundles (uses createdBy field)
const groupQuery = isSuper ? {} : { createdBy: adminId };
```

---

## 👤 **Admin Management Routes**

### **POST /api/admin/login**
Admin authentication
```javascript
Body: {
  "email": "admin@example.com",
  "password": "password123"
}
Response: {
  "token": "jwt_token",
  "admin": { "id": "...", "email": "...", "role": "admin|superadmin" }
}
```

### **GET /api/admin/me**
Get current admin profile
```javascript
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "admin": { "id": "...", "email": "...", "role": "admin" }
}
```

### **Superadmin Only Routes**
```javascript
GET /api/admin/list                           # List all admins
GET /api/admin/dashboard/stats                # System-wide statistics
GET /api/admin/dashboard/admin/:adminId/stats # Specific admin stats
POST /api/admin/impersonate/:adminId          # Impersonate admin
POST /api/admin/create-admin                  # Create new admin
PUT /api/admin/:id/email                      # Update admin email
PUT /api/admin/:id/password                   # Update admin password
DELETE /api/admin/:id                         # Delete admin
```

---

## 👥 **User Admin Routes**

### **GET /api/users/admin**
List all users with tenant filtering
```javascript
Query: {
  page: 1,
  limit: 10,
  search: "john",
  status: "joined|pending|active",
  dateRange: "7d|30d|90d"
}

// Superadmin sees all users
// Regular admin sees only users with adminId = admin._id
Response: {
  "users": [...],
  "pagination": { "page": 1, "limit": 10, "total": 100, "pages": 10 }
}
```

### **GET /api/users/admin/:userId**
Get user details
- **Superadmin**: Can access any user
- **Regular Admin**: Can only access users with `adminId = admin._id`

### **GET /api/users/admin/stats/dashboard**
User statistics dashboard
```javascript
// Superadmin sees system-wide stats
// Regular admin sees only their tenant stats
Response: {
  "stats": {
    "totalUsers": 500,
    "newUsers": 25,
    "activeUsers": 450,
    "telegramJoinedUsers": 425
  }
}
```

---

## 💳 **Payment Admin Routes**

### **GET /api/payments/admin**
List all payments with tenant filtering
```javascript
Query: {
  page: 1,
  limit: 10,
  search: "customer_name",
  status: "SUCCESS|PENDING|FAILED",
  dateRange: "7d|30d|90d",
  planId: "plan_id"
}

// Superadmin sees all payments
// Regular admin sees only payments with adminId = admin._id
Response: {
  "payments": [...],
  "pagination": { "page": 1, "limit": 10, "total": 200, "pages": 20 },
  "stats": { "statusBreakdown": [...] }
}
```

### **GET /api/payments/admin/:paymentId**
Get payment details
- **Superadmin**: Can access any payment
- **Regular Admin**: Can only access payments with `adminId = admin._id`

### **GET /api/payments/admin/stats/dashboard**
Payment analytics dashboard
```javascript
// Superadmin sees system-wide payment stats
// Regular admin sees only their tenant payment stats
Response: {
  "stats": {
    "totalPayments": 200,
    "successfulPayments": 180,
    "totalRevenue": 500000,
    "totalCommission": 50000,
    "conversionRate": "90.00"
  }
}
```

### **POST /api/payments/admin/:paymentId/refund**
Refund payment
- **Superadmin**: Can refund any payment
- **Regular Admin**: Can only refund their own payments

---

## 📄 **Document Admin Routes**

### **GET /api/documents/admin**
List all e-signed documents with tenant filtering
```javascript
Query: {
  page: 1,
  limit: 10,
  search: "document_name",
  status: "uploaded|sent_for_signing|signed|completed|failed",
  documentType: "kyc|agreement|invoice",
  dateRange: "7d|30d|90d"
}

// Superadmin sees all documents
// Regular admin sees only documents with adminId = admin._id
Response: {
  "documents": [...],
  "pagination": { "page": 1, "limit": 10, "total": 50, "pages": 5 },
  "stats": { "statusBreakdown": [...] }
}
```

### **GET /api/documents/admin/:documentId**
Get document details
- **Superadmin**: Can access any document
- **Regular Admin**: Can only access documents with `adminId = admin._id`

### **GET /api/documents/admin/:documentId/download/original**
Download original document
- **Superadmin**: Can download any document
- **Regular Admin**: Can only download their own documents

### **GET /api/documents/admin/:documentId/download/signed**
Download signed document
- **Superadmin**: Can download any signed document
- **Regular Admin**: Can only download their own signed documents

### **POST /api/documents/admin/:documentId/resend**
Resend document for signing
- **Superadmin**: Can resend any document
- **Regular Admin**: Can only resend their own documents

### **DELETE /api/documents/admin/:documentId**
Delete document (soft delete)
- **Superadmin**: Can delete any document
- **Regular Admin**: Can only delete their own documents

### **GET /api/documents/admin/stats/dashboard**
Document statistics dashboard
```javascript
// Superadmin sees system-wide document stats
// Regular admin sees only their tenant document stats
Response: {
  "stats": {
    "totalDocuments": 100,
    "signedDocuments": 85,
    "completedDocuments": 80,
    "expiredDocuments": 5,
    "completionRate": "85.00"
  }
}
```

---

## 🗂️ **KYC Admin Routes**

### **GET /api/kyc/admin**
List all KYC records with tenant filtering
```javascript
Query: {
  page: 1,
  limit: 10,
  search: "user_name",
  status: "submitted|verified|rejected|pending",
  dateRange: "7d|30d|90d"
}

// Superadmin sees all KYC records
// Regular admin sees only KYC records with adminId = admin._id
Response: {
  "kycRecords": [...],
  "pagination": { "page": 1, "limit": 10, "total": 150, "pages": 15 }
}
```

### **GET /api/kyc/admin/:kycId**
Get KYC details
- **Superadmin**: Can access any KYC record
- **Regular Admin**: Can only access KYC records with `adminId = admin._id`

### **PUT /api/kyc/admin/:kycId**
Update KYC status
- **Superadmin**: Can update any KYC record
- **Regular Admin**: Can only update their own KYC records

### **GET /api/kyc/admin/stats**
KYC statistics
```javascript
// Superadmin sees system-wide KYC stats
// Regular admin sees only their tenant KYC stats
Response: {
  "stats": {
    "totalRecords": 100,
    "verifiedRecords": 85,
    "pendingRecords": 10,
    "rejectedRecords": 5
  }
}
```

---

## 👥 **Channel Member Admin Routes**

### **GET /api/channel-members/admin**
List all channel members with tenant filtering
```javascript
Query: {
  page: 1,
  limit: 10,
  search: "user_name",
  status: "active|expired|kicked",
  channelId: "channel_id"
}

// Superadmin sees all channel members
// Regular admin sees only members with adminId = admin._id
Response: {
  "members": [...],
  "pagination": { "page": 1, "limit": 10, "total": 300, "pages": 30 }
}
```

### **GET /api/channel-members/admin/:memberId**
Get channel member details
- **Superadmin**: Can access any member
- **Regular Admin**: Can only access members with `adminId = admin._id`

### **POST /api/channel-members/admin/:memberId/extend**
Extend channel membership
- **Superadmin**: Can extend any membership
- **Regular Admin**: Can only extend their own members

### **GET /api/channel-members/admin/stats**
Channel member statistics
```javascript
// Superadmin sees system-wide member stats
// Regular admin sees only their tenant member stats
Response: {
  "stats": {
    "totalMembers": 300,
    "activeMembers": 250,
    "expiredMembers": 40,
    "kickedMembers": 10
  }
}
```

---

## 🧾 **Invoice Admin Routes**

### **GET /api/invoices/admin**
List all invoices with tenant filtering
```javascript
Query: {
  page: 1,
  limit: 10,
  search: "customer_name",
  status: "generated|sent|paid",
  dateRange: "7d|30d|90d"
}

// Superadmin sees all invoices
// Regular admin sees only invoices with adminId = admin._id
Response: {
  "invoices": [...],
  "pagination": { "page": 1, "limit": 10, "total": 80, "pages": 8 }
}
```

### **GET /api/invoices/:invoiceId/download**
Download invoice PDF
- **Superadmin**: Can download any invoice
- **Regular Admin**: Can only download invoices with `adminId = admin._id`

### **GET /api/invoices/:invoiceId/view**
View invoice PDF in browser
- **Superadmin**: Can view any invoice
- **Regular Admin**: Can only view invoices with `adminId = admin._id`

### **POST /api/invoices/:invoiceId/regenerate**
Regenerate invoice
- **Superadmin**: Can regenerate any invoice
- **Regular Admin**: Can only regenerate their own invoices

### **DELETE /api/invoices/:invoiceId**
Delete invoice
- **Superadmin**: Can delete any invoice
- **Regular Admin**: Can only delete their own invoices

---

## 📊 **Analytics Routes**

### **GET /api/analytics/revenue**
Revenue analytics with tenant filtering
```javascript
Query: {
  dateRange: "7d|30d|90d|1y",
  groupId: "group_id"
}

// Uses tenantMiddleware - superadmin sees all data
// Regular admin sees only their tenant data
Response: {
  "totalRevenue": 500000,
  "monthlyRevenue": 50000,
  "totalSubscriptions": 200,
  "topPlans": [...]
}
```

### **GET /api/analytics/user-growth**
User growth analytics
```javascript
// Uses tenantMiddleware for automatic tenant filtering
Response: {
  "userGrowth": [
    { "_id": { "year": 2024, "month": 1, "day": 15 }, "newUsers": 10 }
  ]
}
```

### **GET /api/analytics/export**
Export analytics data
```javascript
Query: {
  dateRange: "30d",
  format: "csv|json"
}
// Downloads CSV file or returns JSON with tenant-filtered data
```

---

## 🏦 **Withdrawal Routes**

### **Regular Admin Routes**
```javascript
GET /api/withdrawal/balance                   # Get admin's balance
POST /api/withdrawal/request                  # Create withdrawal request  
GET /api/withdrawal/my-requests              # Get admin's withdrawal history
```

### **Superadmin Only Routes**
```javascript
GET /api/withdrawal/admin/dashboard          # Withdrawal dashboard (all admins)
GET /api/withdrawal/admin/all-requests       # All withdrawal requests
PUT /api/withdrawal/admin/process/:requestId # Process withdrawal request
POST /api/withdrawal/admin/direct-withdrawal # Direct withdrawal for any admin
GET /api/withdrawal/admin/statistics         # System-wide withdrawal stats
GET /api/withdrawal/admin/:adminId/profile   # View admin's withdrawal profile
```

---

## 🏷️ **Group/Channel Bundle Routes**

### **GET /api/groups/all**
List all channel bundles
```javascript
// Uses tenantMiddleware
// Superadmin sees all groups across all tenants
// Regular admin sees only groups with createdBy = admin._id
Response: {
  "groups": [...],
  "adminSpecific": false // true for regular admin, false for superadmin
}
```

### **GET /api/groups/:id**
Get group details
- **Superadmin**: Can access any group
- **Regular Admin**: Can only access groups with `createdBy = admin._id`

### **PUT /api/groups/:id**
Update group
- **Superadmin**: Can update any group
- **Regular Admin**: Can only update groups with `createdBy = admin._id`

### **DELETE /api/groups/:id**
Delete group
- **Superadmin**: Can delete any group
- **Regular Admin**: Can only delete groups with `createdBy = admin._id`

### **POST /api/groups/:id/channels**
Add channel to group
- **Superadmin**: Can add channels to any group
- **Regular Admin**: Can only add channels to their own groups

---

## 📋 **Common Response Patterns**

### **Tenant-Aware List Response**
```javascript
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 10, 
    "total": 100,
    "pages": 10
  },
  "stats": {
    "total": 100,
    "statusBreakdown": [...]
  }
}
```

### **Error Responses**
```javascript
// Access denied (regular admin trying to access other tenant data)
{
  "error": "Access denied to this resource",
  "status": 403
}

// Resource not found (or no access)
{
  "error": "Resource not found",
  "status": 404
}

// Validation error
{
  "error": "Invalid input data",
  "details": [...],
  "status": 400
}
```

### **Superadmin Access Indicators**
Many routes include indicators showing if the current admin has elevated access:
```javascript
{
  "data": [...],
  "adminSpecific": false, // false = superadmin, true = regular admin
  "hasGlobalAccess": true // superadmin only
}
```

---

## 🔧 **Middleware Used**

### **All Admin Routes Use:**
1. **`adminAuth`** - JWT authentication
2. **`requireRole('admin')`** - Ensures admin role
3. **`injectAdminContext`** - Adds admin context to request

### **Analytics & Group Routes Also Use:**
4. **`tenantMiddleware`** - Provides tenant filtering helpers

### **Tenant Middleware Helpers**
```javascript
// Available in routes using tenantMiddleware
req.getTenantFilter()        // {} for superadmin, {adminId} for admin
req.getGroupTenantFilter()   // {} for superadmin, {createdBy} for admin
req.canAccessResource(id)    // true if admin can access resource
req.setAdminOwnership(data)  // Sets adminId on create operations
req.setGroupOwnership(data)  // Sets createdBy on group create operations
```

---

## 🚀 **Usage Examples**

### **Regular Admin - Filtered Access**
```javascript
// Admin with ID "admin123" makes request
GET /api/users/admin

// Internally becomes:
User.find({ adminId: "admin123" })

// Result: Only sees their own users
```

### **Superadmin - Global Access**
```javascript
// Superadmin makes same request
GET /api/users/admin

// Internally becomes:
User.find({}) // No filter

// Result: Sees all users across all tenants
```

### **Conditional Queries Pattern**
```javascript
// Standard pattern used across all admin routes
const adminId = req.adminContext?.adminId || req.admin._id;
const isSuper = req.admin?.role === 'superadmin';

const query = {
  // Other filters...
  ...(isSuper ? {} : { adminId: adminId })
};

const results = await Model.find(query);
```

---

## 🔐 **Security Notes**

### **Data Isolation**
- Regular admins cannot see data from other tenants
- All database queries are automatically filtered by tenant
- Superadmin access is explicitly checked and logged

### **Access Control**
- Route-level protection with role middleware
- Resource-level protection with tenant filtering
- Operation-level protection with ownership verification

### **Audit Trail**
- All admin actions are logged with admin context
- Superadmin actions are specially flagged
- Impersonation activities are tracked

---

## 📈 **Performance Considerations**

### **Database Indexes**
All tenant-filtering fields are indexed:
```javascript
adminId: { type: ObjectId, index: true }
createdBy: { type: ObjectId, index: true }
```

### **Query Optimization**
- Tenant filters are applied early in query pipeline
- Pagination is implemented efficiently
- Aggregation pipelines respect tenant boundaries

### **Caching Strategy**
- Tenant-specific caching keys
- Superadmin cache bypass for real-time data
- Route availability caching with tenant separation

---

This documentation covers all admin routes with their tenant-aware access patterns. The system ensures complete data isolation for regular admins while providing superadmin with full system access.
