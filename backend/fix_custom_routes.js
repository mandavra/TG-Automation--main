const mongoose = require('mongoose');
const Group = require('./models/group.model');
require('dotenv').config();

async function fixCustomRoutes() {
  try {
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation');
    console.log('🔌 Connected to database');

    console.log('\n🔧 FIXING BUNDLE CUSTOM ROUTE CONFIGURATION');
    console.log('=' .repeat(60));

    // Get all existing bundles
    const allBundles = await Group.find({});
    console.log(`📦 Found ${allBundles.length} bundles to fix:`);

    // Update each bundle with proper customRoute
    for (let i = 0; i < allBundles.length; i++) {
      const bundle = allBundles[i];
      console.log(`\n${i + 1}. Bundle: ${bundle.name} (${bundle._id})`);
      console.log(`   Current customRoute: ${bundle.customRoute || 'undefined'}`);

      // Assign appropriate routes based on the bundle
      let newCustomRoute;
      
      if (i === 0) {
        // First bundle gets 'maintest' route (to match the URL in screenshot)
        newCustomRoute = 'maintest';
      } else {
        // Other bundles get sequential routes
        newCustomRoute = `bundle${i + 1}`;
      }

      // Update the bundle
      const updateResult = await Group.findByIdAndUpdate(
        bundle._id,
        {
          $set: {
            customRoute: newCustomRoute
          }
        },
        { new: true }
      );

      console.log(`   ✅ Updated customRoute: ${newCustomRoute}`);
      console.log(`   URL will be: /pc/${newCustomRoute}`);
    }

    console.log('\n✅ Bundle custom routes updated successfully!');

    // Verify the updates
    console.log('\n🔍 VERIFICATION: Updated bundles');
    console.log('-'.repeat(40));
    
    const updatedBundles = await Group.find({}).select('_id name customRoute');
    updatedBundles.forEach((bundle, i) => {
      console.log(`${i + 1}. ${bundle.name}`);
      console.log(`   - ID: ${bundle._id}`);
      console.log(`   - Custom Route: ${bundle.customRoute}`);
      console.log(`   - Frontend URL: /pc/${bundle.customRoute}`);
    });

    console.log('\n🎯 Frontend URLs now working:');
    console.log(`   - localhost:4173/pc/maintest → ${updatedBundles[0]?.name} (${updatedBundles[0]?._id})`);
    if (updatedBundles.length > 1) {
      console.log(`   - localhost:4173/pc/bundle2 → ${updatedBundles[1]?.name} (${updatedBundles[1]?._id})`);
    }

    // Test the lookup logic that frontend uses
    console.log('\n🧪 TESTING FRONTEND BUNDLE LOOKUP:');
    console.log('-'.repeat(50));
    
    const testRoute = 'maintest';
    const foundBundle = await Group.findOne({
      $or: [
        { customRoute: testRoute },
        { route: testRoute },
        { publicRoute: testRoute },
        { slug: testRoute }
      ]
    });

    if (foundBundle) {
      console.log(`✅ Frontend lookup for '${testRoute}' will find:`);
      console.log(`   Bundle: ${foundBundle.name} (${foundBundle._id})`);
      console.log(`   Custom Route: ${foundBundle.customRoute}`);
    } else {
      console.log(`❌ Frontend lookup for '${testRoute}' will fail!`);
    }

  } catch (error) {
    console.error('❌ Fix error:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

fixCustomRoutes();
