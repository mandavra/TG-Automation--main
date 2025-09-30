const fs = require("fs");
const PDFDocument = require("pdfkit");
// const cloudinary = require("../services/cloudinaryService");
const { Readable } = require('stream');
const Invoice = require("../models/Invoice");

const generatePDFBuffer = async (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on('error', (error) => {
        reject(error);
      });
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      // PDF content (copy from your existing PDF generation logic)
      const primaryColor = "#145C7D";
      const greyLine = "#CCCCCC";
      // Add logo image (replace with your actual logo path if needed)
      try {
        doc.image('./public/logo.png', 50, 20, { width: 50, height: 50 }); // Adjust as needed
      } catch (e) {
        // If image not found, skip
      }
      doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);
      doc.fillColor("white").fontSize(26).font("Helvetica-Bold").text("INVOICE", 120, 30); // Move right to make space for logo
      const company = invoice.creator || {};
      doc.fontSize(10).font("Helvetica").fillColor("white");
      const companyInfo = [
        company.name,
        company.address,
        `GSTIN: ${company.gstin}`,
        `PAN: ${company.pan}`
      ].filter(Boolean);
      companyInfo.forEach((line, i) => {
        doc.text(line, 400, 25 + i * 12, { align: "right" });
      });
      doc.moveDown(3);
      doc.fillColor("black").fontSize(11);
      let infoY = doc.y;
      doc.font("Helvetica-Bold").text("Invoice No:", 50, infoY);
      doc.font("Helvetica").text(invoice.invoiceNo || "", 130, infoY);
      infoY += 15;
      doc.font("Helvetica-Bold").text("Date of Issue:", 50, infoY);
      doc.font("Helvetica").text(invoice.billDate?.toDateString() || "", 130, infoY);
      infoY += 15;
      doc.font("Helvetica-Bold").text("Transaction ID:", 50, infoY);
      doc.font("Helvetica").text(invoice.transactionId || "", 130, infoY);
      const billedTo = invoice.billedTo || {};
      const billToX = 350;
      let billToY = doc.y - 45;
      doc.font("Helvetica-Bold").fontSize(12).fillColor("black")
        .text("Bill To", billToX, billToY, { underline: true });
      doc.font("Helvetica").fontSize(10).fillColor("black");
      billToY += 15;
      doc.text(`Name: ${billedTo.name || ""}`, billToX, billToY);
      billToY += 12;
      doc.text(`Phone: ${billedTo.phone || ""}`, billToX, billToY);
      billToY += 12;
      doc.text(`Email: ${billedTo.email || ""}`, billToX, billToY);
      billToY += 12;
      doc.text(`Address: ${billedTo.address || ""}`, billToX, billToY);
      doc.moveDown(2);
      const tableTop = doc.y;
      doc.fontSize(11).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("Item", 50, tableTop);
      doc.text("Description", 90, tableTop);
      doc.text("Price", 300, tableTop, { width: 50 });
      doc.text("IGST %", 370, tableTop, { width: 50 });
      doc.text("IGST Amt", 450, tableTop, { width: 70 });
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor(greyLine).stroke();
      const rowY = tableTop + 25;
      doc.font("Helvetica").fillColor("black").fontSize(10);
      doc.text("1", 50, rowY);
      doc.text(invoice.description || "", 90, rowY);
      doc.text(`₹${(invoice.price || 0).toFixed(2)}`, 300, rowY, { width: 50 });
      doc.text(`${invoice.igst || 0}%`, 370, rowY, { width: 50 });
      doc.text(`₹${(invoice.igstAmt || 0).toFixed(2)}`, 450, rowY, { width: 70 });
      doc.font("Helvetica-Bold").fontSize(12).fillColor(primaryColor)
        .text(`Total Amount: ₹${(invoice.total || 0).toFixed(2)}`, 50, rowY + 50, { align: "right" });
      doc.fillColor("white")
        .rect(0, doc.page.height - 60, doc.page.width, 40)
        .fill(primaryColor)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Thank you for your business!", 0, doc.page.height - 50, {
          align: "center"
        });
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Add cleanup function for old invoices
const cleanupOldInvoices = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldInvoices = await Invoice.find({
      createdAt: { $lt: thirtyDaysAgo },
      pdfUrl: { $exists: true }
    });

    for (const invoice of oldInvoices) {
      const publicId = `invoices/invoice_${invoice._id}`;
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      invoice.pdfUrl = null;
      await invoice.save();
    }
  } catch (error) {
    console.error("Cleanup Error:", error);
  }
};

// Run cleanup daily
setInterval(cleanupOldInvoices, 24 * 60 * 60 * 1000);

module.exports = { generatePDFBuffer };