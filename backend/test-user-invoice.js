const fs = require("fs");
const { generateEnhancedPDFBuffer } = require("./services/enhancedPdfService");

(async () => {
  console.log("🚀 Starting invoice generation for user: 68d3bdbb8f30b2a90a4f8f48");
  
  try {
    const buffer = await generateEnhancedPDFBuffer({
      invoiceNo: `INV-${Date.now()}`,
      billDate: new Date(),
      userid: "68d3bdbb8f30b2a90a4f8f48",
      billedTo: {
        name: "Test User",
        email: "test@example.com",
        phone: "+91 98765 43210",
        address: "Test City, Test State"
      },
      creator: {
        name: "VYOM RESEARCH LLP",
        pan: "AAYFV4090K",
        gstin: "24AAYFV4090K1ZE",
        address: "Shop no. 238 Services, Gujarat",
        stateCode: "24",
        email: "info@vyomresearch.com",
        phone: "+91 XXXXXXXXXX",
        website: "www.vyomresearch.com"
      },
      description: "Telegram Subscription Plan",
      serviceStartDate: new Date("2025-01-01"),
      serviceEndDate: new Date("2025-12-31"),
      price: 10000,
      igst: 18,
      igstAmt: 1800,
      total: 11800,
      transactionId: "TXN_" + Date.now()
    });
    
    console.log(`✅ PDF generated successfully! Buffer size: ${buffer.length} bytes`);
    
    const filename = `Invoice_User_68d3bdbb8f30b2a90a4f8f48_${Date.now()}.pdf`;
    fs.writeFileSync(filename, buffer);
    console.log(`📄 Invoice saved as '${filename}'`);
    
  } catch (error) {
    console.error("❌ Error generating invoice:", error);
  }
})();
