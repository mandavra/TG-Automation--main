const mongoose = require('mongoose');
const Group = require('./models/group.model');
require('dotenv').config();

async function setupTestBundle() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram_automation');
    console.log('🔗 Connected to database');
    
    // Check if we have any groups
    const existingGroups = await Group.find({});
    console.log(`📦 Found ${existingGroups.length} existing groups`);
    
    if (existingGroups.length > 0) {
      console.log('\n📋 Existing groups:');
      existingGroups.forEach(g => {
        console.log(`   ID: ${g._id}`);
        console.log(`   Name: ${g.name}`);
        console.log(`   Channels: ${g.channels?.length || 0}`);
        if (g.channels && g.channels.length > 0) {
          g.channels.forEach(ch => {
            console.log(`     - ${ch.chatTitle} (${ch.chatId}) - Active: ${ch.isActive}`);
          });
        }
        console.log('   ---');
      });
    } else {
      // Create a test bundle with sample channel data
      console.log('🚀 Creating test channel bundle...');
      
      const testBundle = new Group({
        name: 'first group',
        description: 'Premium Channel Bundle',
        channels: [
          {
            chatId: process.env.CHANNEL_ID || '-1001234567890', // Use env variable or default
            chatTitle: 'Test Premium Channel',
            isActive: true
          }
        ],
        subscriptionPlans: [
          {
            _id: new mongoose.Types.ObjectId(),
            type: 'Basic',
            mrp: 1300,
            duration: 'year',
            highlight: false,
            order: 1
          },
          {
            _id: new mongoose.Types.ObjectId(),
            type: 'Pro', 
            mrp: 33,
            duration: 'month',
            highlight: true,
            order: 2
          },
          {
            _id: new mongoose.Types.ObjectId(),
            type: 'Enterprise',
            mrp: 12,
            duration: 'week',
            highlight: false,
            order: 3
          }
        ],
        featureToggles: {
          enablePayment: true,
          enableKYC: true,
          enableESign: true
        },
        isActive: true
      });
      
      const savedBundle = await testBundle.save();
      console.log(`✅ Created test bundle with ID: ${savedBundle._id}`);
      console.log(`📋 Bundle name: ${savedBundle.name}`);
      console.log(`📊 Channels: ${savedBundle.channels.length}`);
      console.log(`💎 Plans: ${savedBundle.subscriptionPlans.length}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupTestBundle();
