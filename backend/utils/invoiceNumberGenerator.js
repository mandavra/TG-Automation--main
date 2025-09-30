const mongoose = require('mongoose');

// Invoice Counter Schema for tracking sequential numbers
const invoiceCounterSchema = new mongoose.Schema({
  financialYear: { type: String, required: true, unique: true }, // e.g., "2526"
  counter: { type: Number, default: 0 }
}, { timestamps: true });

const InvoiceCounter = mongoose.model('InvoiceCounter', invoiceCounterSchema);

/**
 * Get current financial year in XXYY format
 * Financial year starts from April 1st
 * @returns {string} Financial year like "2425" for 2024-25
 */
function getCurrentFinancialYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

  let startYear, endYear;

  if (currentMonth >= 4) {
    // After April 1st - current FY
    startYear = currentYear;
    endYear = currentYear + 1;
  } else {
    // Before April 1st - previous FY
    startYear = currentYear - 1;
    endYear = currentYear;
  }

  // Format as XXYY (last 2 digits of each year)
  const startYearShort = startYear.toString().slice(-2);
  const endYearShort = endYear.toString().slice(-2);

  return startYearShort + endYearShort;
}

/**
 * Get last 3 digits of an ID
 * @param {string} id - MongoDB ObjectId or any string
 * @returns {string} Last 3 digits, padded with zeros if needed
 */
function getLastThreeDigits(id) {
  if (!id) return '000';
  const idStr = id.toString();
  const last3 = idStr.slice(-3);
  return last3.padStart(3, '0');
}

/**
 * Generate next invoice number in format: INV-XXXXYYYZZZWWWWW
 * @param {string} adminId - Admin ID
 * @param {string} channelBundleId - Channel Bundle ID (optional)
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise<string>} Generated invoice number
 */
async function generateInvoiceNumber(adminId, channelBundleId = null, retryCount = 0) {
  const maxRetries = 3;
  const retryDelay = Math.pow(2, retryCount) * 100; // Exponential backoff: 100ms, 200ms, 400ms

  try {
    // Validate inputs
    if (!adminId) {
      throw new Error('Admin ID is required for invoice number generation');
    }

    // Get current financial year
    const financialYear = getCurrentFinancialYear();

    // Get last 3 digits of admin ID
    const adminDigits = getLastThreeDigits(adminId);

    // Get last 3 digits of channel bundle ID (or 000 if not provided)
    const channelDigits = getLastThreeDigits(channelBundleId);

    // Get and increment counter for this financial year with write concern
    const counterDoc = await InvoiceCounter.findOneAndUpdate(
      { financialYear: financialYear },
      { $inc: { counter: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        // Enhanced safety options
        writeConcern: { w: 'majority', j: true }, // Ensure write is journaled and acknowledged
        maxTimeMS: 5000 // 5 second timeout
      }
    );

    // Check counter limit
    if (counterDoc.counter > 99999) {
      console.warn(`Counter exceeded maximum for FY ${financialYear}: ${counterDoc.counter}`);
      // Could implement auto-rollover to next financial year or other business logic
    }

    // Format counter as 5-digit number
    const counterStr = counterDoc.counter.toString().padStart(5, '0');

    // Construct invoice number
    const invoiceNumber = `INV-${financialYear}${adminDigits}${channelDigits}${counterStr}`;

    // Log successful generation
    console.log('Generated Invoice Number:', {
      invoiceNumber,
      financialYear,
      adminId,
      adminDigits,
      channelBundleId,
      channelDigits,
      counter: counterDoc.counter,
      timestamp: new Date().toISOString()
    });

    return invoiceNumber;

  } catch (error) {
    console.error(`Error generating invoice number (attempt ${retryCount + 1}):`, error);

    // Retry logic with exponential backoff
    if (retryCount < maxRetries) {
      console.log(`Retrying invoice number generation in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return generateInvoiceNumber(adminId, channelBundleId, retryCount + 1);
    }

    // All retries exhausted - use fallback
    console.error('All retries exhausted, using fallback invoice number');
    const timestamp = Date.now().toString().slice(-8);
    const adminDigits = getLastThreeDigits(adminId);
    const channelDigits = getLastThreeDigits(channelBundleId);
    const fallbackNumber = `INV-FALLBACK-${adminDigits}${channelDigits}${timestamp}`;

    // Log fallback for monitoring
    console.error('FALLBACK INVOICE NUMBER GENERATED:', {
      fallbackNumber,
      originalError: error.message,
      adminId,
      channelBundleId,
      timestamp: new Date().toISOString()
    });

    return fallbackNumber;
  }
}

/**
 * Get current invoice counter for a financial year
 * @param {string} financialYear - Financial year (optional, defaults to current)
 * @returns {Promise<number>} Current counter value
 */
async function getCurrentCounter(financialYear = null) {
  try {
    const fy = financialYear || getCurrentFinancialYear();
    const counterDoc = await InvoiceCounter.findOne({ financialYear: fy });
    return counterDoc ? counterDoc.counter : 0;
  } catch (error) {
    console.error('Error getting current counter:', error);
    return 0;
  }
}

/**
 * Reset counter for a new financial year (admin utility)
 * @param {string} financialYear - Financial year to reset
 * @returns {Promise<boolean>} Success status
 */
async function resetCounterForFinancialYear(financialYear) {
  try {
    await InvoiceCounter.findOneAndUpdate(
      { financialYear: financialYear },
      { counter: 0 },
      { upsert: true }
    );
    console.log(`Reset invoice counter for FY ${financialYear}`);
    return true;
  } catch (error) {
    console.error('Error resetting counter:', error);
    return false;
  }
}

/**
 * Parse invoice number to extract components
 * @param {string} invoiceNumber - Invoice number to parse
 * @returns {object} Parsed components
 */
function parseInvoiceNumber(invoiceNumber) {
  const match = invoiceNumber.match(/^INV-(\d{4})(\d{3})(\d{3})(\d{5})$/);

  if (!match) {
    return { valid: false, error: 'Invalid invoice number format' };
  }

  return {
    valid: true,
    fullNumber: invoiceNumber,
    financialYear: match[1],
    adminDigits: match[2],
    channelDigits: match[3],
    counter: parseInt(match[4], 10)
  };
}

// Export functions
module.exports = {
  generateInvoiceNumber,
  getCurrentFinancialYear,
  getCurrentCounter,
  resetCounterForFinancialYear,
  parseInvoiceNumber,
  getLastThreeDigits,
  InvoiceCounter
};

// Test function for verification
async function testInvoiceNumberGeneration() {
  console.log('\n📋 Testing Invoice Number Generation');
  console.log('=====================================');

  const testAdminId = '507f1f77bcf86cd799439011';
  const testChannelId = '507f1f77bcf86cd799439022';

  console.log('Current Financial Year:', getCurrentFinancialYear());
  console.log('Admin ID Last 3:', getLastThreeDigits(testAdminId));
  console.log('Channel ID Last 3:', getLastThreeDigits(testChannelId));

  // Test parsing
  const testNumber = 'INV-252601102200001';
  const parsed = parseInvoiceNumber(testNumber);
  console.log('Parsed Invoice Number:', parsed);
}

// Uncomment to test
// testInvoiceNumberGeneration();