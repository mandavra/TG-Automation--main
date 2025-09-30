const mongoose = require('mongoose');
require('dotenv').config();

async function findPayingUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('../models/user.model');
    const Invoice = require('../models/Invoice');
    const InviteLink = require('../models/InviteLink');
    const Group = require('../models/group.model');
    const Admin = require('../models/admin.model'); // Load to avoid schema error
    
    // Find the specific user with phone +919624165190
    const user = await User.findOne({ phone: '+919624165190' }).select('_id email phone firstName lastName');
    
    if (user) {
      console.log('📱 Found user:', {
        id: user._id,
        email: user.email,
        phone: user.phone,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
      });
      
      // Check their invoices
      const invoices = await Invoice.find({ userid: user._id }).select('invoiceNo paymentStatus total createdAt groupId');
      console.log(`\n💰 User invoices (${invoices.length}):`);
      invoices.forEach((invoice, index) => {
        console.log(`  ${index + 1}. Invoice ${invoice.invoiceNo}:`);
        console.log(`     Status: ${invoice.paymentStatus}`);
        console.log(`     Amount: $${invoice.total}`);
        console.log(`     Date: ${invoice.createdAt.toDateString()}`);
        console.log('');
      });
      
      // Check if they have any invite links
      const inviteLinks = await InviteLink.find({ userId: user._id }).populate('groupId', 'name');
      console.log(`🔗 User invite links (${inviteLinks.length}):`);
      
      if (inviteLinks.length === 0) {
        console.log('   ❌ NO INVITE LINKS FOUND FOR THIS USER!');
        console.log('   This is why they see "undefined" - no personalized links were generated!');
      }
      
      inviteLinks.forEach((link, index) => {
        console.log(`  Link ${index + 1}: ${link.is_used ? 'USED' : 'UNUSED'}`);
        console.log(`    URL: ${link.link}`);
        console.log(`    Channel: ${link.channelTitle || 'N/A'} (${link.channelId})`);
        console.log(`    Group: ${link.groupId?.name || 'N/A'} (${link.groupId?._id || 'N/A'})`);
        if (link.used_at) console.log(`    Used at: ${link.used_at}`);
        console.log('');
      });
      
      // Check if they should have links for "trial plan" bundle
      const trialGroup = await Group.findOne({ name: 'trial plan' }).select('_id name channels');
      if (trialGroup) {
        console.log('📦 Trial Plan bundle details:');
        console.log(`   Group ID: ${trialGroup._id}`);
        console.log(`   Channels: ${trialGroup.channels.length}`);
        trialGroup.channels.forEach((channel, index) => {
          console.log(`   Channel ${index + 1}: ${channel.chatTitle} (${channel.chatId}) - Active: ${channel.isActive}`);
        });
        
        // Check if user has links for this specific group
        const groupLinks = await InviteLink.find({ userId: user._id, groupId: trialGroup._id });
        console.log(`\n🔗 Links for "trial plan" group: ${groupLinks.length}`);
        if (groupLinks.length === 0) {
          console.log('   ❌ NO LINKS GENERATED FOR TRIAL PLAN GROUP!');
        }
      }
      
    } else {
      console.log('❌ User with phone +919624165190 not found');
      
      // Show some sample users
      const sampleUsers = await User.find({}).limit(5).select('phone email firstName lastName');
      console.log('\n📋 Sample users in database:');
      sampleUsers.forEach(u => console.log(`  - ${u.phone} (${u.email}) - ${u.firstName || 'No name'}`));
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Analysis completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

findPayingUser();
