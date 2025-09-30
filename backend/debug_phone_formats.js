// Debug phone number formats issue
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-automation';

async function debugPhoneFormats() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(uri);
    console.log('✅ Connected to database');

    console.log('\n📱 DEBUGGING PHONE NUMBER FORMAT ISSUE');
    console.log('====================================');

    // Test both phone formats that we're seeing
    const phoneFromURL = '+917202025010';  // From the failing URL
    const phoneFromWorking = '917020025010'; // From our previous tests
    
    console.log('\n🔍 Testing both phone formats:');
    console.log('Phone from URL:', phoneFromURL);
    console.log('Phone from working test:', phoneFromWorking);
    
    // Test URL format
    console.log('\n1️⃣ Testing URL phone format:', phoneFromURL);
    const response1 = await fetch(`http://localhost:4000/api/user/dashboard/${encodeURIComponent(phoneFromURL)}`);
    const data1 = await response1.json();
    
    if (response1.ok && data1.success) {
      console.log('✅ URL phone format works!');
      console.log('   - Total Subscriptions:', data1.data?.summary?.totalSubscriptions || 0);
      console.log('   - User Phone in DB:', data1.data?.user?.phone);
    } else {
      console.log('❌ URL phone format failed:', data1.message);
    }
    
    // Test working format
    console.log('\n2️⃣ Testing working phone format:', phoneFromWorking);
    const response2 = await fetch(`http://localhost:4000/api/user/dashboard/${phoneFromWorking}`);
    const data2 = await response2.json();
    
    if (response2.ok && data2.success) {
      console.log('✅ Working phone format works!');
      console.log('   - Total Subscriptions:', data2.data?.summary?.totalSubscriptions || 0);
      console.log('   - User Phone in DB:', data2.data?.user?.phone);
    } else {
      console.log('❌ Working phone format failed:', data2.message);
    }
    
    // Check what's actually stored in localStorage vs what's in URL
    console.log('\n🔍 ANALYSIS:');
    console.log('The issue is likely:');
    console.log('1. localStorage has: 917020025010 (without +)');
    console.log('2. URL parameter becomes: +917202025010 (with + but wrong number!)');
    console.log('3. Database has: +917020025010 (with + and correct number)');
    
    console.log('\n💡 SOLUTION:');
    console.log('The URL should be: /dashboard?phone=+917020025010 (note the correct phone number)');
    console.log('But localStorage probably has: 917020025010');
    console.log('We need to ensure the correct phone number is used consistently.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

debugPhoneFormats();
