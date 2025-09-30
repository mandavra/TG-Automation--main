const mongoose = require('mongoose');
const PlatformFeeConfig = require('../models/platformFee.model');
require('dotenv').config();

/**
 * Platform Fee Migration Script
 * 
 * This script migrates the existing static platform fee configuration
 * to the new dynamic platform fee management system.
 * 
 * Purpose:
 * 1. Create initial platform fee configurations based on historical static rates
 * 2. Ensure backward compatibility
 * 3. Provide a starting point for the new dynamic fee management
 * 
 * Real-world considerations:
 * - Historical data protection (existing transactions won't be affected)
 * - Creates fee configurations that were active during different periods
 * - Sets up proper audit trails for fee changes
 */

// Static fee configuration history based on frontend/src/utils/platformFeeConfig.js
const HISTORICAL_FEE_CONFIGS = [
  {
    scope: 'global',
    effectiveFrom: new Date('2024-01-01T00:00:00.000Z'),
    effectiveTo: new Date('2024-06-30T23:59:59.999Z'),
    feeType: 'percentage',
    percentageRate: 2.5, // 2.5%
    currency: 'INR',
    changeReason: 'Initial platform fee rate - migrated from static configuration',
    adminNotes: 'Migrated from static configuration in platformFeeConfig.js',
    status: 'superseded'
  },
  {
    scope: 'global',
    effectiveFrom: new Date('2024-07-01T00:00:00.000Z'),
    effectiveTo: null, // Current rate
    feeType: 'percentage',
    percentageRate: 2.9, // 2.9%
    currency: 'INR',
    changeReason: 'Rate adjustment for market conditions - migrated from static configuration',
    adminNotes: 'Migrated from static configuration in platformFeeConfig.js. This is the current active rate.',
    status: 'active'
  }
];

