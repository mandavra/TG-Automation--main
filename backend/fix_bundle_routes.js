const mongoose = require('mongoose');
const Group = require('./models/group.model');
require('dotenv').config();

async function fixBundleRoutes() {
  try {
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation');
    console.log('🔌 Connected to database');

    console.log('\n🔧 FIXING BUNDLE ROUTE CONFIGURATION');
    console.log('=' .repeat(60));

    // Get all existing bundles
    const allBundles = await Group.find({});
    console.log(`📦 Found ${allBundles.length} bundles to fix:`);

    // Update each bundle with proper routes
    for (let i = 0; i < allBundles.length; i++) {
      const bundle = allBundles[i];
      console.log(`\n${i + 1}. Bundle: ${bundle.name} (${bundle._id})`);
      console.log(`   Current route: ${bundle.route || 'undefined'}`);
      console.log(`   Current publicRoute: ${bundle.publicRoute || 'undefined'}`);
      console.log(`   Current slug: ${bundle.slug || 'undefined'}`);

      // Assign appropriate routes based on the bundle
      let newRoute, newPublicRoute, newSlug;
      
      if (i === 0) {
        // First bundle gets 'maintest' route (to match the URL in screenshot)
        newRoute = 'maintest';
        newPublicRoute = 'maintest'; 
        newSlug = 'maintest';
      } else {
        // Other bundles get sequential routes
        newRoute = `bundle${i + 1}`;
        newPublicRoute = `bundle${i + 1}`;
        newSlug = `bundle${i + 1}`;
      }

      // Update the bundle
      const updateResult = await Group.findByIdAndUpdate(
        bundle._id,
        {
          $set: {
            route: newRoute,
            publicRoute: newPublicRoute,
            slug: newSlug
          }
        },
        { new: true }
      );

      console.log(`   ✅ Updated routes:`);
      console.log(`   - route: ${newRoute}`);
      console.log(`   - publicRoute: ${newPublicRoute}`);
      console.log(`   - slug: ${newSlug}`);
    }

    console.log('\n✅ Bundle routes updated successfully!');

    // Verify the updates
    console.log('\n🔍 VERIFICATION: Updated bundles');
    console.log('-'.repeat(40));
    
    const updatedBundles = await Group.find({}).select('_id name route publicRoute slug');
    updatedBundles.forEach((bundle, i) => {
      console.log(`${i + 1}. ${bundle.name}`);
      console.log(`   - ID: ${bundle._id}`);
      console.log(`   - Route: ${bundle.route}`);
      console.log(`   - Public Route: ${bundle.publicRoute}`);
      console.log(`   - Slug: ${bundle.slug}`);
      console.log(`   - URL: /pc/${bundle.route}`);
    });

    console.log('\n🎯 Now frontend URLs will work:');
    console.log(`   - localhost:4173/pc/maintest → ${updatedBundles[0]?.name} (${updatedBundles[0]?._id})`);
    if (updatedBundles.length > 1) {
      console.log(`   - localhost:4173/pc/bundle2 → ${updatedBundles[1]?.name} (${updatedBundles[1]?._id})`);
    }

  } catch (error) {
    console.error('❌ Fix error:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

fixBundleRoutes();
