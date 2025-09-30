const mongoose = require('mongoose');
const Group = require('./models/group.model');
require('dotenv').config();

async function checkBundles() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/telegram_automation');
    console.log('🔗 Connected to database');
    
    const groups = await Group.find({}).limit(5).select('_id name channels');
    console.log('\n📦 Available channel bundles:');
    
    if (groups.length === 0) {
      console.log('❌ No channel bundles found in database');
    } else {
      groups.forEach(g => {
        console.log(`   ID: ${g._id}`);
        console.log(`   Name: ${g.name}`);
        console.log(`   Channels: ${g.channels?.length || 0}`);
        console.log('   ---');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBundles();
