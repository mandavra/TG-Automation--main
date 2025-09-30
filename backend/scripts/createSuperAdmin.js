#!/usr/bin/env node

/**
 * Create Superadmin Account Setup Script
 * 
 * This script creates a superadmin account for the multi-tenant system.
 * Run this after tenant data migration to set up system administration.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('../models/admin.model');
require('dotenv').config();

async function createSuperAdmin() {
  try {
    console.log('🚀 Starting Superadmin Account Creation...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if superadmin already exists
    const existingSuperAdmin = await Admin.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('⚠️  Superadmin account already exists:');
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   ID: ${existingSuperAdmin._id}`);
      console.log('\n🔄 If you need to create a new superadmin, delete the existing one first.');
      return;
    }

    // Get superadmin credentials from environment or use defaults
    const email = process.env.SUPERADMIN_EMAIL || 'superadmin@yourcompany.com';
    const password = process.env.SUPERADMIN_PASSWORD || 'SuperSecurePassword123';
    const firstName = 'Super';
    const lastName = 'Admin';

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format for superadmin');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Superadmin password must be at least 8 characters long');
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create superadmin account
    console.log('👑 Creating superadmin account...');
    const superAdmin = new Admin({
      email: email,
      password: hashedPassword,
      role: 'superadmin',
      firstName: firstName,
      lastName: lastName,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await superAdmin.save();

    console.log('\n✅ Superadmin account created successfully!');
    console.log('📧 Email:', email);
    console.log('🆔 ID:', superAdmin._id);
    console.log('👑 Role:', superAdmin.role);
    
    console.log('\n🔐 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    
    console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
    console.log('   1. Change the default password immediately after first login');
    console.log('   2. Use a strong, unique password for production');
    console.log('   3. Enable 2FA if your admin panel supports it');
    console.log('   4. Remove SUPERADMIN_PASSWORD from .env after setup');
    
    console.log('\n🎯 Superadmin Capabilities:');
    console.log('   ✅ View all admin accounts and their data');
    console.log('   ✅ Create, update, and delete admin accounts');
    console.log('   ✅ Access all tenant data (users, payments, documents, etc.)');
    console.log('   ✅ Process withdrawal requests');
    console.log('   ✅ View system-wide statistics and analytics');
    console.log('   ✅ Impersonate other admins');
    console.log('   ✅ Global search across all tenants');

  } catch (error) {
    console.error('❌ Error creating superadmin:', error.message);
    
    if (error.code === 11000) {
      console.log('\n💡 This error usually means an admin with this email already exists.');
      console.log('   Either use a different email or delete the existing admin first.');
    }
    
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Handle script execution
if (require.main === module) {
  createSuperAdmin()
    .then(() => {
      console.log('\n🎉 Superadmin setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createSuperAdmin };