class PlatformFeeMigration {
  constructor() {
    this.createdConfigs = 0;
    this.errors = [];
    this.superAdminId = null;
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
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  /**
   * Find or create super admin for audit trail
   */
  async findSuperAdmin() {
    try {
      const Admin = require('../models/admin.model');
      
      // Try to find existing super admin
      let superAdmin = await Admin.findOne({ role: 'superadmin' });
      
      if (!superAdmin) {
        console.log('⚠️  No super admin found, creating migration super admin...');
        
        // Create a system super admin for migration purposes
        superAdmin = new Admin({
          email: 'system-migration@platform.local',
          password: 'migration-only-account', // This account is for migration only
          role: 'superadmin',
          isActive: false // Inactive to prevent actual login
        });
        
        await superAdmin.save();
        console.log('✅ Created system super admin for migration');
      }
      
      this.superAdminId = superAdmin._id;
      console.log('✅ Using super admin ID:', this.superAdminId);
    } catch (error) {
      console.error('❌ Error finding/creating super admin:', error);
      throw error;
    }
  }

  /**
   * Check if migration has already been run
   */
  async checkMigrationStatus() {
    try {
      const existingConfigs = await PlatformFeeConfig.countDocuments({});
      
      if (existingConfigs > 0) {
        console.log(`⚠️  Found ${existingConfigs} existing platform fee configurations`);
        console.log('   Migration may have already been run.');
        
        // Ask for confirmation in production
        if (process.env.NODE_ENV === 'production') {
          console.log('   Run with --force flag to override in production');
          return false;
        }
        
        console.log('   Continuing in development mode...');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      throw error;
    }
  }

  /**
   * Create platform fee configurations
   */
  async createFeeConfigurations() {
    console.log('\n📋 Creating platform fee configurations...');
    
    for (let i = 0; i < HISTORICAL_FEE_CONFIGS.length; i++) {
      const config = HISTORICAL_FEE_CONFIGS[i];
      
      try {
        console.log(`   Creating configuration ${i + 1}/${HISTORICAL_FEE_CONFIGS.length}...`);
        
        // Generate unique config ID
        const configId = `migration_${Date.now()}_${i + 1}`;
        
        const newConfig = new PlatformFeeConfig({
          configId,
          scope: config.scope,
          effectiveFrom: config.effectiveFrom,
          effectiveTo: config.effectiveTo,
          feeType: config.feeType,
          percentageRate: config.percentageRate,
          fixedAmount: config.fixedAmount,
          currency: config.currency,
          minFee: config.minFee,
          maxFee: config.maxFee,
          status: config.status,
          version: i + 1,
          createdBy: this.superAdminId,
          approvedBy: this.superAdminId,
          approvedAt: new Date(),
          changeReason: config.changeReason,
          adminNotes: config.adminNotes,
          supersedes: null, // Will be set for later configs
          usageStats: {
            transactionsAffected: 0,
            totalFeesCollected: 0,
            lastUsed: null
          }
        });

        // Set supersedes relationship for second config
        if (i > 0) {
          const previousConfig = await PlatformFeeConfig.findOne({ 
            scope: 'global', 
            version: i 
          }).sort({ createdAt: -1 });
          
          if (previousConfig) {
            newConfig.supersedes = previousConfig._id;
          }
        }

        await newConfig.save();
        this.createdConfigs++;
        
        console.log(`   ✅ Created config: ${configId}`);
        console.log(`      Scope: ${config.scope}`);
        console.log(`      Effective: ${config.effectiveFrom.toISOString()} to ${config.effectiveTo ? config.effectiveTo.toISOString() : 'current'}`);
        console.log(`      Rate: ${config.percentageRate}%`);
        console.log(`      Status: ${config.status}`);
        
      } catch (error) {
        console.error(`   ❌ Error creating configuration ${i + 1}:`, error.message);
        this.errors.push({
          config: i + 1,
          error: error.message
        });
      }
    }
  }

  /**
   * Verify created configurations
   */
  async verifyConfigurations() {
    console.log('\n🔍 Verifying created configurations...');
    
    try {
      // Check total count
      const totalConfigs = await PlatformFeeConfig.countDocuments({});
      console.log(`   Total configurations in database: ${totalConfigs}`);
      
      // Check active configuration
      const activeConfig = await PlatformFeeConfig.findOne({ 
        scope: 'global', 
        status: 'active' 
      });
      
      if (activeConfig) {
        console.log(`   ✅ Active configuration found:`);
        console.log(`      Config ID: ${activeConfig.configId}`);
        console.log(`      Rate: ${activeConfig.percentageRate}%`);
        console.log(`      Effective from: ${activeConfig.effectiveFrom.toISOString()}`);
      } else {
        console.log(`   ⚠️  No active configuration found`);
      }
      
      // Check superseded configuration
      const supersededConfig = await PlatformFeeConfig.findOne({ 
        scope: 'global', 
        status: 'superseded' 
      });
      
      if (supersededConfig) {
        console.log(`   ✅ Historical configuration found:`);
        console.log(`      Config ID: ${supersededConfig.configId}`);
        console.log(`      Rate: ${supersededConfig.percentageRate}%`);
        console.log(`      Effective until: ${supersededConfig.effectiveTo.toISOString()}`);
      }
      
      // Test fee calculation
      console.log('\n🧪 Testing fee calculation...');
      const testAmount = 1000;
      const testConfig = await PlatformFeeConfig.getActiveFeeConfig({
        transactionDate: new Date()
      });
      
      if (testConfig) {
        const calculatedFee = testConfig.calculateFee(testAmount);
        console.log(`   Test amount: ₹${testAmount}`);
        console.log(`   Calculated fee: ₹${calculatedFee.toFixed(2)}`);
        console.log(`   Net amount: ₹${(testAmount - calculatedFee).toFixed(2)}`);
        console.log(`   ✅ Fee calculation working correctly`);
      } else {
        console.log(`   ❌ No active configuration found for fee calculation`);
      }
      
    } catch (error) {
      console.error('❌ Error verifying configurations:', error);
      this.errors.push({
        step: 'verification',
        error: error.message
      });
    }
  }

  /**
   * Create sample tenant-specific configurations (optional)
   */
  async createSampleTenantConfigs() {
    if (process.argv.includes('--with-samples')) {
      console.log('\n📝 Creating sample tenant-specific configurations...');
      
      try {
        // Create a sample tenant-specific configuration
        const sampleConfig = new PlatformFeeConfig({
          configId: `sample_tenant_${Date.now()}`,
          scope: 'tenant',
          tenantId: null, // Will need to be set to actual tenant ID
          effectiveFrom: new Date(),
          effectiveTo: null,
          feeType: 'percentage',
          percentageRate: 2.0, // Lower rate for specific tenant
          currency: 'INR',
          status: 'draft', // Draft until tenant ID is set
          version: 1,
          createdBy: this.superAdminId,
          changeReason: 'Sample tenant-specific fee configuration',
          adminNotes: 'This is a sample configuration. Update tenantId and approve to activate.'
        });

        await sampleConfig.save();
        console.log('   ✅ Created sample tenant configuration (draft status)');
        console.log('   📝 Note: Update tenantId and approve to activate');
        
      } catch (error) {
        console.error('❌ Error creating sample configurations:', error);
      }
    }
  }

  /**
   * Update existing payments with fee data (optional - for recent payments only)
   */
  async updateRecentPayments() {
    if (process.argv.includes('--update-recent-payments')) {
      console.log('\n💳 Updating recent successful payments with fee data...');
      
      try {
        const PaymentLink = require('../models/paymentLinkModel');
        const platformFeeService = require('../services/platformFeeService');
        
        // Get recent successful payments (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentPayments = await PaymentLink.find({
          status: 'SUCCESS',
          createdAt: { $gte: thirtyDaysAgo },
          platformFee: { $exists: false } // Only payments without fee data
        }).limit(100); // Limit for safety
        
        console.log(`   Found ${recentPayments.length} recent payments to update`);
        
        let updated = 0;
        let errors = 0;
        
        for (const payment of recentPayments) {
          try {
            const feeCalculation = await platformFeeService.calculateTransactionFee({
              amount: payment.amount,
              tenantId: payment.adminId,
              channelBundleId: payment.groupId,
              transactionDate: payment.createdAt
            });

            await PaymentLink.findByIdAndUpdate(payment._id, {
              platformFee: feeCalculation.platformFee,
              netAmount: feeCalculation.netAmount,
              feeCalculationData: {
                configId: feeCalculation.configUsed?.configId,
                version: feeCalculation.configUsed?.version,
                feeType: feeCalculation.feeType,
                feeRate: feeCalculation.feeRate,
                calculatedAt: new Date(),
                breakdown: feeCalculation.breakdown,
                recalculated: true,
                recalculatedAt: new Date()
              }
            });

            updated++;
          } catch (error) {
            console.error(`   Error updating payment ${payment._id}:`, error.message);
            errors++;
          }
        }
        
        console.log(`   ✅ Updated ${updated} payments successfully`);
        if (errors > 0) {
          console.log(`   ⚠️  ${errors} payments had errors`);
        }
        
      } catch (error) {
        console.error('❌ Error updating payments:', error);
      }
    }
  }

