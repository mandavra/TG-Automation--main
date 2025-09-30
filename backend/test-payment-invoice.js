const mongoose = require('mongoose');
const { generateEnhancedPDFBuffer } = require("./services/enhancedPdfService");
const PaymentLink = require('./models/paymentLinkModel');
const User = require('./models/user.model');
const fs = require("fs");

// Connect to MongoDB
mongoose.connect('mongodb+srv://man:rL6LlQQ9QYjhQppV@cluster0.yxujymc.mongodb.net/tg', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Set these variables as needed
const PAYMENT_ID = "68d3bdbe8f30b2a90a4f8f51";
const USER_ID = "68d3bdbb8f30b2a90a4f8f48";

(async () => {
  console.log(`🚀 Starting invoice generation with payment data for user: ${USER_ID} and payment: ${PAYMENT_ID}`);
  
  try {
    // Find user
    const user = await User.findOne({ _id: USER_ID });
    if (!user) {
      console.error("❌ User not found");
      return;
    }
    console.log("✅ User found:", user.firstName, user.lastName);

    // Find payment link by payment id
    const payment = await PaymentLink.findOne({ _id: PAYMENT_ID, userid: USER_ID });
    if (!payment) {
      console.error("❌ Payment not found for this user and payment id");
      return;
    }
    console.log("✅ Payment found:", {
      amount: payment.amount,
      plan_name: payment.plan_name,
      purchase_datetime: payment.purchase_datetime,
      expiry_date: payment.expiry_date,
      status: payment.status
    });

    // Calculate GST
    const basePrice = parseFloat(payment.amount);
    const taxPercent = 18;
    const igstAmt = parseFloat(((basePrice * taxPercent) / 100).toFixed(2));
    const total = basePrice + igstAmt;

    // Generate invoice with real payment data
    const buffer = await generateEnhancedPDFBuffer({
      invoiceNo: `INV-${Date.now()}`,
      billDate: new Date(),
      userid: USER_ID,
      billedTo: {
        name: `${user.firstName} ${user.middleName || ""} ${user.lastName}`.trim(),
        email: user.email || "N/A",
        phone: user.phone || "N/A",
        // address: (user.State || user.state || "").toString().trim(),
        // state: (user.State || user.state || "").toString().trim(),
        stateName: (user.State || user.state || "").toString().trim()
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
      description: payment.plan_name || "Telegram Subscription Plan",
      serviceStartDate: payment.purchase_datetime || new Date(),
      serviceEndDate: payment.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      price: basePrice,
      igst: taxPercent,
      igstAmt: igstAmt,
      total: total,
      transactionId: payment.link_id || payment.transactionId || "TXN_" + Date.now()
    });
    
    console.log(`✅ PDF generated successfully! Buffer size: ${buffer.length} bytes`);
    
    const filename = `Invoice_Payment_User_${USER_ID}_${PAYMENT_ID}_${Date.now()}.pdf`;
    fs.writeFileSync(filename, buffer);
    console.log(`📄 Invoice saved as '${filename}'`);
    
    console.log("📋 Invoice Details:");
    console.log("- Service Start Date:", payment.purchase_datetime);
    console.log("- Service End Date:", payment.expiry_date);
    console.log("- Plan Name:", payment.plan_name);
    console.log("- Amount:", payment.amount);
    console.log("- GST (18%):", igstAmt);
    console.log("- Total:", total);
    
  } catch (error) {
    console.error("❌ Error generating invoice:", error);
  } finally {
    mongoose.connection.close();
  }
})();
