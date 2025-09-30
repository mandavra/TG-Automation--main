// Debug script to check invite links in database
const mongoose = require('./backend/node_modules/mongoose');

// MongoDB URI directly (from your .env)
const MONGODB_URI = 'mongodb+srv://man:rL6LlQQ9QYjhQppV@cluster0.yxujymc.mongodb.net/tg';

async function debugInviteLinks() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Define InviteLink schema inline
    const InviteLink = mongoose.model('InviteLink', new mongoose.Schema({
      link: String,
      link_id: String,
      telegramUserId: String,
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      is_used: { type: Boolean, default: false },
      used_by: String,
      used_at: Date,
      expires_at: Date,
      duration: Number,
      created_at: { type: Date, default: Date.now }
    }, { timestamps: true }));

    // Check all invite links in database
    const allLinks = await InviteLink.find({}).sort({ createdAt: -1 });
    
    console.log(`\n📋 Found ${allLinks.length} invite links in database:`);
    
    if (allLinks.length === 0) {
      console.log('❌ No invite links found in database!');
      console.log('This is why join requests are being declined.');
      console.log('\n🔧 Solutions:');
      console.log('1. The /getlink command is not storing links in database');
      console.log('2. Need to modify bot to store test links in database');
    } else {
      allLinks.forEach((link, index) => {
        console.log(`\n${index + 1}. Link ID: ${link._id}`);
        console.log(`   URL: ${link.link}`);
        console.log(`   User ID: ${link.userId || 'Not set'}`);
        console.log(`   Telegram User ID: ${link.telegramUserId || 'Not set'}`);
        console.log(`   Used: ${link.is_used}`);
        console.log(`   Expires: ${link.expires_at}`);
        console.log(`   Created: ${link.createdAt}`);
      });
    }

    // Check for recent unused links
    const recentUnused = await InviteLink.find({
      is_used: false,
      expires_at: { $gt: new Date() }
    });

    console.log(`\n🔍 Active (unused, not expired) links: ${recentUnused.length}`);
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugInviteLinks();