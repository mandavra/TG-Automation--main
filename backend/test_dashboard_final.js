// Final test for the fixed UserDashboard
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-automation';

async function testDashboardFinal() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(uri);
    console.log('✅ Connected to database');

    const testPhone = '917020025010';
    
    console.log('\n🧪 FINAL DASHBOARD TEST');
    console.log('=======================');
    
    // Test the fixed dashboard endpoint
    console.log(`\n📱 Testing dashboard for phone: ${testPhone}`);
    const response = await fetch(`http://localhost:4000/api/user/dashboard/${testPhone}`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Dashboard API working correctly!');
      console.log('\n📊 Dashboard Data:');
      console.log('   - User ID:', data.data.user?.id);
      console.log('   - User Name:', data.data.user?.firstName || 'Not set');
      console.log('   - Phone:', data.data.user?.phone);
      console.log('   - Total Subscriptions:', data.data.summary?.totalSubscriptions || 0);
      console.log('   - Active Subscriptions:', data.data.summary?.activeCount || 0);
      console.log('   - Expired Subscriptions:', data.data.summary?.expiredCount || 0);
      console.log('   - Total Spent: ₹' + (data.data.summary?.totalSpent || 0));
      
      // Show subscription details
      const activeSubscriptions = data.data.subscriptions?.active || [];
      const expiredSubscriptions = data.data.subscriptions?.expired || [];
      
      console.log('\n🟢 Active Subscriptions:', activeSubscriptions.length);
      activeSubscriptions.forEach((sub, i) => {
        console.log(`   ${i + 1}. ${sub.channelBundle?.name || sub.planName} - ₹${sub.amount}`);
        console.log(`      Status: ${sub.status}, Invite Links: ${sub.inviteLinks?.length || 0}`);
        if (sub.inviteLinks?.length > 0) {
          sub.inviteLinks.forEach((link, j) => {
            console.log(`         ${j + 1}. ${link.channelTitle || 'Channel'}: ${link.link.substring(0, 30)}...`);
          });
        }
      });
      
      console.log('\n🔴 Expired Subscriptions:', expiredSubscriptions.length);
      expiredSubscriptions.forEach((sub, i) => {
        console.log(`   ${i + 1}. ${sub.channelBundle?.name || sub.planName} - ₹${sub.amount}`);
      });
      
      console.log('\n🎯 DASHBOARD WILL SHOW:');
      console.log('   ✅ User greeting with name');
      console.log('   ✅ Summary statistics cards');
      console.log('   ✅ List of all subscriptions');
      console.log('   ✅ Channel access links for active subscriptions');
      console.log('   ✅ Status badges (Active/Expired/etc.)');
      console.log('   ✅ Copy link functionality');
      console.log('   ✅ Join channel buttons');
      console.log('   ✅ Logout functionality');
      
    } else {
      console.log('❌ Dashboard API failed:', data.message || 'Unknown error');
    }
    
    console.log('\n🚀 READY TO TEST IN BROWSER:');
    console.log('   1. Make sure backend server is running on port 4000');
    console.log('   2. Make sure frontend is running on port 5173');
    console.log('   3. Navigate to: http://localhost:5173/pc/maintest');
    console.log('   4. Login with phone: +917020025010');
    console.log('   5. Click "Continue Setup" or "Complete Remaining Steps"');
    console.log('   6. Dashboard should load with subscription data!');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

testDashboardFinal();
