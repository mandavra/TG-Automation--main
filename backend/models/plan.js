const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  mrp: {
    type: Number,
    required: true
  },
  discountPrice: {
    type: Number,
    validate: {
      validator: function(value) {
        // Allow null/undefined values
        if (value === null || value === undefined) return true;
        // During update operations, we need to check against the new MRP value if it's being updated
        const currentMrp = this.isModified('mrp') ? this.mrp : this._doc.mrp || this.mrp;
        return value < currentMrp;
      },
      message: 'Discount price must be less than MRP'
    }
  },
  offerPrice: {
    type: Number,
    validate: {
      validator: function(value) {
        // Allow null/undefined values, and ensure offer price is less than MRP
        if (value === null || value === undefined) return true;
        return value < this.mrp;
      },
      message: 'Offer price must be less than MRP'
    }
  },
  type: {
    type: String,
    default: 'Base',
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  highlight: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
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
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
