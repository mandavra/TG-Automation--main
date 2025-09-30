const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true, unique: true },
  billDate: { type: Date, required: true },
  dueDate: { type: Date }, // New: payment due date
  
  billedTo: {
    name: String,
    phone: String,
    email: String,
    address: String,
    stateCode: String
  },
  
  creator: {
    name: String,
    pan: String,
    gstin: String,
    address: String,
    stateCode: String,
    email: String,        // New: company email
    phone: String,        // New: company phone
    website: String       // New: company website
  },
  
  // Invoice items (enhanced for multiple items support)
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true }
  }],
  
  // Legacy fields for backward compatibility
  description: String,
  price: Number,
  
  // Tax calculations
  igst: Number,
  igstAmt: Number,
  cgst: Number,
  cgstAmt: Number,
  sgst: Number,
  sgstAmt: Number,
  
  // Enhanced tax breakdown
  taxBreakdown: {
    taxableAmount: Number,
    igstRate: Number,
    igstAmount: Number,
    cgstRate: Number,
    cgstAmount: Number,
    sgstRate: Number,
    sgstAmount: Number,
    totalTax: Number,
    grandTotal: Number
  },
  
  total: { type: Number, required: true },
  
  // Payment information
  transactionId: String,
  paymentStatus: { 
    type: String, 
    enum: ['Paid', 'Pending', 'Overdue', 'Cancelled', 'Refunded'], 
    default: 'Pending' 
  },
  paymentDate: Date,
  paymentMethod: String,
  
  // Invoice status and workflow
  status: { 
    type: String, 
    enum: ['Draft', 'Generated', 'Sent', 'Viewed', 'Paid', 'Overdue', 'Cancelled'], 
    default: 'Generated' 
  },
  
  // File management
  localPdfPath: String,
  filename: String,
  fileSize: Number,
  
  // Template and customization
  templateType: { 
    type: String, 
    enum: ['professional', 'minimal', 'corporate', 'custom'], 
    default: 'professional' 
  },
  
  // Service period dates
  serviceStartDate: Date,
  serviceEndDate: Date,
  
  // Additional settings
  currency: { type: String, default: 'INR' },
  paymentTerms: { type: Number, default: 30 }, // days
  
  // Notes and terms
  notes: String,
  termsAndConditions: String,
  
  // Tracking and analytics
  views: { type: Number, default: 0 },
  lastViewed: Date,
  emailsSent: { type: Number, default: 0 },
  lastEmailSent: Date,
  
  // Admin and user references
  userid: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  
  // Metadata for audit trail
  metadata: {
    generatedBy: String,
    generatedAt: Date,
    ipAddress: String,
    userAgent: String,
    lastModifiedBy: String,
    lastModifiedAt: Date
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for days overdue
invoiceSchema.virtual('daysOverdue').get(function() {
  if (this.paymentStatus === 'Paid' || !this.dueDate) return 0;
  const today = new Date();
  const diffTime = today - this.dueDate;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// Virtual for formatted amount
invoiceSchema.virtual('formattedTotal').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: this.currency || 'INR'
  }).format(this.total);
});

// Indexes for better query performance and data integrity
invoiceSchema.index({ invoiceNo: 1 }, { unique: true }); // Ensure unique invoice numbers
invoiceSchema.index({ invoiceNo: 1, adminId: 1 });
invoiceSchema.index({ billDate: -1 });
invoiceSchema.index({ paymentStatus: 1, adminId: 1 });
invoiceSchema.index({ status: 1, adminId: 1 });
invoiceSchema.index({ dueDate: 1, paymentStatus: 1 });

// Pre-save middleware to update metadata
invoiceSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.metadata.lastModifiedAt = new Date();
  }
  next();
});

// Instance methods
invoiceSchema.methods.markAsViewed = function() {
  this.views += 1;
  this.lastViewed = new Date();
  return this.save();
};

invoiceSchema.methods.markAsPaid = function(paymentDate = new Date(), paymentMethod = '') {
  this.paymentStatus = 'Paid';
  this.status = 'Paid';
  this.paymentDate = paymentDate;
  this.paymentMethod = paymentMethod;
  return this.save();
};

// Static methods
invoiceSchema.statics.getOverdueInvoices = function(adminId = null) {
  const query = {
    dueDate: { $lt: new Date() },
    paymentStatus: { $ne: 'Paid' }
  };
  if (adminId) query.adminId = adminId;
  return this.find(query);
};

invoiceSchema.statics.getRevenueStats = function(adminId = null, startDate = null, endDate = null) {
  const matchQuery = { paymentStatus: 'Paid' };
  if (adminId) matchQuery.adminId = adminId;
  if (startDate || endDate) {
    matchQuery.paymentDate = {};
    if (startDate) matchQuery.paymentDate.$gte = new Date(startDate);
    if (endDate) matchQuery.paymentDate.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        invoiceCount: { $sum: 1 },
        averageValue: { $avg: '$total' }
      }
    }
  ]);
};

module.exports = mongoose.model("Invoice", invoiceSchema);
