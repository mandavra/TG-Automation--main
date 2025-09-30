const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-bot');
    
    const Invoice = require('./models/Invoice');
    const invoices = await Invoice.find({});
    console.log('Total invoices:', invoices.length);
    
    if (invoices.length > 0) {
        const invoice = invoices[0];
        console.log('First invoice ID:', invoice._id);
        console.log('PDF Path:', invoice.localPdfPath);
        console.log('Invoice No:', invoice.invoiceNo);
        
        // Check if PDF file exists
        const fs = require('fs');
        if (invoice.localPdfPath) {
            const exists = fs.existsSync(invoice.localPdfPath);
            console.log('PDF file exists:', exists);
            if (!exists) {
                console.log('Expected path:', invoice.localPdfPath);
            }
        } else {
            console.log('No PDF path stored');
        }
    }
    
    mongoose.connection.close();
}

main().catch(console.error);
