const mongoose = require('mongoose');
require('dotenv').config();

async function checkAndFixMissingLinks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Group = require('../models/group.model');
    const Invoice = require('../models/Invoice'); // Using Invoice model for payments
    const { Telegraf } = require('telegraf');
    
    let bot;
    if (process.env.BOT_TOKEN) {
      bot = new Telegraf(process.env.BOT_TOKEN);
      try {
        const botInfo = await bot.telegram.getMe();
        console.log(`🤖 Bot connected: @${botInfo.username}`);
      } catch (err) {
        console.log('⚠️ Bot connection failed, will only show missing links without generating new ones');
        bot = null;
      }
    }
    
    // Check groups with missing links
    const groups = await Group.find({
      status: 'active',
      $or: [
        { telegramChatId: { $exists: true, $ne: null } },
        { 'channels.0': { $exists: true } }
      ]
    });
    
    console.log('\n🔍 Checking for missing links...\n');
    
    let missingCount = 0;
    let fixedCount = 0;
    
    for (const group of groups) {
      // Legacy groups
      if (group.telegramChatId && !group.channels?.length) {
        if (!group.telegramInviteLink) {
          console.log(`❌ Legacy Group: ${group.name} (ID: ${group._id}) - Missing telegramInviteLink`);
          missingCount++;
          
          // Try to generate link if bot is available
          if (bot) {
            try {
              const chat = await bot.telegram.getChat(group.telegramChatId);
              if (chat.invite_link) {
                await Group.findByIdAndUpdate(group._id, {
                  telegramInviteLink: chat.invite_link
                });
                console.log(`   ✅ Fixed: Added existing invite link for ${group.name}`);
                fixedCount++;
              } else {
                // Generate new invite link
                const inviteLink = await bot.telegram.createChatInviteLink(group.telegramChatId, {
                  creates_join_request: true,
                  name: `${group.name} Access`
                });
                
                await Group.findByIdAndUpdate(group._id, {
                  telegramInviteLink: inviteLink.invite_link
                });
                console.log(`   ✅ Generated: New invite link for ${group.name}`);
                console.log(`   🔗 Link: ${inviteLink.invite_link}`);
                fixedCount++;
              }
            } catch (err) {
              console.log(`   ❌ Failed to fix ${group.name}: ${err.message}`);
            }
          }
        } else {
          console.log(`✅ Legacy Group: ${group.name} - Has invite link`);
          console.log(`   🔗 Link: ${group.telegramInviteLink}`);
        }
      }
      
      // Bundle groups
      if (group.channels?.length) {
        console.log(`📦 Bundle Group: ${group.name} (ID: ${group._id})`);
        for (let i = 0; i < group.channels.length; i++) {
          const channel = group.channels[i];
          if (channel.isActive) {
            if (!channel.joinLink) {
              console.log(`   ❌ Channel ${i + 1}: ${channel.chatTitle} - Missing joinLink`);
              missingCount++;
              
              // Try to generate link if bot is available
              if (bot) {
                try {
                  const inviteLink = await bot.telegram.createChatInviteLink(channel.chatId, {
                    creates_join_request: true,
                    name: `${group.name} - ${channel.chatTitle || 'Channel'}`,
                    expire_date: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
                  });
                  
                  await Group.updateOne(
                    { _id: group._id, 'channels._id': channel._id },
                    { $set: { 'channels.$.joinLink': inviteLink.invite_link } }
                  );
                  
                  console.log(`   ✅ Generated: New invite link for ${channel.chatTitle}`);
                  console.log(`   🔗 Link: ${inviteLink.invite_link}`);
                  fixedCount++;
                } catch (err) {
                  console.log(`   ❌ Failed to generate link for ${channel.chatTitle}: ${err.message}`);
                }
              }
            } else {
              console.log(`   ✅ Channel ${i + 1}: ${channel.chatTitle} - Has joinLink`);
              console.log(`   🔗 Link: ${channel.joinLink}`);
            }
          }
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Missing links found: ${missingCount}`);
    console.log(`   Links generated/fixed: ${fixedCount}`);
    
    // Check recent payments who might need links delivered
    const recentPayments = await Invoice.find({
      paymentStatus: 'Paid',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).limit(10);
    
    console.log(`\n💰 Recent completed payments (last 7 days): ${recentPayments.length}`);
    recentPayments.forEach(payment => {
      console.log(`   - User: ${payment.userid}, Amount: $${payment.total}, Date: ${payment.createdAt.toDateString()}, Invoice: ${payment.invoiceNo}`);
    });
    
    if (recentPayments.length > 0) {
      console.log('\n📬 These users should receive their channel links now!');
      console.log('💡 Tip: Use the admin panel or API endpoints to verify and deliver links to these users.');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Script completed successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkAndFixMissingLinks();
