/**
 * Mock OTP Service for testing when SMS services are down
 * This service generates OTP but doesn't actually send SMS
 */

/**
 * Formats phone number
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
const formatPhoneNumber = (phone) => {
    if (!phone) {
        throw new Error('Phone number is required');
    }

    const digitsOnly = phone.replace(/\D/g, '');

    if (digitsOnly.length === 10) {
        return digitsOnly;
    }

    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
        return digitsOnly.substring(2);
    }

    if (digitsOnly.length === 11 && digitsOnly.startsWith('91')) {
        return digitsOnly.substring(1);
    }

    throw new Error('Invalid phone number format. Please provide a valid 10-digit phone number.');
};

/**
 * Sends OTP (mock - doesn't actually send SMS)
 * @param {string} phone - Recipient phone number
 * @returns {Promise<{success: boolean, message: string, phone: string, timestamp: string, otp: string}>} 
 */
const sendOtp = async (phone) => {
    try {
        if (!phone) throw new Error('Phone number is required');

        const formattedPhone = formatPhoneNumber(phone);
        
        // Generate a random 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        
        console.log(`[MOCK OTP] OTP ${otp} would be sent to ${formattedPhone}`);
        console.log(`[MOCK OTP] Message: Your OTP is ${otp}. It is valid for 10 minutes. Do not share this with anyone. - Vyom Research`);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            success: true,
            message: 'OTP generated successfully (MOCK - SMS not sent)',
            phone: formattedPhone,
            timestamp: new Date().toISOString(),
            otp: otp,
            mock: true
        };
    } catch (error) {
        console.error('[Mock OTP Error]', {
            message: error.message,
            phone: phone,
            timestamp: new Date().toISOString()
        });

        throw new Error(error.message || 'Failed to generate OTP');
    }
};

/**
 * Sends a simple SMS (mock - doesn't actually send SMS)
 * @param {string} body - Message body
 * @param {string} receiverNo - Recipient phone number
 * @returns {Promise<{success: boolean, message: string}>} - Response object
 */
const sendSMS = async (body, receiverNo) => {
    try {
        if (!body || !receiverNo) {
            throw new Error('Message body and recipient number are required');
        }

        const formattedPhone = formatPhoneNumber(receiverNo);

        console.log(`[MOCK SMS] Message would be sent to ${formattedPhone}: ${body}`);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            success: true,
            message: `SMS would be sent to ${formattedPhone} (MOCK - SMS not sent)`,
            mock: true
        };
    } catch (error) {
        console.error("Error in mock SMS:", error);
        return {
            success: false,
            message: 'Failed to generate mock SMS'
        };
    }
};

module.exports = {
    sendOtp,
    sendSMS,
    formatPhoneNumber
}; 