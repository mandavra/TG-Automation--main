const mongoose = require('mongoose');
require('dotenv').config();

async function testDeliveryAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Group = require('../models/group.model');
    const Invoice = require('../models/Invoice');
    const Admin = require('../models/admin.model'); // Load Admin model to avoid schema registration error
    
    // Get the updated groups with links
    const groups = await Group.find({
      status: 'active',
      $or: [
        { telegramChatId: { $exists: true, $ne: null } },
        { 'channels.0': { $exists: true } }
      ]
    });
    
    console.log('🔗 Current Groups with Links:\n');
    
    groups.forEach((group, index) => {
      console.log(`${index + 1}. Group: ${group.name} (ID: ${group._id})`);
      
      // Legacy groups
      if (group.telegramChatId && !group.channels?.length) {
        if (group.telegramInviteLink) {
          console.log(`   ✅ Legacy invite link: ${group.telegramInviteLink}`);
        } else {
          console.log(`   ❌ Still missing legacy link`);
        }
      }
      
      // Bundle groups
      if (group.channels?.length) {
        group.channels.forEach((channel, channelIndex) => {
          if (channel.isActive) {
            console.log(`   Channel ${channelIndex + 1}: ${channel.chatTitle}`);
            if (channel.joinLink) {
              console.log(`   ✅ Join link: ${channel.joinLink}`);
            } else {
              console.log(`   ❌ Still missing join link`);
            }
          }
        });
      }
      console.log('');
    });
    
    // Test the getActiveChannelsForBot function
    console.log('🤖 Testing getActiveChannelsForBot()...\n');
    
    const groupService = require('../services/groupService');
    
    const activeChannels = await groupService.getActiveChannelsForBot();
    console.log('Active channels returned by API:');
    
    activeChannels.forEach((channel, index) => {
      console.log(`${index + 1}. Channel: ${channel.name}`);
      console.log(`   - Channel ID: ${channel.channel_id}`);
      console.log(`   - Chat Title: ${channel.chat_title}`);
      console.log(`   - Join Link: ${channel.join_link || 'undefined'}`);
      console.log(`   - Is Legacy: ${channel.is_legacy}`);
      console.log('');
    });
    
    // Check if we have any paid invoices
    console.log('💰 Checking paid invoices...\n');
    const paidInvoices = await Invoice.find({
      paymentStatus: 'Paid'
    }).limit(5);
    
    console.log(`Found ${paidInvoices.length} paid invoices:`);
    paidInvoices.forEach(invoice => {
      console.log(`- Invoice ${invoice.invoiceNo}: User ${invoice.userid}, Amount $${invoice.total}, Paid on ${invoice.paymentDate || invoice.createdAt}`);
    });
    
    if (paidInvoices.length === 0) {
      console.log('\n🎯 Creating a test scenario...');
      console.log('To test the system fully:');
      console.log('1. Create a test payment/invoice');
      console.log('2. Mark it as paid');
      console.log('3. Use the delivery API endpoints to send links');
      console.log('\nFor now, the "undefined" links should be fixed in your frontend!');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testDeliveryAPI();
