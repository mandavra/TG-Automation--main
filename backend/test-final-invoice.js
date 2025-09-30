const fs = require("fs");
const { generateEnhancedPDFBuffer } = require("./services/enhancedPdfService");

(async () => {
  console.log("🚀 Starting invoice generation...");
  
  try {
    const buffer = await generateEnhancedPDFBuffer({
      billedTo: {
        name: "KRISHNA MURTI",
        email: "krishnamazurtixx@gmail.com",
        phone: "+91 97319 96883",
        address: "BIHAR"
      },
      serviceStartDate: new Date("2025-01-04"),
      serviceEndDate: new Date("2025-12-04"),
      price: 10169,
      igst: 18,
      igstAmt: 1831,
      total: 12000,
      description: "KMR LargeMidCap Services"
    });
    
    console.log(`✅ PDF generated successfully! Buffer size: ${buffer.length} bytes`);
    
    fs.writeFileSync("Invoiceaee.pdf", buffer);
    console.log("📄 Invoice saved as 'Invoiceaee.pdf'");
    
  } catch (error) {
    console.error("❌ Error generating invoice:", error);
  }
})();
