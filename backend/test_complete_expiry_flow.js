const axios = require('axios');
const ChannelMember = require('./models/ChannelMember');
const InviteLink = require('./models/InviteLink');
const mongoose = require('mongoose');
require('dotenv').config();

async function testCompleteFlow() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot');
        console.log('✅ Connected to MongoDB');

        console.log('🧪 Testing Complete Expiry Flow\n');

        // 1. Test expiry stats endpoint
        console.log('1️⃣ Testing expiry stats endpoint...');
        try {
            const statsResponse = await axios.get('http://localhost:4000/api/admin/expiry-stats');
            console.log('📊 Expiry Stats:', JSON.stringify(statsResponse.data, null, 2));
        } catch (error) {
            console.error('❌ Stats endpoint error:', error.message);
        }

        // 2. Check current channel members
        console.log('\n2️⃣ Checking current channel members...');
        const members = await ChannelMember.find({ isActive: true });
        console.log(`👥 Active members: ${members.length}`);
        members.forEach(member => {
            console.log(`   📱 User: ${member.telegramUserId}, Channel: ${member.channelId}, Expires: ${member.expiresAt}`);
        });

        // 3. Check invite links
        console.log('\n3️⃣ Checking invite links...');
        const links = await InviteLink.find({}).sort({ created_at: -1 }).limit(5);
        console.log(`🔗 Recent invite links: ${links.length}`);
        links.forEach(link => {
            console.log(`   Link: ${link.link}, Used: ${link.is_used}, Expires: ${link.expires_at}`);
        });

        // 4. Create a test expired member to verify kick functionality
        console.log('\n4️⃣ Creating test expired member...');
        const testMember = new ChannelMember({
            telegramUserId: '999999999', // Test user ID
            channelId: '-1002842114460', // Trial 1 channel
            joinedAt: new Date(Date.now() - 10 * 60 * 1000), // Joined 10 minutes ago
            expiresAt: new Date(Date.now() - 1 * 60 * 1000), // Expired 1 minute ago
            isActive: true,
            inviteLinkUsed: 'test_link_expired',
            userInfo: {
                firstName: 'Test',
                lastName: 'Expired',
                username: 'testexpired'
            },
            channelInfo: {
                title: 'Trial 1',
                bundleName: 'first group'
            }
        });

        await testMember.save();
        console.log('✅ Created test expired member');

        // 5. Trigger manual expiry check
        console.log('\n5️⃣ Triggering manual expiry check...');
        try {
            const kickResponse = await axios.post('http://localhost:4000/api/admin/kick-expired');
            console.log('🔄 Kick response:', kickResponse.data);
        } catch (error) {
            console.error('❌ Manual kick error:', error.message);
        }

        // 6. Check stats again
        console.log('\n6️⃣ Checking stats after expiry check...');
        try {
            const statsResponse = await axios.get('http://localhost:4000/api/admin/expiry-stats');
            console.log('📊 Updated Expiry Stats:', JSON.stringify(statsResponse.data, null, 2));
        } catch (error) {
            console.error('❌ Stats endpoint error:', error.message);
        }

        // 7. Verify the test member was marked inactive
        console.log('\n7️⃣ Verifying test member status...');
        const updatedMember = await ChannelMember.findById(testMember._id);
        if (updatedMember) {
            console.log(`📋 Test member status:`, {
                isActive: updatedMember.isActive,
                kickedAt: updatedMember.kickedAt,
                kickReason: updatedMember.kickReason
            });
        }

        console.log('\n✅ Complete flow test finished!');

    } catch (error) {
        console.error('❌ Test flow error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📤 Disconnected from MongoDB');
    }
}

// Run the test
testCompleteFlow();
