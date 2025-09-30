const fs = require("fs");
const { generateEnhancedPDFBuffer } = require("./services/enhancedPdfService");

(async () => {
  console.log("🚀 Starting invoice generation with payment data for user: 68d3bdbb8f30b2a90a4f8f48");
  
  try {
    // Simulate payment data (as it would come from PaymentLink)
    const paymentData = {
      amount: 10000,
      plan_name: "KMR LargeMidCap Services",
      purchase_datetime: new Date("2025-01-01"),
      expiry_date: new Date("2025-12-31"),
      link_id: "PAY_" + Date.now(),
      status: "SUCCESS"
    };

    // Simulate user data
    const userData = {
      firstName: "Test",
      lastName: "User",
      email: "testuser@example.com",
      phone: "+91 98765 43210",
      City: "Mumbai"
    };

    // Calculate GST
    const basePrice = parseFloat(paymentData.amount);
    const taxPercent = 18;
    const igstAmt = parseFloat(((basePrice * taxPercent) / 100).toFixed(2));
    const total = basePrice + igstAmt;

    console.log("📋 Payment Data:");
    console.log("- Amount:", paymentData.amount);
    console.log("- Plan:", paymentData.plan_name);
    console.log("- Purchase Date:", paymentData.purchase_datetime);
    console.log("- Expiry Date:", paymentData.expiry_date);
    console.log("- GST (18%):", igstAmt);
    console.log("- Total:", total);

    // Generate invoice with payment data
    const buffer = await generateEnhancedPDFBuffer({
      invoiceNo: `INV-${Date.now()}`,
      billDate: new Date(),
      userid: "68d3bdbb8f30b2a90a4f8f48",
      billedTo: {
        name: `${userData.firstName} ${userData.lastName}`.trim(),
        email: userData.email,
        phone: userData.phone,
        address: userData.state,
        state: userData.state
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
      description: paymentData.plan_name,
      serviceStartDate: paymentData.purchase_datetime,
      serviceEndDate: paymentData.expiry_date,
      price: basePrice,
      igst: taxPercent,
      igstAmt: igstAmt,
      total: total,
      transactionId: paymentData.link_id
    });
    
    console.log(`✅ PDF generated successfully! Buffer size: ${buffer.length} bytes`);
    
    const filename = `Invoice_Payment_User_68d3bdbb8f30b2a90a4f8f48_${Date.now()}.pdf`;
    fs.writeFileSync(filename, buffer);
    console.log(`📄 Invoice saved as '${filename}'`);
    
    console.log("✅ Invoice generated with payment data successfully!");
    
  } catch (error) {
    console.error("❌ Error generating invoice:", error);
  }
})();
