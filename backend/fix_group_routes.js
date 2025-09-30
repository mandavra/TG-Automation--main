const mongoose = require('mongoose');
const Group = require('./models/group.model');
require('dotenv').config();

async function fixGroupRoutes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram_automation');
    console.log('🔗 Connected to database');
    
    const groups = await Group.find({});
    console.log(`📦 Found ${groups.length} groups to update`);
    
    for (const group of groups) {
      if (!group.customRoute) {
        // Generate a custom route from the group name
        const route = group.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with dashes
          .replace(/-+/g, '-') // Replace multiple dashes with single dash
          .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
        
        const finalRoute = route || 'group-' + group._id.toString().slice(-8);
        
        console.log(`📝 Updating group "${group.name}": adding route "${finalRoute}"`);
        
        await Group.findByIdAndUpdate(group._id, {
          customRoute: finalRoute,
          status: 'active' // Ensure it's active
        });
        
        console.log(`✅ Updated group ${group._id} with route: ${finalRoute}`);
      } else {
        console.log(`ℹ️  Group "${group.name}" already has route: ${group.customRoute}`);
      }
    }
    
    // Show final state
    console.log('\n📋 Final group states:');
    const updatedGroups = await Group.find({});
    updatedGroups.forEach(g => {
      console.log(`   ${g.name}: /pc/${g.customRoute} (ID: ${g._id})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixGroupRoutes();
