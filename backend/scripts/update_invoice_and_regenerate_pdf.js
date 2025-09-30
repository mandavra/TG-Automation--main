/*
  Usage (PowerShell / Bash):
  node backend/scripts/update_invoice_and_regenerate_pdf.js --id=<invoiceId> --total=500 --igstAmt=76.27 --igst=18

  Notes:
  - Connects using MONGODB_URI (falls back to local)
  - Updates invoice numeric fields and regenerates the local PDF using enhanced template
*/

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

 const Invoice = require('../models/Invoice');
 const { generateEnhancedPDFBuffer } = require('../services/enhancedPdfService');
 const { sendInvoiceEmail } = require('../services/emailService');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (const a of args) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  const { id, total, igstAmt, igst, uri, send } = parseArgs();
  if (!id) {
    console.error('Missing --id=<invoiceId>');
    process.exit(1);
  }

  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb+srv://man:rL6LlQQ9QYjhQppV@cluster0.yxujymc.mongodb.net/tg';
  await mongoose.connect("mongodb+srv://man:rL6LlQQ9QYjhQppV@cluster0.yxujymc.mongodb.net/tgmongoUri");

  try {
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      console.error('Invoice not found:', id);
      process.exit(1);
    }

    // Update fields if provided
    if (total !== undefined) invoice.total = Number(total);
    if (igstAmt !== undefined) invoice.igstAmt = Number(igstAmt);
    if (igst !== undefined) invoice.igst = Number(igst);

    // Derive base from Total - Tax if possible
    if (invoice.total != null && invoice.igstAmt != null) {
      const derivedBase = Number((Number(invoice.total) - Number(invoice.igstAmt)).toFixed(2));
      if (Number.isFinite(derivedBase) && derivedBase >= 0) {
        invoice.price = derivedBase;
      }
    }

    await invoice.save();

    // Regenerate enhanced PDF
    const pdfBuffer = await generateEnhancedPDFBuffer(invoice.toObject());
    const uploadDir = path.join(__dirname, '../public/uploads/invoices');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const localPdfPath = path.join(uploadDir, `invoice_${invoice._id}.pdf`);
    fs.writeFileSync(localPdfPath, pdfBuffer);

    invoice.localPdfPath = localPdfPath;
    await invoice.save();

    console.log('✅ Updated and regenerated PDF at:', localPdfPath);

    // Optionally email the invoice PDF to the user
    if (String(send || '').toLowerCase() === 'true' || String(send || '').toLowerCase() === 'yes') {
      const toEmail = invoice.billedTo?.email;
      if (toEmail) {
        try {
          await sendInvoiceEmail(
            toEmail,
            {
              creatorName: invoice.creator?.name || 'VYOM RESEARCH LLP',
              billedToName: invoice.billedTo?.name || '',
              billedToState: invoice.billedTo?.stateName || invoice.billedTo?.state || invoice.billedTo?.address,
              total: invoice.total,
              invoiceNo: invoice.invoiceNo,
              billDate: invoice.billDate,
              description: invoice.description
            },
            localPdfPath
          );
          console.log('📧 Invoice emailed to:', toEmail);
        } catch (emailErr) {
          console.error('Email send failed:', emailErr?.message || emailErr);
        }
      } else {
        console.warn('No billedTo.email found on invoice; skipping email send.');
      }
    }
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();


