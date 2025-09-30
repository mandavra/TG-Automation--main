// Note: Run this from the backend directory
// cd backend && node ../fix-invoice-paths.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

mongoose.connect('mongodb://localhost:27017/telegram-bot')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const Invoice = mongoose.model('Invoice', {
      invoiceNo: String,
      adminId: mongoose.Schema.Types.ObjectId,
      localPdfPath: String,
      billedTo: { name: String }
    });
    
    const invoices = await Invoice.find({});
    console.log(`Found ${invoices.length} invoices to check`);
    
    const correctBasePath = 'E:\\\\Codes\\\\TG Automation\\\\TG Automation\\\\TG Automation\\\\backend\\\\public\\\\uploads\\\\invoices';
    let fixedCount = 0;
    
    for (const invoice of invoices) {
      const currentPath = invoice.localPdfPath;
      const expectedPath = path.join(correctBasePath, `invoice_${invoice._id}.pdf`);
      
      console.log(`\nChecking invoice ${invoice.invoiceNo}:`);
      console.log(`  Current path: ${currentPath}`);
      console.log(`  Expected path: ${expectedPath}`);
      
      // Check if current path is invalid or file doesn't exist
      const needsFixing = !currentPath || 
                         currentPath === 'cloud/test/path/invoice.pdf' ||
                         !fs.existsSync(currentPath);
      
      if (needsFixing) {
        // Check if the expected PDF file exists
        if (fs.existsSync(expectedPath)) {
          console.log(`  ✅ Fixing path for ${invoice.invoiceNo}`);
          await Invoice.findByIdAndUpdate(invoice._id, {
            localPdfPath: expectedPath
          });
          fixedCount++;
        } else {
          console.log(`  ❌ PDF file missing for ${invoice.invoiceNo} at ${expectedPath}`);
        }
      } else {
        console.log(`  ✅ Path is correct and file exists`);
      }
    }
    
    console.log(`\nFixed ${fixedCount} invoice paths`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
