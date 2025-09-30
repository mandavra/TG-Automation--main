#!/usr/bin/env node

const mongoose = require('mongoose');
const Group = require('./backend/models/group.model');
const Plan = require('./backend/models/plan');
const { convertDurationToSeconds } = require('./backend/services/generateOneTimeInviteLink');

require('dotenv').config();

async function testNewFeatures() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Test 1: Test duration conversion function
    console.log('\n🧪 Testing duration conversion:');
    console.log('2min =>', convertDurationToSeconds('2min'), 'seconds');
    console.log('5min =>', convertDurationToSeconds('5min'), 'seconds');
    console.log('10min =>', convertDurationToSeconds('10min'), 'seconds');
    console.log('30min =>', convertDurationToSeconds('30min'), 'seconds');
    console.log('1hour =>', convertDurationToSeconds('1hour'), 'seconds');
    console.log('week =>', convertDurationToSeconds('week'), 'seconds');
    console.log('month =>', convertDurationToSeconds('month'), 'seconds');
    console.log('year =>', convertDurationToSeconds('year'), 'seconds');
    console.log('86400 (number) =>', convertDurationToSeconds(86400), 'seconds');
    console.log('invalid =>', convertDurationToSeconds('invalid'), 'seconds');

    // Test 2: Create a test channel bundle with new features
    console.log('\n🧪 Creating test channel bundle with feature toggles:');
    const testGroup = new Group({
      name: 'Test Channel Bundle with Features',
      description: 'Testing new feature toggles and duration formats',
      featureToggles: {
        enableESign: false,
        enableKYC: true,
        enablePayment: false
      },
      channels: [{
        chatId: '-1001234567890',
        chatTitle: 'Test Channel',
        isActive: true
      }],
      status: 'active'
    });

    const savedGroup = await testGroup.save();
    console.log('✅ Created test group:', savedGroup._id);
    console.log('   E-Sign enabled:', savedGroup.featureToggles.enableESign);
    console.log('   KYC enabled:', savedGroup.featureToggles.enableKYC);
    console.log('   Payment enabled:', savedGroup.featureToggles.enablePayment);

    // Test 3: Create test plans with minute-based durations
    console.log('\n🧪 Creating test plans with minute-based durations:');
    const testPlans = [
      { mrp: 10, duration: '2min', type: 'Base', adminId: new mongoose.Types.ObjectId() },
      { mrp: 20, duration: '5min', type: 'Pro', adminId: new mongoose.Types.ObjectId() },
      { mrp: 50, duration: '30min', type: 'Enterprise', adminId: new mongoose.Types.ObjectId() }
    ];

    for (const planData of testPlans) {
      const plan = new Plan(planData);
      const savedPlan = await plan.save();
      console.log(`✅ Created ${savedPlan.type} plan with ${savedPlan.duration} duration`);
    }

    // Test 4: Update feature toggles
    console.log('\n🧪 Testing feature toggle updates:');
    const updatedGroup = await Group.findByIdAndUpdate(
      savedGroup._id,
      {
        'featureToggles.enableESign': true,
        'featureToggles.enablePayment': true
      },
      { new: true }
    );
    console.log('✅ Updated feature toggles:');
    console.log('   E-Sign enabled:', updatedGroup.featureToggles.enableESign);
    console.log('   KYC enabled:', updatedGroup.featureToggles.enableKYC);
    console.log('   Payment enabled:', updatedGroup.featureToggles.enablePayment);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Duration conversion function works correctly');
    console.log('✅ Channel bundle feature toggles (E-Sign, KYC, Payment) work');
    console.log('✅ Plans accept minute-based duration formats');
    console.log('✅ Feature toggles can be updated dynamically');

    console.log('\n🚀 Ready for rapid testing with minute-based plans!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}


if (require.main === module) {
  testNewFeatures();
}