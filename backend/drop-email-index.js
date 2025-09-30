/**
 * Drop email unique index to allow duplicate emails in KYC form
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function dropEmailIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot');
    console.log('✅ Connected to MongoDB');

    // Get users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Check existing indexes
    console.log('\n📋 Current indexes on users collection:');
    const indexes = await usersCollection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Drop email index if it exists
    try {
      await usersCollection.dropIndex('email_1');
      console.log('\n✅ Successfully dropped email_1 unique index');
    } catch (error) {
      if (error.message.includes('index not found')) {
        console.log('\nℹ️  Email index does not exist - nothing to drop');
      } else {
        console.log('\n⚠️  Error dropping email index:', error.message);
      }
    }

    // Check indexes after dropping
    console.log('\n📋 Indexes after dropping:');
    const indexesAfter = await usersCollection.indexes();
    indexesAfter.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n🎉 Email index removal complete! Users can now have duplicate emails.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the script if executed directly
if (require.main === module) {
  dropEmailIndex();
}

module.exports = { dropEmailIndex };