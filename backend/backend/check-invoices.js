const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot');

const Invoice = require('./models/Invoice');
const Admin = require('./models/admin.model');

async function checkInvoices() {
    try {
        console.log('=== Checking Invoice Data ===');
        
        // Get all invoices
        const allInvoices = await Invoice.find({}).populate('adminId');
        console.log(`\nFound ${allInvoices.length} total invoices in database:`);
        
        allInvoices.forEach((invoice, index) => {
            console.log(`\nInvoice ${index + 1}:`);
            console.log(`  ID: ${invoice._id}`);
            console.log(`  Invoice No: ${invoice.invoiceNo || 'N/A'}`);
            console.log(`  Customer: ${invoice.billedTo?.name || 'N/A'}`);
            console.log(`  Amount: ${invoice.total || invoice.price || 'N/A'}`);
            console.log(`  Admin ID: ${invoice.adminId?._id || invoice.adminId || 'N/A'}`);
            console.log(`  Admin Email: ${invoice.adminId?.email || 'N/A'}`);
            console.log(`  PDF Path: ${invoice.localPdfPath || 'N/A'}`);
            console.log(`  Created: ${invoice.createdAt}`);
        });
        
        // Get all admins
        const allAdmins = await Admin.find({});
        console.log(`\n=== Found ${allAdmins.length} admins ===`);
        
        allAdmins.forEach((admin, index) => {
            console.log(`Admin ${index + 1}: ${admin.email} (${admin.role}) - ID: ${admin._id}`);
        });
        
        // Check superadmin specifically
        const superAdmin = await Admin.findOne({ email: 'superadmin@tg.local' });
        if (superAdmin) {
            console.log(`\n=== Superadmin Invoice Count ===`);
            const superAdminInvoices = await Invoice.find({ adminId: superAdmin._id });
            console.log(`Superadmin has ${superAdminInvoices.length} invoices`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

checkInvoices();
