// Simple script to check invoices
console.log('Starting check...');

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/telegram-bot')
  .then(async () => {
    const Invoice = mongoose.model('Invoice', {
      invoiceNo: String,
      adminId: mongoose.Schema.Types.ObjectId,
      localPdfPath: String,
      billedTo: {
        name: String
      }
    });
    
    const invoices = await Invoice.find({});
    console.log('Total invoices found:', invoices.length);
    
    invoices.forEach(inv => {
      console.log(`- Invoice: ${inv.invoiceNo}, ID: ${inv._id}, AdminID: ${inv.adminId}, PDF: ${inv.localPdfPath ? 'Yes' : 'No'}`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });
