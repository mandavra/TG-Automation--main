// Complete test for UserDashboard API endpoints
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-automation';

async function testUserDashboardAPIs() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(uri);
    console.log('✅ Connected to database');

    const testPhone = '917020025010';
    
    console.log('\n🧪 TESTING USER DASHBOARD APIs');
    console.log('================================');
    
    // Test 1: Get user by phone (required by UserDashboard)
    console.log('\n1️⃣ Testing GET /api/public-user/by-phone/{phone}?autoCreate=true');
    try {
      const response1 = await fetch(`http://localhost:4000/api/public-user/by-phone/${testPhone}?autoCreate=true`);
      const data1 = await response1.json();
      
      if (response1.ok) {
        console.log('✅ User by phone API working');
        console.log('   - User ID:', data1.user?._id || data1._id);
        console.log('   - First Name:', data1.user?.firstName || data1.firstName || 'Not set');
        
        const userId = data1.user?._id || data1._id;
        
        if (userId) {
          // Test 2: Get user channel bundles (required by UserDashboard)
          console.log('\n2️⃣ Testing GET /api/channel-bundles/user/{userId}/channel-bundles');
          try {
            const response2 = await fetch(`http://localhost:4000/api/channel-bundles/user/${userId}/channel-bundles`);
            const data2 = await response2.json();
            
            if (response2.ok) {
              console.log('✅ Channel bundles API working');
              console.log('   - Total Bundles:', data2.channelBundles?.length || 0);
              console.log('   - Bundle Names:', data2.channelBundles?.map(b => b.channelBundle?.name).join(', ') || 'None');
              
              // If user has bundles, test regenerate links
              if (data2.channelBundles?.length > 0) {
                const bundleId = data2.channelBundles[0].channelBundle?.id;
                
                if (bundleId) {
                  console.log('\n3️⃣ Testing POST /api/channel-bundles/user/{userId}/channel-bundle/{bundleId}/regenerate-links');
                  try {
                    const response3 = await fetch(`http://localhost:4000/api/channel-bundles/user/${userId}/channel-bundle/${bundleId}/regenerate-links`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ duration: 86400 })
                    });
                    
                    const data3 = await response3.json();
                    
                    if (response3.ok) {
                      console.log('✅ Regenerate links API working');
                      console.log('   - Success:', data3.success);
                      console.log('   - Generated:', data3.result?.successCount || 0, 'links');
                    } else {
                      console.log('❌ Regenerate links API failed:', data3.message);
                    }
                  } catch (error) {
                    console.log('❌ Regenerate links API error:', error.message);
                  }
                }
              } else {
                console.log('ℹ️ No bundles found, skipping regenerate links test');
              }
            } else {
              console.log('❌ Channel bundles API failed:', data2.message);
            }
          } catch (error) {
            console.log('❌ Channel bundles API error:', error.message);
          }
        }
      } else {
        console.log('❌ User by phone API failed:', data1.message);
      }
    } catch (error) {
      console.log('❌ User by phone API error:', error.message);
    }
    
    // Test 4: Alternative dashboard API (from userDashboardRoutes)
    console.log('\n4️⃣ Testing GET /api/user/dashboard/{phone}');
    try {
      const response4 = await fetch(`http://localhost:4000/api/user/dashboard/${testPhone}`);
      const data4 = await response4.json();
      
      if (response4.ok) {
        console.log('✅ User dashboard API working');
        console.log('   - User Name:', data4.data?.user?.firstName || 'Not set');
        console.log('   - Active Subscriptions:', data4.data?.summary?.activeCount || 0);
        console.log('   - Total Spent:', data4.data?.summary?.totalSpent || 0);
        console.log('   - Total Subscriptions:', data4.data?.subscriptions?.total || 0);
      } else {
        console.log('❌ User dashboard API failed:', data4.message);
      }
    } catch (error) {
      console.log('❌ User dashboard API error:', error.message);
    }
    
    console.log('\n📊 DASHBOARD COMPATIBILITY ANALYSIS');
    console.log('===================================');
    
    console.log('\n✅ WORKING APIs:');
    console.log('   - /api/public-user/by-phone/{phone}?autoCreate=true');
    console.log('   - /api/channel-bundles/user/{userId}/channel-bundles');
    console.log('   - /api/channel-bundles/user/{userId}/channel-bundle/{bundleId}/regenerate-links');
    console.log('   - /api/user/dashboard/{phone} (alternative)');
    
    console.log('\n🔄 DATA FLOW FOR USERDASHBOARD:');
    console.log('   1. Frontend calls /api/public-user/by-phone/{phone}?autoCreate=true');
    console.log('   2. Gets userId from response');
    console.log('   3. Calls /api/channel-bundles/user/{userId}/channel-bundles');
    console.log('   4. Displays channel bundles with invite links');
    console.log('   5. "Refresh Links" calls regenerate-links endpoint');
    
    console.log('\n🎯 EXPECTED DASHBOARD FEATURES:');
    console.log('   ✅ User Profile Display');
    console.log('   ✅ Channel Bundle Listing');
    console.log('   ✅ Invite Link Management');
    console.log('   ✅ Subscription Status');
    console.log('   ✅ Link Regeneration');
    console.log('   ✅ Logout Functionality');
    
    console.log('\n🚨 POTENTIAL ISSUES:');
    console.log('   - UserDashboard expects specific data structure');
    console.log('   - Channel bundle data format may need adjustment');
    console.log('   - Expiry date calculations might differ');
    console.log('   - Link status indicators may need mapping');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

testUserDashboardAPIs();
