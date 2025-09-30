const mongoose = require('mongoose');
const Group = require('./models/group.model');
require('dotenv').config();

async function testBundleLookup() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/telegram_automation');
    console.log('🔗 Connected to database');
    
    const testGroupId = "68b32118bd6245ad4017b947";
    console.log(`\n🔍 Testing lookup for group ID: ${testGroupId}`);
    
    // Test 1: Direct string lookup
    console.log('\n📋 Test 1: Direct string lookup');
    const group1 = await Group.findById(testGroupId);
    console.log('Result:', group1 ? `Found: ${group1.name}` : 'Not found');
    
    // Test 2: ObjectId conversion
    console.log('\n📋 Test 2: ObjectId conversion');
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(testGroupId);
      console.log('ObjectId created:', objectId);
      const group2 = await Group.findById(objectId);
      console.log('Result:', group2 ? `Found: ${group2.name}` : 'Not found');
    } catch (err) {
      console.log('ObjectId conversion failed:', err.message);
    }
    
    // Test 3: List all groups to see what's actually there
    console.log('\n📋 Test 3: All groups in database');
    const allGroups = await Group.find({});
    console.log(`Found ${allGroups.length} groups:`);
    allGroups.forEach(g => {
      console.log(`   ${g._id} - ${g.name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testBundleLookup();
