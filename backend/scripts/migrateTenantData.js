const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Admin = require('../models/admin.model');
const User = require('../models/user.model');
const Plan = require('../models/plan');
const Group = require('../models/group.model');
const Invoice = require('../models/Invoice');
const InviteLink = require('../models/InviteLink');
const PaymentLink = require('../models/paymentLinkModel');
const ChannelMember = require('../models/ChannelMember');

async function migrateTenantData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tg-automation');
    console.log('Connected to MongoDB');

    // Find or create a default admin for existing data
    let defaultAdmin = await Admin.findOne({ role: 'admin' });
    if (!defaultAdmin) {
      console.log('No admin found, creating default admin...');
      const bcrypt = require('bcryptjs');
      defaultAdmin = await Admin.create({
        email: 'admin@example.com',
        password: await bcrypt.hash('defaultpassword123', 10),
        role: 'admin'
      });
      console.log('Created default admin:', defaultAdmin.email);
    }

    const defaultAdminId = defaultAdmin._id;
    console.log('Using admin ID:', defaultAdminId);

    // Migrate Users that don't have adminId
    const usersWithoutAdmin = await User.countDocuments({ 
      $or: [{ adminId: { $exists: false } }, { adminId: null }] 
    });
    if (usersWithoutAdmin > 0) {
      await User.updateMany(
        { $or: [{ adminId: { $exists: false } }, { adminId: null }] },
        { $set: { adminId: defaultAdminId } }
      );
      console.log(`Updated ${usersWithoutAdmin} users with default admin ID`);
    }

    // Migrate Plans that don't have adminId
    const plansWithoutAdmin = await Plan.countDocuments({
      $or: [{ adminId: { $exists: false } }, { adminId: null }]
    });
    if (plansWithoutAdmin > 0) {
      await Plan.updateMany(
        { $or: [{ adminId: { $exists: false } }, { adminId: null }] },
        { $set: { adminId: defaultAdminId } }
      );
      console.log(`Updated ${plansWithoutAdmin} plans with default admin ID`);
    }

    // Migrate Groups that don't have createdBy
    const groupsWithoutCreator = await Group.countDocuments({
      $or: [{ createdBy: { $exists: false } }, { createdBy: null }]
    });
    if (groupsWithoutCreator > 0) {
      await Group.updateMany(
        { $or: [{ createdBy: { $exists: false } }, { createdBy: null }] },
        { $set: { createdBy: defaultAdminId } }
      );
      console.log(`Updated ${groupsWithoutCreator} groups with default admin ID`);
    }

    // Migrate Invoices that don't have adminId
    const invoicesWithoutAdmin = await Invoice.countDocuments({
      $or: [{ adminId: { $exists: false } }, { adminId: null }]
    });
    if (invoicesWithoutAdmin > 0) {
      await Invoice.updateMany(
        { $or: [{ adminId: { $exists: false } }, { adminId: null }] },
        { $set: { adminId: defaultAdminId } }
      );
      console.log(`Updated ${invoicesWithoutAdmin} invoices with default admin ID`);
    }

    // Migrate InviteLinks that don't have adminId
    const inviteLinksWithoutAdmin = await InviteLink.countDocuments({
      $or: [{ adminId: { $exists: false } }, { adminId: null }]
    });
    if (inviteLinksWithoutAdmin > 0) {
      await InviteLink.updateMany(
        { $or: [{ adminId: { $exists: false } }, { adminId: null }] },
        { $set: { adminId: defaultAdminId } }
      );
      console.log(`Updated ${inviteLinksWithoutAdmin} invite links with default admin ID`);
    }

    // PaymentLink already has adminId in the model, so check if any are missing
    const paymentLinksWithoutAdmin = await PaymentLink.countDocuments({
      $or: [{ adminId: { $exists: false } }, { adminId: null }]
    });
    if (paymentLinksWithoutAdmin > 0) {
      await PaymentLink.updateMany(
        { $or: [{ adminId: { $exists: false } }, { adminId: null }] },
        { $set: { adminId: defaultAdminId } }
      );
      console.log(`Updated ${paymentLinksWithoutAdmin} payment links with default admin ID`);
    }

    // Migrate ChannelMembers that don't have adminId
    const channelMembersWithoutAdmin = await ChannelMember.countDocuments({
      $or: [{ adminId: { $exists: false } }, { adminId: null }]
    });
    if (channelMembersWithoutAdmin > 0) {
      await ChannelMember.updateMany(
        { $or: [{ adminId: { $exists: false } }, { adminId: null }] },
        { $set: { adminId: defaultAdminId } }
      );
      console.log(`Updated ${channelMembersWithoutAdmin} channel members with default admin ID`);
    }

    console.log('Migration completed successfully!');
    console.log(`Default admin credentials: ${defaultAdmin.email} / defaultpassword123`);
    console.log('Please change the default admin password after first login.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateTenantData();
}

module.exports = { migrateTenantData };