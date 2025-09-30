const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Admin = require('./models/admin.model');
require('dotenv').config();

async function testAdminAuth() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/automation');
        console.log('📊 Connected to MongoDB');

        // Check if any admin exists
        const admins = await Admin.find({}).limit(5);
        console.log(`\n👥 Found ${admins.length} admin(s):`);
        
        admins.forEach((admin, index) => {
            console.log(`${index + 1}. ${admin.firstName} ${admin.lastName} (${admin.email})`);
            console.log(`   ID: ${admin._id}`);
            console.log(`   Role: ${admin.role || 'admin'}`);
            console.log(`   Status: ${admin.isActive ? 'Active' : 'Inactive'}`);
            console.log('');
        });

        if (admins.length > 0) {
            // Generate a test token for the first admin
            const admin = admins[0];
            const token = jwt.sign(
                { 
                    id: admin._id, 
                    email: admin.email,
                    role: admin.role || 'admin'
                },
                process.env.ADMIN_JWT_SECRET || 'admin_jwt_secret',
                { expiresIn: '24h' }
            );

            console.log('🔑 Test JWT Token for', admin.email);
            console.log('Token:', token);
            console.log('\n📋 Copy this token and use it in the frontend localStorage:');
            console.log(`localStorage.setItem('token', '${token}');`);
            console.log(`localStorage.setItem('tenantId', '${admin._id}');`);
            
            // Test the token
            try {
                const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || 'admin_jwt_secret');
                console.log('\n✅ Token verification successful:', {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role,
                    exp: new Date(decoded.exp * 1000)
                });
            } catch (error) {
                console.error('❌ Token verification failed:', error.message);
            }
        } else {
            console.log('❌ No admin found. Creating a test admin...');
            
            const testAdmin = new Admin({
                firstName: 'Test',
                lastName: 'Admin',
                email: 'admin@test.com',
                password: 'password123', // This should be hashed in real implementation
                role: 'superadmin',
                isActive: true
            });
            
            await testAdmin.save();
            console.log('✅ Created test admin:', testAdmin.email);
            
            // Generate token for new admin
            const token = jwt.sign(
                { 
                    id: testAdmin._id, 
                    email: testAdmin.email,
                    role: testAdmin.role
                },
                process.env.ADMIN_JWT_SECRET || 'admin_jwt_secret',
                { expiresIn: '24h' }
            );
            
            console.log('🔑 Test JWT Token for new admin:');
            console.log('Token:', token);
            console.log('\n📋 Use this in frontend localStorage:');
            console.log(`localStorage.setItem('token', '${token}');`);
            console.log(`localStorage.setItem('tenantId', '${testAdmin._id}');`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.disconnect();
    }
}

testAdminAuth();