  /**
   * Generate migration report
   */
  generateReport() {
    console.log('\n📊 Migration Report');
    console.log('================================');
    console.log(`✅ Configurations created: ${this.createdConfigs}`);
    console.log(`❌ Errors encountered: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Error Details:');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.config ? `Config ${error.config}` : error.step}: ${error.error}`);
      });
    }
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Verify configurations in the Super Admin dashboard');
    console.log('   2. Test fee calculations with different amounts');
    console.log('   3. Create tenant-specific configurations as needed');
    console.log('   4. Monitor fee calculations in payment processing');
    
    if (this.errors.length === 0 && this.createdConfigs > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('   Platform fee management is now active.');
    } else if (this.errors.length > 0) {
      console.log('\n⚠️  Migration completed with errors.');
      console.log('   Please review and fix the errors above.');
    } else {
      console.log('\n❌ Migration failed.');
      console.log('   No configurations were created.');
    }
  }

  /**
   * Main migration process
   */
  async run() {
    try {
      console.log('🚀 Starting Platform Fee Migration');
      console.log('==================================');
      
      await this.connectDatabase();
      await this.findSuperAdmin();
      
      const canProceed = await this.checkMigrationStatus();
      if (!canProceed && !process.argv.includes('--force')) {
        console.log('❌ Migration stopped. Use --force to override.');
        process.exit(1);
      }
      
      await this.createFeeConfigurations();
      await this.createSampleTenantConfigs();
      await this.updateRecentPayments();
      await this.verifyConfigurations();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Migration failed with error:', error);
      this.errors.push({
        step: 'migration',
        error: error.message
      });
      this.generateReport();
      process.exit(1);
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

// Run migration if this file is executed directly
if (require.main === module) {
  console.log('Platform Fee Migration Script');
  console.log('Usage: node migratePlatformFees.js [options]');
  console.log('Options:');
  console.log('  --force                    Override existing configurations');
  console.log('  --with-samples            Create sample tenant configurations');
  console.log('  --update-recent-payments  Update recent payments with fee data');
  console.log('');
  
  const migration = new PlatformFeeMigration();
  migration.run();
}

module.exports = PlatformFeeMigration;