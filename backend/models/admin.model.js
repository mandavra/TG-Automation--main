const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true,},
    password: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'admin'], default: 'admin', required: true },
    isActive: { type: Boolean, default: true },
    // Super admin managed permissions (string identifiers from UI)
    permissions: { type: [String], default: [] },
    // Platform fee numeric value (managed by Super Admin; unset by default)
    platformFee: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);


