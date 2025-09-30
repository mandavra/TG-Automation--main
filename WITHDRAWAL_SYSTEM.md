# Admin Withdrawal Management System

## Overview
A comprehensive withdrawal system that allows regular admins to request withdrawals from their earnings, while super admins have full control to approve/reject requests and directly withdraw from any admin's account.

## System Architecture

### **Admin Flow:**
1. **View Balance**: Check total earnings, withdrawn amounts, and available balance
2. **Request Withdrawal**: Submit withdrawal requests with bank/UPI details
3. **Track Requests**: Monitor status of withdrawal requests (pending/approved/rejected/completed)

### **Super Admin Flow:**
1. **Dashboard**: View all withdrawal statistics and pending requests
2. **Manage Requests**: Approve or reject admin withdrawal requests
3. **Direct Withdrawals**: Directly withdraw from any admin's account
4. **Admin Profiles**: View individual admin earnings and withdrawal history

## Database Schema

### WithdrawalRequest Model
```javascript
{
  adminId: ObjectId,           // Admin requesting withdrawal
  amount: Number,              // Withdrawal amount
  status: String,              // pending/approved/rejected/completed/failed
  paymentMethod: String,       // bank_transfer/upi/wallet
  bankDetails: {               // Bank account details
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountHolderName: String,
    upiId: String              // For UPI payments
  },
  adminNotes: String,          // Admin's withdrawal reason
  processingNotes: String,     // Super admin's processing notes
  processedBy: ObjectId,       // Super admin who processed
  processedAt: Date,           // Processing timestamp
  transactionId: String,       // Bank transaction reference
  type: String,                // 'request' or 'direct'
  availableBalance: Number     // Balance at request time
}
```

## API Endpoints

### **Admin Endpoints**

#### Get Admin Balance
```
GET /api/withdrawal/balance
Authorization: Bearer <admin_token>
```
**Response:**
```json
{
  "success": true,
  "balance": {
    "totalRevenue": 5000,
    "totalWithdrawn": 1000,
    "availableBalance": 4000
  }
}
```

#### Submit Withdrawal Request
```
POST /api/withdrawal/request
Authorization: Bearer <admin_token>
```
**Request Body:**
```json
{
  "amount": 1000,
  "paymentMethod": "bank_transfer",
  "bankDetails": {
    "accountNumber": "1234567890",
    "ifscCode": "HDFC0001234",
    "bankName": "HDFC Bank",
    "accountHolderName": "Admin Name"
  },
  "adminNotes": "Monthly withdrawal"
}
```

#### Get My Withdrawal Requests
```
GET /api/withdrawal/my-requests?status=pending&page=1&limit=10
Authorization: Bearer <admin_token>
```

### **Super Admin Endpoints**

#### Withdrawal Dashboard
```
GET /api/withdrawal/admin/dashboard
Authorization: Bearer <super_admin_token>
```
**Response:**
```json
{
  "success": true,
  "dashboard": {
    "pendingCount": 5,
    "recentRequests": [...],
    "stats": {
      "pending": { "count": 5, "amount": 15000 },
      "approved": { "count": 10, "amount": 25000 }
    },
    "adminSummary": [...]
  }
}
```

#### Get All Withdrawal Requests
```
GET /api/withdrawal/admin/all-requests?status=pending&page=1
Authorization: Bearer <super_admin_token>
```

#### Process Withdrawal Request
```
PUT /api/withdrawal/admin/process/:requestId
Authorization: Bearer <super_admin_token>
```
**Request Body:**
```json
{
  "action": "approve",  // or "reject"
  "processingNotes": "Approved for processing",
  "transactionId": "TXN123456789"
}
```

#### Direct Withdrawal
```
POST /api/withdrawal/admin/direct-withdrawal
Authorization: Bearer <super_admin_token>
```
**Request Body:**
```json
{
  "targetAdminId": "64a1b2c3d4e5f6789012345",
  "amount": 500,
  "processingNotes": "Emergency withdrawal",
  "paymentMethod": "upi",
  "bankDetails": {
    "upiId": "admin@paytm"
  },
  "transactionId": "UPI123456"
}
```

#### Get Admin Withdrawal Profile
```
GET /api/withdrawal/admin/:adminId/profile
Authorization: Bearer <super_admin_token>
```

