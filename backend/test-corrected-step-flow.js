/**
 * Test Script: Corrected Step Flow
 * 
 * Tests the corrected flow where telegram links are generated 
 * only after ALL required steps are completed, respecting bundle configuration:
 * 
 * 1. Payment ✅ → KYC (if required) ✅ → E-Sign (if required) ✅ → Telegram Links 🔗
 * 2. When E-Sign disabled: Payment ✅ → KYC (if required) ✅ → Telegram Links 🔗
 */

const mongoose = require('mongoose');
const Group = require('./models/group.model');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
const InviteLink = require('./models/InviteLink');
const axios = require('axios');
const { triggerTelegramLinksIfReady } = require('./utils/stepCompletionChecker');

require('dotenv').config();

const TEST_SCENARIOS = [
  {
    name: 'KYC + E-Sign Both Required',
    bundleName: 'full-flow-test',
    enableKYC: true,
    enableESign: true,
    expectedFlow: ['payment', 'kyc', 'esign', 'telegram']
  },
  {
    name: 'KYC Required, E-Sign Disabled',
    bundleName: 'kyc-only-test',
    enableKYC: true,
    enableESign: false,
    expectedFlow: ['payment', 'kyc', 'telegram']
  },
  {
    name: 'KYC Disabled, E-Sign Required',
    bundleName: 'esign-only-test', 
    enableKYC: false,
    enableESign: true,
    expectedFlow: ['payment', 'esign', 'telegram']
  },
  {
    name: 'Both KYC and E-Sign Disabled',
    bundleName: 'payment-only-test',
    enableKYC: false,
    enableESign: false,
    expectedFlow: ['payment', 'telegram']
  }
];

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function createTestBundle(scenario) {
  console.log(`\n📦 Creating test bundle: ${scenario.name}`);
  
  try {
    // Clean up existing test bundle
    await Group.deleteOne({ customRoute: scenario.bundleName });
    
    const testBundle = new Group({
      name: scenario.name,
      description: `Test bundle for ${scenario.name}`,
      customRoute: scenario.bundleName,
      channels: [{
        chatId: '-1001234567890',
        chatTitle: 'Test Channel',
        isActive: true
      }],
      status: 'active',
      featureToggles: {
        enableKYC: scenario.enableKYC,
        enableESign: scenario.enableESign
      },
      createdBy: new mongoose.Types.ObjectId()
    });
    
    await testBundle.save();
    console.log(`✅ Bundle created with KYC: ${scenario.enableKYC}, E-Sign: ${scenario.enableESign}`);
    return testBundle;
    
  } catch (error) {
    console.error('❌ Failed to create test bundle:', error);
    throw error;
  }
}

async function createTestUser(scenario) {
  const phone = `+1234567${Math.floor(Math.random() * 1000)}`;
  
  try {
    // Clean up existing test user
    await User.deleteOne({ phone });
    await PaymentLink.deleteMany({ phone });
    await InviteLink.deleteMany({ userId: new mongoose.Types.ObjectId() });
    
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      phone,
      email: `test-${scenario.bundleName}@example.com`,
      kycCompleted: false,
      esignCompleted: false,
      adminId: new mongoose.Types.ObjectId()
    });
    
    await testUser.save();
    console.log(`✅ Test user created: ${testUser._id}`);
    return testUser;
    
  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    throw error;
  }
}

async function createSuccessfulPayment(user, bundle) {
  try {
    const payment = new PaymentLink({
      userid: user._id.toString(),
      phone: user.phone,
      plan_id: 'test-plan-001',
      plan_name: `Test Plan - ${bundle.name}`,
      amount: 100,
      status: 'SUCCESS',
      groupId: bundle._id,
      purchase_datetime: new Date(),
      expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      duration: 30 * 24 * 60 * 60,
      adminId: bundle.adminId,
      adminCommission: 100, // 100% commission to admin
      commissionRate: 100
    });
    
    await payment.save();
    console.log(`✅ Payment created: ${payment._id}`);
    return payment;
    
  } catch (error) {
    console.error('❌ Failed to create payment:', error);
    throw error;
  }
}

