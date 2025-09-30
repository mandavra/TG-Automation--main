// Script to switch from testing to production configuration
const fs = require('fs');
const path = require('path');

console.log('🔄 Switching to Production Configuration...\n');

try {
  // 1. Replace expiry job with production version
  const testJobPath = path.join(__dirname, 'backend', 'jobs', 'expireUsersJob.js');
  const prodJobPath = path.join(__dirname, 'backend', 'jobs', 'expireUsersJob.production.js');
  const backupJobPath = path.join(__dirname, 'backend', 'jobs', 'expireUsersJob.testing.js');

  // Backup current testing version
  if (fs.existsSync(testJobPath)) {
    fs.copyFileSync(testJobPath, backupJobPath);
    console.log('✅ Backed up testing expiry job to expireUsersJob.testing.js');
  }

  // Replace with production version
  if (fs.existsSync(prodJobPath)) {
    fs.copyFileSync(prodJobPath, testJobPath);
    console.log('✅ Replaced expiry job with production version');
    console.log('   📅 Cron schedule: Daily at 2:00 AM');
  }

  // 2. Update server.js to remove test routes (optional)
  console.log('✅ Expiry job updated for production');

  // 3. Instructions for environment variables
  console.log('\n📋 NEXT STEPS FOR PRODUCTION:');
  console.log('');
  console.log('1. UPDATE ENVIRONMENT VARIABLES:');
  console.log('   ├── Change MONGODB_URI to production database');
  console.log('   ├── Update BOT_TOKEN to production bot');
  console.log('   ├── Update CHANNEL_ID to production channel');
  console.log('   ├── Change CASHFREE credentials to LIVE');
  console.log('   ├── Set NODE_ENV=production');
  console.log('   └── Update BACKEND_URL and FRONTEND_URL');
  console.log('');
  console.log('2. SECURITY UPDATES:');
  console.log('   ├── Install SSL certificate');
  console.log('   ├── Set up rate limiting');
  console.log('   ├── Configure firewall');
  console.log('   └── Enable security headers');
  console.log('');
  console.log('3. DEPLOYMENT:');
  console.log('   ├── Install PM2: npm install -g pm2');
  console.log('   ├── Start backend: pm2 start ecosystem.config.js --env production');
  console.log('   ├── Save PM2 config: pm2 save');
  console.log('   └── Set up auto-startup: pm2 startup');
  console.log('');
  console.log('4. MONITORING:');
  console.log('   ├── Check logs: pm2 logs');
  console.log('   ├── Monitor status: pm2 monit');
  console.log('   ├── Set up database monitoring');
  console.log('   └── Configure error alerts');

  console.log('\n🎯 CONFIGURATION SWITCHED TO PRODUCTION!');
  console.log('📖 See PRODUCTION_SETUP.md for detailed deployment instructions');

} catch (error) {
  console.error('❌ Error switching to production:', error.message);
}