#### Withdrawal Statistics
```
GET /api/withdrawal/admin/statistics
Authorization: Bearer <super_admin_token>
```

## Balance Calculation System

The system calculates admin balance using:

1. **Total Earnings**: Sum of `adminCommission` from successful payments
2. **Total Withdrawn**: Sum of approved/completed withdrawal amounts
3. **Pending Withdrawals**: Sum of pending withdrawal requests
4. **Available Balance**: `Total Earnings - Total Withdrawn - Pending Withdrawals`

## Withdrawal Status Flow

```
1. pending    → (Super admin approves) → approved → completed
              → (Super admin rejects)  → rejected

2. direct     → (Super admin creates) → completed (immediate)
```

## Security Features

### **Role-Based Access Control**
- ✅ Regular admins: Can only view/manage their own withdrawals
- ✅ Super admins: Can manage all admin withdrawals + direct withdrawals
- ✅ Tenant isolation: Each admin isolated from others

### **Data Validation**
- ✅ Balance validation before processing
- ✅ Required bank details validation
- ✅ Amount validation (positive numbers)
- ✅ Status transition validation

### **Audit Trail**
- ✅ All actions logged with timestamps
- ✅ Processing admin tracking
- ✅ Transaction ID recording
- ✅ Status change history

## Super Admin Dashboard Features

### **Withdrawal Management**
1. **Pending Requests**: Quick view of all pending withdrawals
2. **Bulk Actions**: Process multiple requests at once
3. **Admin Overview**: See each admin's total earnings and withdrawals
4. **Transaction History**: Complete withdrawal audit trail

### **Direct Withdrawal Capabilities**
1. **Emergency Withdrawals**: Direct withdrawal from any admin account
2. **Balance Validation**: Prevents overdraft situations  
3. **Instant Processing**: No approval workflow needed
4. **Full Audit**: All direct withdrawals tracked and logged

### **Analytics & Reporting**
1. **Withdrawal Statistics**: Total amounts, success rates, etc.
2. **Admin Performance**: Individual admin earning reports
3. **Payment Method Analytics**: Preferred withdrawal methods
4. **Timeline Reports**: Withdrawal trends over time

## Implementation Status

### ✅ **Completed Features**
- [x] Withdrawal request model with full schema
- [x] Admin balance calculation system
- [x] Admin withdrawal request submission
- [x] Super admin approval/rejection system
- [x] Direct withdrawal by super admin
- [x] Comprehensive API endpoints
- [x] Role-based access control
- [x] Tenant isolation
- [x] Balance validation
- [x] Audit trail and logging

### ✅ **Working Endpoints (Tested)**
- [x] `/api/withdrawal/balance` - Admin balance
- [x] `/api/withdrawal/my-requests` - Admin requests
- [x] `/api/withdrawal/admin/dashboard` - Super admin dashboard
- [x] `/api/withdrawal/admin/all-requests` - All requests
- [x] `/api/withdrawal/admin/statistics` - Statistics
- [x] `/api/admin/dashboard/stats` - Enhanced with withdrawal data

## Usage Examples

### **Admin Requesting Withdrawal**
```javascript
// Check balance first
const balance = await fetch('/api/withdrawal/balance', {
  headers: { Authorization: `Bearer ${adminToken}` }
});

// Submit withdrawal request
const request = await fetch('/api/withdrawal/request', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 1000,
    paymentMethod: 'bank_transfer',
    bankDetails: { /* bank details */ }
  })
});
```

### **Super Admin Processing Requests**
```javascript
// Get pending requests
const pending = await fetch('/api/withdrawal/admin/all-requests?status=pending', {
  headers: { Authorization: `Bearer ${superAdminToken}` }
});

// Approve a request
const approval = await fetch(`/api/withdrawal/admin/process/${requestId}`, {
  method: 'PUT',
  headers: { 
    'Authorization': `Bearer ${superAdminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'approve',
    processingNotes: 'Approved for processing'
  })
});
```

## Future Enhancements

### **Planned Features**
- [ ] Email notifications for request status updates
- [ ] Automated withdrawal processing integration
- [ ] Withdrawal limits and thresholds
- [ ] Recurring withdrawal schedules
- [ ] Multi-currency support
- [ ] Advanced reporting dashboards
- [ ] Mobile-friendly admin interfaces

The withdrawal system is now fully functional and ready for production use! 🎉