async function testStepFlow(scenario, user, payment) {
  console.log(`\n🧪 Testing step flow: ${scenario.name}`);
  console.log(`Expected flow: ${scenario.expectedFlow.join(' → ')}`);
  
  let currentStep = 0;
  const results = [];
  
  // Step 1: Payment completed - check if links generated (should NOT generate yet if other steps required)
  console.log('\n1️⃣ Payment completed...');
  let linkResult = await triggerTelegramLinksIfReady(user._id.toString(), payment._id);
  results.push({
    step: 'payment',
    linksGenerated: linkResult.linksGenerated,
    reason: linkResult.reason
  });
  
  console.log(`   Links generated: ${linkResult.linksGenerated ? '✅' : '❌'} - ${linkResult.reason}`);
  
  // Step 2: Complete KYC if required
  if (scenario.enableKYC) {
    console.log('\n2️⃣ Completing KYC...');
    
    // Mark KYC as completed
    user.kycCompleted = true;
    user.kycCompletedAt = new Date();
    await user.save();
    
    // Check if links should be generated now
    linkResult = await triggerTelegramLinksIfReady(user._id.toString(), payment._id);
    results.push({
      step: 'kyc',
      linksGenerated: linkResult.linksGenerated,
      reason: linkResult.reason
    });
    
    console.log(`   KYC completed: ✅`);
    console.log(`   Links generated: ${linkResult.linksGenerated ? '✅' : '❌'} - ${linkResult.reason}`);
  } else {
    console.log('\n2️⃣ KYC disabled - skipping...');
  }
  
  // Step 3: Complete E-Sign if required
  if (scenario.enableESign) {
    console.log('\n3️⃣ Completing E-Sign...');
    
    // Mark E-Sign as completed
    user.esignCompleted = true;
    user.esignCompletedAt = new Date();
    await user.save();
    
    // Check if links should be generated now
    linkResult = await triggerTelegramLinksIfReady(user._id.toString(), payment._id);
    results.push({
      step: 'esign',
      linksGenerated: linkResult.linksGenerated,
      reason: linkResult.reason
    });
    
    console.log(`   E-Sign completed: ✅`);
    console.log(`   Links generated: ${linkResult.linksGenerated ? '✅' : '❌'} - ${linkResult.reason}`);
  } else {
    console.log('\n3️⃣ E-Sign disabled - skipping...');
  }
  
  // Final check: All required steps should be complete, links should be generated
  console.log('\n🏁 Final check - all required steps completed...');
  linkResult = await triggerTelegramLinksIfReady(user._id.toString(), payment._id);
  results.push({
    step: 'final',
    linksGenerated: linkResult.linksGenerated,
    reason: linkResult.reason
  });
  
  console.log(`   All steps complete: ${linkResult.linksGenerated ? '✅' : '❌'} - ${linkResult.reason}`);
  
  return results;
}

async function validateResults(scenario, results) {
  console.log(`\n📊 Validating results for: ${scenario.name}`);
  
  let isValid = true;
  const errors = [];
  
  // Check that links are only generated at the final step
  const finalResult = results[results.length - 1];
  if (!finalResult.linksGenerated) {
    isValid = false;
    errors.push('Telegram links not generated after all required steps completed');
  }
  
  // Check that links weren't generated prematurely
  const prematureGeneration = results.slice(0, -1).some(result => result.linksGenerated);
  if (prematureGeneration) {
    isValid = false;
    errors.push('Telegram links generated before all required steps completed');
  }
  
  // Check specific expectations based on scenario
  const expectedSteps = scenario.expectedFlow.length - 1; // Minus telegram step
  const actualSteps = results.filter(r => r.step !== 'final').length;
  
  console.log(`   Expected steps: ${expectedSteps}, Actual steps: ${actualSteps}`);
  console.log(`   Final links generated: ${finalResult.linksGenerated ? '✅' : '❌'}`);
  console.log(`   Premature generation: ${prematureGeneration ? '❌ YES' : '✅ NO'}`);
  
  if (errors.length > 0) {
    console.log('❌ Validation errors:', errors);
  } else {
    console.log('✅ All validations passed!');
  }
  
  return { isValid, errors };
}

async function runCompleteTest() {
  console.log('🧪 Starting Corrected Step Flow Test...');
  console.log('=' .repeat(60));
  
  try {
    await connectDB();
    
    const allResults = [];
    
    // Run test for each scenario
    for (const scenario of TEST_SCENARIOS) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎯 SCENARIO: ${scenario.name}`);
      console.log(`${'='.repeat(60)}`);
      
      const bundle = await createTestBundle(scenario);
      const user = await createTestUser(scenario);
      const payment = await createSuccessfulPayment(user, bundle);
      
      const results = await testStepFlow(scenario, user, payment);
      const validation = await validateResults(scenario, results);
      
      allResults.push({
        scenario: scenario.name,
        results,
        validation,
        passed: validation.isValid
      });
    }
    
    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📈 FINAL SUMMARY');
    console.log(`${'='.repeat(60)}`);
    
    const passedTests = allResults.filter(r => r.passed).length;
    const totalTests = allResults.length;
    
    allResults.forEach(result => {
      console.log(`${result.passed ? '✅' : '❌'} ${result.scenario}`);
      if (!result.passed) {
        result.validation.errors.forEach(error => {
          console.log(`     - ${error}`);
        });
      }
    });
    
    console.log(`\nPassed: ${passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ Corrected step flow is working correctly');
      console.log('✅ Telegram links generated only after all required steps');
      console.log('✅ E-Sign skip functionality working properly');
    } else {
      console.log('\n❌ SOME TESTS FAILED!');
      console.log('Please review the implementation');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

// Run the test
if (require.main === module) {
  runCompleteTest();
}

module.exports = {
  runCompleteTest,
  TEST_SCENARIOS
};