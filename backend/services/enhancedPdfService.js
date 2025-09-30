const fs = require("fs");
const PDFDocument = require("pdfkit");

class EnhancedInvoiceGenerator {
  constructor() {
    this.colors = {
      primary: "#1e3d59",
      accentBlue: "#e0f3ff",       // softer pastel blue (table header / grievance box)
      headerPurple: "#8B5CF6",
      border: "#dee2e6",
      danger: "#a50000",
      lightGrey: "#f8f9fa"
    };
  }

  // Map Indian GST state codes to state names
  getStateNameFromCode(code) {
    if (!code) return '';
    const map = {
      '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
      '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
      '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
      '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
      '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
      '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra',
      '28': 'Andhra Pradesh (Before division)', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
      '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar Islands',
      '36': 'Telangana', '37': 'Andhra Pradesh', '97': 'Other Territory'
    };
    const key = String(code).padStart(2, '0');
    return map[key] || '';
  }

  async generateProfessionalInvoice(invoiceData) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];
      doc.on("error", reject);
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      this.buildInvoice(doc, invoiceData);
      doc.end();
    });
  }

  buildInvoice(doc, invoice) {
    this.generateHeader(doc, invoice);
    this.generateBillingInfo(doc, invoice);
    this.generateItemTable(doc, invoice);
    this.generatePaymentInfo(doc, invoice);
    this.generateFooter(doc);
  }

  generateHeader(doc, invoice) {
    // Top red banner
    doc.rect(0, 0, doc.page.width, 22)
      .fillColor('#a50000')
      .fill();
    doc.fillColor('#fff')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Investment in securities market are subject to market risks. Read all the related documents carefully before investing.', 0, 7, { width: doc.page.width, align: 'center', lineGap: 2 });
    const headerTop = 32;
    // Company name and SEBI registration
    doc.fillColor('#1e3d59')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('VYOM RESEARCH LLP', 0, headerTop, { align: 'center', width: doc.page.width, lineGap: 4 });
    doc.fillColor('#8B5CF6')
      .fontSize(25)
      .font('Helvetica-Bold')
      .text('INVOICE', doc.page.width - 200, headerTop + 15, { align: 'right', width: 150, lineGap: 4 });
    doc.fillColor('#dc3545')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('SEBI® Research Analyst: INH000018221', 0, headerTop + 32, {  align: 'center',width: doc.page.width, lineGap: 2, });

    // Add GST Number prominently
    doc.fillColor('#1e3d59')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('GST Number: 24AAYFV4090K1ZE', 0, headerTop + 48, { align: 'center', width: doc.page.width, lineGap: 2 });

    // Website line
    doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#000')
        .text('Website:', doc.page.width - 200, headerTop + 66, { width: 150, align: 'right' });

   doc.fontSize(10)
     .font('Helvetica-Bold')
     .fillColor('#8B5CF6')
     .text('www.vyomresearch.in', doc.page.width - 200, headerTop + 80, {
       width: 150,
       align: 'right',
       link: 'https://www.vyomresearch.in'
      });

    // Invoice meta (number and date)
    const metaX = 40;
    const metaY = headerTop + 84;
    doc.fillColor('#1e3d59').font('Helvetica-Bold').fontSize(11).text('Invoice No:', metaX, metaY);
    doc.fillColor('#6c757d').font('Helvetica').text(String(invoice.invoiceNo || ''), metaX + 90, metaY);
    const billDate = invoice.billDate || invoice.createdAt;
    doc.fillColor('#1e3d59').font('Helvetica-Bold').text('Date of Issue:', metaX, metaY + 16);
    doc.fillColor('#6c757d').font('Helvetica').text(this.formatDate(billDate), metaX + 90, metaY + 16);
    doc.y = metaY + 48;
  }

  generateBillingInfo(doc, invoice) {
    const startY = doc.y + 15;
    // Left box
    doc.rect(40, startY, 260, 74).fillColor('#f8f9fa').strokeColor('#dee2e6').lineWidth(1).fillAndStroke();
    let y = startY + 10;
    doc.fillColor('#1e3d59').fontSize(11).font('Helvetica-Bold').text('Investor Name:', 55, y);
    const investorName = (invoice.billedTo?.name && String(invoice.billedTo.name).trim()) || 'nathi';
    doc.fillColor('#6c757d').font('Helvetica').text(investorName, 155, y);
    y += 16;
    doc.fillColor('#1e3d59').font('Helvetica-Bold').text('Email:', 55, y);
    doc.fillColor('#6c757d').font('Helvetica').text(invoice.billedTo?.email || '', 155, y);
    y += 16;
    doc.fillColor('#1e3d59').font('Helvetica-Bold').text('Mobile:', 55, y);
    doc.fillColor('#6c757d').font('Helvetica').text(invoice.billedTo?.phone || '', 155, y);
    y += 16;
    // State (render only if present)
    const stateCodeRaw = invoice.billedTo?.stateCode || invoice.user?.stateCode;
    const fallbackName = this.getStateNameFromCode(stateCodeRaw);
    const stateName = (
      invoice.billedTo?.stateName ||
      invoice.billedTo?.state ||
      invoice.buyerStateName ||
      invoice.user?.state ||
      invoice.user?.State ||
      invoice.user?.address?.state ||
      fallbackName ||
      ''
    );
    const stateDisplay = stateName
      ? (stateCodeRaw ? `${stateName} (${String(stateCodeRaw).padStart(2,'0')})` : stateName)
      : '';
    doc.fillColor('#1e3d59').font('Helvetica-Bold').text('State:', 55, y);
    doc.fillColor('#6c757d').font('Helvetica').text(stateDisplay, 155, y);
    // Right box
    doc.rect(320, startY, 250, 74).fillColor('#e0f3ff').strokeColor('#dee2e6').lineWidth(1).fillAndStroke();
    y = startY + 15;
    doc.fillColor('#1e3d59').fontSize(11).font('Helvetica-Bold').text('SERVICE START DATE:', 335, y);
    const svcStart = invoice.serviceStartDate || invoice.billDate || invoice.createdAt;
    doc.fillColor('#dc3545').font('Helvetica-Bold').text(this.formatDate(svcStart), 480, y);
    y += 22;
    doc.fillColor('#1e3d59').fontSize(11).font('Helvetica-Bold').text('SERVICE END DATE:', 335, y);
    const svcEnd = invoice.serviceEndDate || (() => {
      const base = svcStart || invoice.billDate;
      if (!base) return undefined;
      const d = new Date(base);
      d.setDate(d.getDate() + 30);
      return d;
    })();
    doc.fillColor('#dc3545').font('Helvetica-Bold').text(this.formatDate(svcEnd), 480, y);
    doc.y = startY + 86;
  }

  generateItemTable(doc, invoice) {
    const startY = doc.y + 8;
    // Table header
    doc.rect(40, startY, 480, 27).fillColor('#17a2b8').fill();
    doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold');
    doc.text('PRODUCT/SERVICE', 55, startY + 8);
    doc.text('PRICE', 300, startY + 8, { width: 60, align: 'center' });
    doc.text('QTY', 370, startY + 8, { width: 40, align: 'center' });
    doc.text('TOTAL', 430, startY + 8, { width: 70, align: 'right' });
    // Table row
    const rowY = startY + 27;
    doc.rect(40, rowY, 480, 27).fillColor('#fff').strokeColor('#dee2e6').lineWidth(1).fillAndStroke();
    doc.fillColor('#1e3d59').fontSize(10).font('Helvetica-Bold');
    doc.text(invoice.description || 'KMR LargeMidCap Services', 55, rowY + 8);
    doc.text(`Rs. ${(invoice.price || 0).toLocaleString()}`, 300, rowY + 8, { width: 60, align: 'center' });
    doc.text('1', 370, rowY + 8, { width: 40, align: 'center' });
    doc.text(`Rs. ${(invoice.price || 0).toLocaleString()}`, 430, rowY + 8, { width: 70, align: 'right' });
    doc.y = rowY + 35;
  }

  generatePaymentInfo(doc, invoice) {
    // Professional tax calculation text
    const taxDisclaimer = 'Tax calculations are transparent and compliant with applicable regulations.';
    const taxTransparency = 'All taxes are calculated as per current GST regulations.';
    const startY = doc.y + 8;
    // Payment details
    doc.fillColor('#dc3545').fontSize(9).font('Helvetica-Bold').text('PAYMENT DETAILS:', 40, startY);
    doc.fillColor('#6c757d').font('Helvetica').text('Please make payments for our services through our website. Any payments made outside of the specified bank account or payment gateway will not be considered as payment for our services. Kindly note that no complaints regarding such payments will be addressed.', 40, startY + 15, { width: 300, lineGap: 3 });
    // Styled card like UI 2 (Payment Breakdown & Tax Details)
    const cardX = 340;
    const cardW = 200;
    const pad = 10;
    // Use the correct amounts as stored in invoice
    const hasSplit = (typeof invoice.cgstAmt === 'number' || typeof invoice.sgstAmt === 'number');
    const cgstAmount = hasSplit ? Number(invoice.cgstAmt || 0) : 0;
    const sgstAmount = hasSplit ? Number(invoice.sgstAmt || 0) : 0;
    const igstAmount = !hasSplit ? Number(invoice.igstAmt || 0) : 0;
    const taxSum = hasSplit ? (cgstAmount + sgstAmount) : igstAmount;

    // Use the base price as calculated during invoice creation
    const base = Number(invoice.price || 0);
    const totalAmount = Number(invoice.total || 0);
    const gstLabel = hasSplit
      ? `CGST@${Number(invoice.cgst || 0)}% + SGST@${Number(invoice.sgst || 0)}%`
      : (invoice.gstLabel || `IGST@${Number(invoice.igst || 0)}%`);
    const cgstLabel = `CGST@${Number(invoice.cgst || 0)}%`;
    const sgstLabel = `SGST@${Number(invoice.sgst || 0)}%`;

    // Card container
    const contentY = startY + 8;
    let y = contentY;
    doc.rect(cardX, startY, cardW, 118).fillColor('#f8fbff').strokeColor('#e5eef7').lineWidth(1).fillAndStroke();
    // Header
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('Payment Breakdown & Tax Details', cardX + pad, y);
    y += 18;
    // Rows (label left, value right)
    const label = (t) => doc.fillColor('#1e3d59').font('Helvetica-Bold').fontSize(10).text(t, cardX + pad, y);
    const value = (v) => doc.fillColor('#1e3d59').font('Helvetica').text(v, cardX + cardW - pad - 80, y, { width: 80, align: 'right' });

    label('Plan Price (Base)'); value(`₹${base.toLocaleString('en-IN')}`); y += 14;
    label('Sub Total'); value(`₹${base.toLocaleString('en-IN')}`); y += 14;

    if (hasSplit) {
      label(cgstLabel); value(`₹${cgstAmount.toLocaleString('en-IN')}`); y += 14;
      label(sgstLabel); value(`₹${sgstAmount.toLocaleString('en-IN')}`); y += 14;
    } else {
      label(gstLabel); value(`₹${igstAmount.toLocaleString('en-IN')}`); y += 14;
    }

    // Divider
    doc.moveTo(cardX + pad, y + 2).lineTo(cardX + cardW - pad, y + 2).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 10;

    // Total Amount - use the exact payment amount
    doc.fillColor('#0f172a').font('Helvetica-Bold').text('Total Amount (Incl. GST)', cardX + pad, y);
    doc.fillColor('#2563eb').font('Helvetica-Bold').text(`₹${totalAmount.toLocaleString('en-IN')}`, cardX + cardW - pad - 80, y, { width: 80, align: 'right' });
    doc.y = Math.max(doc.y, startY + 130);
  }
  generateFooter(doc) {
    const marginX = 40;
    const pageWidth = 520;
  
    // Heading
    doc.moveDown().fillColor(this.colors.danger)
      .fontSize(10).font('Helvetica-Bold')
      .text('PLEASE READ TERMS AND CONDITIONS TO AVOID ANY FUTURE CONFLICT OF INTEREST:', marginX);
  
    doc.moveDown(0.3).fontSize(8.5).font('Helvetica').fillColor('#000');
    const terms = [
      '1. SEBI Registration: Vyom Research LLP is registered with SEBI as a Research Analyst under registration number INH000018221.',
      '2. Registration by SEBI and certification from NISM do not guarantee the performance of the intermediary or assure returns for investors.',
      '3. We provide research-based recommendations, including Buy/Sell/Hold calls and model portfolios based on fundamental and technical analyses. We do NOT offer investment advisory, portfolio management services (PMS), profit-sharing schemes, demat account handling, or trade execution services.',
      '4. Market conditions or company-specific events may lead to partial or permanent loss of capital or portfolio value. Past performance does not indicate future results.',
      '5. Any claims made on our behalf promising assured profits/returns must be reported immediately to our Compliance Officer at compliance@vyomresearch.in or +91 75675 40400. Engaging with unauthorized persons is at investor’s risk.',
      '6. All investment decisions are the sole responsibility of the investor. Vyom Research LLP will not be liable for losses incurred from acting on our research reports.',
      '7. If a client requests termination of service, no future service of research will be provided beyond the date of termination; refunds will be on a pro-rata basis.',
      '8. No Loss Claims: There is no legal avenue or entitlement for claiming compensation or reimbursement for losses incurred based on our research recommendations.',
      '9. For detailed Terms & Conditions, risk disclosures, and the Investor Charter, MITC, and Others, please visit: www.vyomresearch.in',
    ];
    terms.forEach(term => {
      doc.moveDown(0.3).text(term, { width: pageWidth });
    });
  
    // F&O Risk
    doc.moveDown(0.5).fillColor('#007bff').font('Helvetica-Bold')
      .text('10. F&O Risks: High risk involved; suitable only for investors with appropriate risk appetite.', { width: pageWidth });
  
    // Contact Info: Phone, Email, and Address on one row
    doc.moveDown(2.6);
    const usableWidth = pageWidth - marginX * 2;
    const phoneColW = Math.round(usableWidth * 0.23);
    const emailColW = Math.round(usableWidth * 0.28);
    const gapX = 28; // increased horizontal gap between columns for more space
    const addressColW = usableWidth - phoneColW - emailColW - (gapX * 2);
    const phoneX = marginX;
    const emailX = phoneX + phoneColW + gapX;
    const addressX = emailX + emailColW + gapX;
    const labelColor = this.colors.primary;
    const valueColor = '#17a2b8';
    const baseY = doc.y;
    const valueY = baseY + 20; // slightly more vertical space between label and value

    const iconStroke = '#13aab8';
    const iconSize = 22;
    const iconR = iconSize / 2;

    // Phone column (label top, value below)
    this.drawPhoneIcon(doc, phoneX - (iconR + 6), baseY + 10, iconR, iconStroke);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(labelColor);
    doc.text('Phone.', phoneX, baseY, { width: phoneColW });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(valueColor);
    doc.text('+91 75675 40400', phoneX, valueY, { width: phoneColW });

    // Email column (label top, value below)
    this.drawMailIcon(doc, emailX - (iconR + 6), baseY + 10, iconR, iconStroke);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(labelColor);
    doc.text('Email.', emailX, baseY, { width: emailColW });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(valueColor);
    doc.text('compliance@vyomresearch.in', emailX, valueY, { width: emailColW });

    // Address column (label top, value below with wrapping)
    this.drawLocationIcon(doc, addressX - (iconR + 6), baseY + 10, iconR, iconStroke);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(labelColor);
    doc.text('Address.', addressX, baseY, { width: addressColW });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(valueColor);
    doc.text('Shop No 238, 2nd Floor, Sky View, Sarthana, SURAT, GUJARAT, 395006', addressX, valueY, { width: addressColW, lineGap: 1 });
    doc.moveDown(2);
  
    // ===== FIXED POSITION FOOTER =====
    doc.addPage();
    const footerHeight = 100; // fixed box height
    const footerY = doc.page.height - footerHeight - 40; // 40 = bottom margin
  
    // Blue background box
    doc.fillColor(this.colors.accentBlue)
      .rect(marginX, footerY, pageWidth, footerHeight)
      .fill();
  
    // Grievance Heading
    doc.fillColor('#004f63').fontSize(9).font('Helvetica-Bold')
      .text('GRIEVANCE REDRESSAL/ESCALATION MATRIX', marginX + 10, footerY + 10);
  
    // Grievance Content
    doc.font('Helvetica').fillColor('#000').fontSize(8)
      .text('In case you are not satisfied with our response you can lodge your grievance with SEBI SCORES, Phone and ODR or to our compliance Team: compliance@vyomresearch.in | Phone: +91 75675 40400', marginX + 10, footerY + 26, { width: pageWidth - 20 });
  
    // SEBI Info
    doc.fontSize(8).fillColor('#000')
      .text('For any queries, feedback or assistance, please contact SEBI office on toll free Helpline at 1800 22 7575 / 1800 266 7575.', marginX + 10, footerY + 48, { width: pageWidth - 20 });
    doc.text('SEBI SCORES: https://scores.sebi.gov.in/', marginX + 10, footerY + 60);
    doc.text('SEBI ODR: https://smartodr.in/', marginX + 10, footerY + 70);

    // Final page with disclaimer
    doc.addPage();
    const note = '(This is a computer-generated invoice and does not require a physical signature.)';
    doc.fillColor('#444').font('Helvetica').fontSize(11)
      .text(note, 60, Math.floor(doc.page.height / 2) - 10, {
        width: doc.page.width - 120,
        align: 'center'
      });
  }
  
  // Simple vector icons to avoid external assets
  drawPhoneIcon(doc, cx, cy, r, color) {
    doc.save();
    doc.strokeColor(color).lineWidth(1.6);
    doc.circle(cx, cy, r).stroke();
    // receiver
    doc.moveTo(cx - 5, cy - 3).lineTo(cx + 5, cy + 3).stroke();
    doc.moveTo(cx - 5, cy + 3).lineTo(cx - 2, cy).stroke();
    doc.moveTo(cx + 2, cy + 6).lineTo(cx + 5, cy + 3).stroke();
    doc.restore();
  }
  drawMailIcon(doc, cx, cy, r, color) {
    doc.save();
    doc.strokeColor(color).lineWidth(1.6);
    doc.circle(cx, cy, r).stroke();
    const w = r + 6, h = r + 4;
    const x = cx - w / 2, y = cy - h / 2;
    doc.rect(x, y, w, h).stroke();
    doc.moveTo(x, y).lineTo(x + w / 2, y + h / 2).lineTo(x + w, y).stroke();
    doc.restore();
  }
  drawLocationIcon(doc, cx, cy, r, color) {
    doc.save();
    doc.strokeColor(color).lineWidth(1.6);
    doc.circle(cx, cy, r).stroke();
    // pin: small filled circle and a small triangle
    doc.fillColor(color);
    doc.circle(cx, cy - 2, 2.2).fill();
    doc.moveTo(cx, cy - 0.5).lineTo(cx - 3, cy + 4).lineTo(cx + 3, cy + 4).closePath().fill(color);
    doc.restore();
  }
  
  
  


  formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }
}

// Export helpers
const enhancedInvoiceGenerator = new EnhancedInvoiceGenerator();
const generateEnhancedPDFBuffer = async (invoiceData) =>
  await enhancedInvoiceGenerator.generateProfessionalInvoice(invoiceData);

module.exports = { generateEnhancedPDFBuffer, EnhancedInvoiceGenerator };
