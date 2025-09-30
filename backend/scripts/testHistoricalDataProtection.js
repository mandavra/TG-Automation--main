const mongoose = require('mongoose');
const PlatformFeeConfig = require('../models/platformFee.model');
const PaymentLink = require('../models/paymentLinkModel');
const platformFeeService = require('../services/platformFeeService');
require('dotenv').config();

/**
 * Historical Data Protection Test Suite
 * 
 * This comprehensive test suite verifies that changes to platform fee configurations
 * do not affect historical transaction data and calculations.
 * 
 * Critical Real-World Scenarios Tested:
 * 1. Historical transactions maintain their original fee calculations
 * 2. New fee configurations only apply to future transactions
 * 3. Fee calculation API respects transaction dates
 * 4. Audit trails are preserved
 * 5. Revenue reports remain consistent
 */

class HistoricalDataProtectionTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
    this.testData = {
      admins: [],
      feeConfigs: [],
      payments: []
    };
  }

  /**
   * Connect to MongoDB
   */
  async connectDatabase() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tg-automation', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ Connected to MongoDB for testing');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  /**
   * Run a single test
   */
  async runTest(testName, testFunction) {
    this.testResults.total++;
    console.log(`\n🧪 Test: ${testName}`);
    console.log('-'.repeat(50));
    
    try {
      await testFunction();
      this.testResults.passed++;
      this.testResults.details.push({
        name: testName,
        status: 'PASSED',
        message: 'Test completed successfully'
      });
      console.log('✅ PASSED');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({
        name: testName,
        status: 'FAILED',
        message: error.message,
        error: error
      });
      console.error('❌ FAILED:', error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error('   Stack:', error.stack);
      }
    }
  }

  /**
   * Setup test data
   */
  async setupTestData() {
    console.log('📋 Setting up test data...');

    // Find or create test super admin
    const Admin = require('../models/admin.model');
    let testAdmin = await Admin.findOne({ email: 'test-admin@platform.test' });
    
    if (!testAdmin) {
      testAdmin = new Admin({
        email: 'test-admin@platform.test',
        password: 'test-password',
        role: 'superadmin',
        isActive: false
      });
      await testAdmin.save();
    }
    
    this.testData.admins.push(testAdmin);
    
    // Create test fee configurations with different time periods
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Historical fee config (2.0%)
    const historicalConfig = new PlatformFeeConfig({
      configId: `test_historical_${Date.now()}_1`,
      scope: 'global',
      effectiveFrom: twoMonthsAgo,
      effectiveTo: oneMonthAgo,
      feeType: 'percentage',
      percentageRate: 2.0,
      currency: 'INR',
      status: 'superseded',
      version: 1,
      createdBy: testAdmin._id,
      approvedBy: testAdmin._id,
      approvedAt: twoMonthsAgo,
      changeReason: 'Test historical fee configuration',
      adminNotes: 'Used for testing historical data protection'
    });
    
    await historicalConfig.save();
    this.testData.feeConfigs.push(historicalConfig);
    
    // Current fee config (3.0%)
    const currentConfig = new PlatformFeeConfig({
      configId: `test_current_${Date.now()}_2`,
      scope: 'global',
      effectiveFrom: oneMonthAgo,
      effectiveTo: null,
      feeType: 'percentage',
      percentageRate: 3.0,
      currency: 'INR',
      status: 'active',
      version: 2,
      createdBy: testAdmin._id,
      approvedBy: testAdmin._id,
      approvedAt: oneMonthAgo,
      changeReason: 'Test current fee configuration',
      adminNotes: 'Used for testing current fee calculations',
      supersedes: historicalConfig._id
    });
    
    await currentConfig.save();
    this.testData.feeConfigs.push(currentConfig);
    
    // Future fee config (2.5%) - draft
    const futureConfig = new PlatformFeeConfig({
      configId: `test_future_${Date.now()}_3`,
      scope: 'global',
      effectiveFrom: oneWeekFromNow,
      effectiveTo: null,
      feeType: 'percentage',
      percentageRate: 2.5,
      currency: 'INR',
      status: 'draft',
      version: 3,
      createdBy: testAdmin._id,
      changeReason: 'Test future fee configuration',
      adminNotes: 'Used for testing future fee calculations'
    });
    
    await futureConfig.save();
    this.testData.feeConfigs.push(futureConfig);
    
    // Create test payment records at different time periods
    const User = require('../models/user.model');
    let testUser = await User.findOne({ email: 'test-user@platform.test' });
    
    if (!testUser) {
      testUser = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test-user@platform.test',
        phone: '+1234567890',
        password: 'test-password'
      });
      await testUser.save();
    }
    
    // Historical payment (should use 2.0% fee)
    const historicalPayment = new PaymentLink({
      userid: testUser._id,
      link_id: `test_hist_${Date.now()}`,
      link_url: 'https://test.cashfree.com/test-historical',
      customer_id: 'test_customer_hist',
      phone: '+1234567890',
      amount: 1000,
      plan_id: 'test_plan',
      plan_name: 'Test Plan Historical',
      status: 'SUCCESS',
      purchase_datetime: twoMonthsAgo,
      expiry_date: new Date(twoMonthsAgo.getTime() + 30 * 24 * 60 * 60 * 1000),
      duration: 30,
      adminId: testAdmin._id,
      platformFee: 20, // 2.0% of 1000
      netAmount: 980,
      feeCalculationData: {
        configId: historicalConfig.configId,
        version: 1,
        feeType: 'percentage',
        feeRate: 2.0,
        calculatedAt: twoMonthsAgo
      },
      createdAt: twoMonthsAgo,
      updatedAt: twoMonthsAgo
    });
    
    await historicalPayment.save();
    this.testData.payments.push(historicalPayment);
    
    // Recent payment (should use 3.0% fee)
    const recentPayment = new PaymentLink({
      userid: testUser._id,
      link_id: `test_recent_${Date.now()}`,
      link_url: 'https://test.cashfree.com/test-recent',
      customer_id: 'test_customer_recent',
      phone: '+1234567890',
      amount: 1000,
      plan_id: 'test_plan',
      plan_name: 'Test Plan Recent',
      status: 'SUCCESS',
      purchase_datetime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      expiry_date: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
      duration: 30,
      adminId: testAdmin._id,
      platformFee: 30, // 3.0% of 1000
      netAmount: 970,
      feeCalculationData: {
        configId: currentConfig.configId,
        version: 2,
        feeType: 'percentage',
        feeRate: 3.0,
        calculatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      },
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
    });
    
    await recentPayment.save();
    this.testData.payments.push(recentPayment);
    
    console.log('✅ Test data setup completed');
    console.log(`   Created ${this.testData.feeConfigs.length} fee configurations`);
    console.log(`   Created ${this.testData.payments.length} test payments`);
  }

  /**
   * Test 1: Historical payments maintain their original fee calculations
   */
  async testHistoricalPaymentIntegrity() {
    const historicalPayment = this.testData.payments.find(p => 
      p.feeCalculationData?.feeRate === 2.0
    );
    
    if (!historicalPayment) {
      throw new Error('Historical payment not found in test data');
    }
    
    // Verify the payment still has its original fee data
    const payment = await PaymentLink.findById(historicalPayment._id);
    
    if (!payment) {
      throw new Error('Historical payment not found in database');
    }
    
    if (payment.platformFee !== 20) {
      throw new Error(`Expected platformFee to be 20, but got ${payment.platformFee}`);
    }
    
    if (payment.netAmount !== 980) {
      throw new Error(`Expected netAmount to be 980, but got ${payment.netAmount}`);
    }
    
    if (payment.feeCalculationData?.feeRate !== 2.0) {
      throw new Error(`Expected feeRate to be 2.0, but got ${payment.feeCalculationData?.feeRate}`);
    }
    
    console.log('   ✓ Historical payment maintains original fee data');
    console.log(`   ✓ Platform fee: ₹${payment.platformFee} (2.0% rate)`);
    console.log(`   ✓ Net amount: ₹${payment.netAmount}`);
  }

  /**
   * Test 2: New fee calculations respect transaction dates
   */
  async testTransactionDateRespected() {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    
    // Calculate fee for a historical date
    const historicalFee = await platformFeeService.calculateTransactionFee({
      amount: 1000,
      tenantId: this.testData.admins[0]._id,
      transactionDate: twoMonthsAgo
    });
    
    if (!historicalFee) {
      throw new Error('Failed to calculate historical fee');
    }
    
    if (Math.abs(historicalFee.platformFee - 20) > 0.01) { // Allow small floating point differences
      throw new Error(`Expected historical fee to be ₹20 (2.0%), but got ₹${historicalFee.platformFee}`);
    }
    
    // Calculate fee for current date
    const currentFee = await platformFeeService.calculateTransactionFee({
      amount: 1000,
      tenantId: this.testData.admins[0]._id,
      transactionDate: new Date()
    });
    
    if (!currentFee) {
      throw new Error('Failed to calculate current fee');
    }
    
    if (Math.abs(currentFee.platformFee - 30) > 0.01) { // Allow small floating point differences
      throw new Error(`Expected current fee to be ₹30 (3.0%), but got ₹${currentFee.platformFee}`);
    }
    
    console.log('   ✓ Historical transaction date uses 2.0% rate');
    console.log('   ✓ Current transaction date uses 3.0% rate');
    console.log(`   ✓ Historical fee: ₹${historicalFee.platformFee}`);
    console.log(`   ✓ Current fee: ₹${currentFee.platformFee}`);
  }

  /**
   * Test 3: Fee configuration changes don't affect existing records
   */
  async testFeeConfigChangesIsolation() {
    // Get initial historical payment data
    const initialPayment = await PaymentLink.findById(this.testData.payments[0]._id);
    const initialFee = initialPayment.platformFee;
    const initialNetAmount = initialPayment.netAmount;
    const initialConfigId = initialPayment.feeCalculationData?.configId;
    
    // Create a new fee configuration
    const newConfig = new PlatformFeeConfig({
      configId: `test_new_${Date.now()}`,
      scope: 'global',
      effectiveFrom: new Date(),
      effectiveTo: null,
      feeType: 'percentage',
      percentageRate: 5.0, // Very different rate to make changes obvious
      currency: 'INR',
      status: 'active',
      version: 4,
      createdBy: this.testData.admins[0]._id,
      approvedBy: this.testData.admins[0]._id,
      approvedAt: new Date(),
      changeReason: 'Test new fee configuration isolation',
      adminNotes: 'Testing that this does not affect historical data'
    });
    
    await newConfig.save();
    
    // Update the previous config status
    await PlatformFeeConfig.findByIdAndUpdate(
      this.testData.feeConfigs[1]._id,
      { status: 'superseded', effectiveTo: new Date() }
    );
    
    // Wait a moment for any potential async operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Re-fetch the historical payment and verify it's unchanged
    const unchangedPayment = await PaymentLink.findById(this.testData.payments[0]._id);
    
    if (unchangedPayment.platformFee !== initialFee) {
      throw new Error(`Historical payment fee changed from ₹${initialFee} to ₹${unchangedPayment.platformFee}`);
    }
    
    if (unchangedPayment.netAmount !== initialNetAmount) {
      throw new Error(`Historical payment net amount changed from ₹${initialNetAmount} to ₹${unchangedPayment.netAmount}`);
    }
    
    if (unchangedPayment.feeCalculationData?.configId !== initialConfigId) {
      throw new Error(`Historical payment config ID changed from ${initialConfigId} to ${unchangedPayment.feeCalculationData?.configId}`);
    }
    
    console.log('   ✓ Historical payment fee unchanged after new config creation');
    console.log('   ✓ Historical payment net amount unchanged');
    console.log('   ✓ Historical payment config reference unchanged');
    
    // Clean up
    await PlatformFeeConfig.findByIdAndDelete(newConfig._id);
  }

  /**
   * Test 4: Revenue calculations remain consistent
   */
  async testRevenueConsistency() {
    // Calculate total revenue using payment records
    const payments = await PaymentLink.find({
      status: 'SUCCESS',
      _id: { $in: this.testData.payments.map(p => p._id) }
    });
    
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPlatformFees = payments.reduce((sum, payment) => sum + (payment.platformFee || 0), 0);
    const totalNetAmount = payments.reduce((sum, payment) => sum + (payment.netAmount || payment.amount), 0);
    
    // Verify the math adds up
    const expectedNetAmount = totalRevenue - totalPlatformFees;
    
    if (Math.abs(totalNetAmount - expectedNetAmount) > 0.01) {
      throw new Error(`Revenue calculation inconsistent: expected net ${expectedNetAmount}, got ${totalNetAmount}`);
    }
    
    // Expected values based on our test data:
    // Historical payment: ₹1000 revenue, ₹20 fee, ₹980 net
    // Recent payment: ₹1000 revenue, ₹30 fee, ₹970 net
    // Total: ₹2000 revenue, ₹50 fees, ₹1950 net
    
    if (totalRevenue !== 2000) {
      throw new Error(`Expected total revenue ₹2000, got ₹${totalRevenue}`);
    }
    
    if (totalPlatformFees !== 50) {
      throw new Error(`Expected total platform fees ₹50, got ₹${totalPlatformFees}`);
    }
    
    if (totalNetAmount !== 1950) {
      throw new Error(`Expected total net amount ₹1950, got ₹${totalNetAmount}`);
    }
    
    console.log(`   ✓ Total revenue: ₹${totalRevenue}`);
    console.log(`   ✓ Total platform fees: ₹${totalPlatformFees}`);
    console.log(`   ✓ Total net amount: ₹${totalNetAmount}`);
    console.log('   ✓ Revenue calculations are consistent');
  }

  /**
   * Test 5: Audit trail preservation
   */
  async testAuditTrailPreservation() {
    // Verify that all fee configurations maintain their audit trail
    const configs = await PlatformFeeConfig.find({
      _id: { $in: this.testData.feeConfigs.map(c => c._id) }
    }).populate('createdBy approvedBy');
    
    for (const config of configs) {
      if (!config.createdBy) {
        throw new Error(`Fee configuration ${config.configId} missing createdBy field`);
      }
      
      if (!config.createdAt) {
        throw new Error(`Fee configuration ${config.configId} missing createdAt field`);
      }
      
      if (!config.changeReason) {
        throw new Error(`Fee configuration ${config.configId} missing changeReason field`);
      }
      
      if (config.status === 'active' && !config.approvedBy) {
        throw new Error(`Active fee configuration ${config.configId} missing approvedBy field`);
      }
      
      if (config.status === 'active' && !config.approvedAt) {
        throw new Error(`Active fee configuration ${config.configId} missing approvedAt field`);
      }
    }
    
    console.log('   ✓ All fee configurations have proper audit trails');
    console.log(`   ✓ Checked ${configs.length} configurations`);
    
    // Verify payment audit trail
    for (const payment of this.testData.payments) {
      const p = await PaymentLink.findById(payment._id);
      
      if (!p.feeCalculationData) {
        throw new Error(`Payment ${p._id} missing feeCalculationData`);
      }
      
      if (!p.feeCalculationData.configId) {
        throw new Error(`Payment ${p._id} missing fee configId in calculation data`);
      }
      
      if (!p.feeCalculationData.calculatedAt) {
        throw new Error(`Payment ${p._id} missing fee calculatedAt timestamp`);
      }
    }
    
    console.log('   ✓ All payments have proper fee calculation audit data');
  }

  /**
   * Test 6: API endpoint protection
   */
  async testAPIEndpointProtection() {
    // Test that fee calculation API respects historical dates
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    
    // This should use the historical 2.0% rate
    const historicalResult = await platformFeeService.calculateTransactionFee({
      amount: 500,
      tenantId: this.testData.admins[0]._id,
      transactionDate: twoMonthsAgo
    });
    
    const expectedHistoricalFee = 500 * 0.02; // 2.0%
    if (Math.abs(historicalResult.platformFee - expectedHistoricalFee) > 0.01) {
      throw new Error(`API returned incorrect historical fee: expected ₹${expectedHistoricalFee}, got ₹${historicalResult.platformFee}`);
    }
    
    // This should use the current 3.0% rate
    const currentResult = await platformFeeService.calculateTransactionFee({
      amount: 500,
      tenantId: this.testData.admins[0]._id,
      transactionDate: new Date()
    });
    
    const expectedCurrentFee = 500 * 0.03; // 3.0%
    if (Math.abs(currentResult.platformFee - expectedCurrentFee) > 0.01) {
      throw new Error(`API returned incorrect current fee: expected ₹${expectedCurrentFee}, got ₹${currentResult.platformFee}`);
    }
    
    console.log('   ✓ Fee calculation API respects transaction dates');
    console.log(`   ✓ Historical API result: ₹${historicalResult.platformFee} (2.0% rate)`);
    console.log(`   ✓ Current API result: ₹${currentResult.platformFee} (3.0% rate)`);
  }

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Delete test fee configurations
      for (const config of this.testData.feeConfigs) {
        await PlatformFeeConfig.findByIdAndDelete(config._id);
      }
      
      // Delete test payments
      for (const payment of this.testData.payments) {
        await PaymentLink.findByIdAndDelete(payment._id);
      }
      
      // Delete test admin (but keep test user for other tests)
      const testAdmin = this.testData.admins[0];
      if (testAdmin && testAdmin.email === 'test-admin@platform.test') {
        await mongoose.model('Admin').findByIdAndDelete(testAdmin._id);
      }
      
      console.log('✅ Test data cleanup completed');
    } catch (error) {
      console.error('⚠️  Error during cleanup:', error.message);
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n📊 Historical Data Protection Test Report');
    console.log('==========================================');
    console.log(`✅ Tests Passed: ${this.testResults.passed}/${this.testResults.total}`);
    console.log(`❌ Tests Failed: ${this.testResults.failed}/${this.testResults.total}`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.details
        .filter(test => test.status === 'FAILED')
        .forEach((test, index) => {
          console.log(`   ${index + 1}. ${test.name}`);
          console.log(`      Error: ${test.message}`);
        });
    }
    
    console.log('\n📋 Test Summary:');
    this.testResults.details.forEach((test, index) => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${status} ${test.name}`);
    });
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Historical data protection is working correctly.');
      console.log('   ✓ Platform fee changes will not affect existing transactions');
      console.log('   ✓ Revenue calculations remain consistent');
      console.log('   ✓ Audit trails are properly maintained');
    } else {
      console.log('\n⚠️  Some tests failed. Please review and fix the issues.');
      console.log('   Historical data protection may not be working correctly.');
    }
  }

  /**
   * Main test runner
   */
  async run() {
    try {
      console.log('🚀 Starting Historical Data Protection Tests');
      console.log('============================================');
      
      await this.connectDatabase();
      await this.setupTestData();
      
      // Run all tests
      await this.runTest(
        'Historical Payment Integrity',
        () => this.testHistoricalPaymentIntegrity()
      );
      
      await this.runTest(
        'Transaction Date Respected in Fee Calculations',
        () => this.testTransactionDateRespected()
      );
      
      await this.runTest(
        'Fee Configuration Changes Isolation',
        () => this.testFeeConfigChangesIsolation()
      );
      
      await this.runTest(
        'Revenue Calculation Consistency',
        () => this.testRevenueConsistency()
      );
      
      await this.runTest(
        'Audit Trail Preservation',
        () => this.testAuditTrailPreservation()
      );
      
      await this.runTest(
        'API Endpoint Protection',
        () => this.testAPIEndpointProtection()
      );
      
      await this.cleanupTestData();
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed with error:', error);
      this.testResults.failed++;
      this.generateReport();
      throw error;
    } finally {
      try {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
      } catch (error) {
        console.error('Error closing database connection:', error);
      }
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('Historical Data Protection Test Suite');
  console.log('This test suite verifies that platform fee changes do not affect historical data');
  console.log('');
  
  const test = new HistoricalDataProtectionTest();
  
  test.run()
    .then(() => {
      process.exit(test.testResults.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = HistoricalDataProtectionTest;