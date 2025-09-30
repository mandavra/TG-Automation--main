const mongoose = require('mongoose');

const paymentLinkSchema = new mongoose.Schema({
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  link_id: {
    type: String,
    required: true,
    unique: true
  },
  link_url: {
    type: String,
    required: true
  },
  customer_id: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  plan_id: String,
  plan_name: String,
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'EXPIRED'],
    default: 'PENDING'
  },
  purchase_datetime: {
    type: Date,
    default: Date.now
  },
  expiry_date: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  utr: {
    type: String,
    description: "UTR/Transaction ID for the payment"
  },
  // Payment recovery fields
  link_delivered: {
    type: Boolean,
    default: false
  },
  delivery_status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  delivery_attempts: {
    type: Number,
    default: 0
  },
  last_delivery_attempt: {
    type: Date
  },
  failure_reason: {
    type: String
  },
  recovery_completed: {
    type: Boolean,
    default: false
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true  // Index for efficient tenant filtering
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  adminCommission: {
    type: Number,
    default: 0
  },
  commissionRate: {
    type: Number,
    default: 100 // Default 100% to admin
  },
  // Platform fee fields for dynamic fee management
  platformFee: {
    type: Number,
    default: 0,
    description: "Platform fee deducted from this transaction"
  },
  netAmount: {
    type: Number,
    description: "Amount after platform fee deduction"
  },
  feeCalculationData: {
    configId: {
      type: String,
      description: "ID of the fee configuration used"
    },
    version: {
      type: Number,
      description: "Version of the fee configuration used"
    },
    feeType: {
      type: String,
      enum: ['percentage', 'fixed', 'tiered'],
      description: "Type of fee calculation used"
    },
    feeRate: {
      type: Number,
      description: "Fee rate applied (percentage or amount)"
    },
    calculatedAt: {
      type: Date,
      description: "When the fee was calculated"
    },
    breakdown: {
      type: mongoose.Schema.Types.Mixed,
      description: "Detailed fee calculation breakdown"
    },
    recalculated: {
      type: Boolean,
      default: false,
      description: "Whether fee was recalculated after initial processing"
    },
    recalculatedAt: {
      type: Date,
      description: "When the fee was last recalculated"
    }
  },
  statusReason: {
    type: String,
    description: "Reason for status change (if applicable)"
  },
  isExtension: {
    type: Boolean,
    default: false,
    description: "Whether this payment is extending an existing subscription"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PaymentLink', paymentLinkSchema);