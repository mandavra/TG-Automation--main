const axios = require('axios');
require('dotenv').config();

// Validate environment variables on startup
const validateConfig = () => {
    const requiredVars = ['AMAZESMS_USER', 'AMAZESMS_AUTHKEY', 'AMAZESMS_SENDER'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
};

validateConfig();

const AMAZESMS_CONFIG = {
    user: process.env.AMAZESMS_USER,
    authkey: process.env.AMAZESMS_AUTHKEY,
    sender: process.env.AMAZESMS_SENDER,
    entityid: process.env.AMAZESMS_ENTITYID || '1001612146484297247',
    templateid: process.env.AMAZESMS_TEMPLATEID || '1007542138834564545'
};

/**
 * Formats phone number to required format
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 * @throws {Error} If phone number is invalid
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
 * Sends OTP via AmazeSMS API
 * @param {string} phone - Recipient phone number
 * @returns {Promise<{success: boolean, message: string, phone: string, timestamp: string}>} 
 * @throws {Error} If OTP sending fails
 */
const sendOtp = async (phone) => {
    try {
        if (!phone) throw new Error('Phone number is required');

        const formattedPhone = formatPhoneNumber(phone);
        
        // Generate a random 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        
        const message = `Your OTP is ${otp}. It is valid for 10 minutes. Do not share this with anyone. - Vyom Research`;

        const url = 'https://amazesms.in/api/pushsms';
        const params = {
            user: AMAZESMS_CONFIG.user,
            authkey: AMAZESMS_CONFIG.authkey,
            sender: AMAZESMS_CONFIG.sender,
            mobile: formattedPhone,
            text: message,
            entityid: AMAZESMS_CONFIG.entityid,
            templateid: AMAZESMS_CONFIG.templateid
        };

        console.log('AmazeSMS sending to:', formattedPhone);
        console.log('AmazeSMS params:', { ...params, authkey: '***HIDDEN***' });
        
        const response = await axios.get(url, { 
            params,
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        console.log('AmazeSMS response:', response.data);

        if (response.data && (response.data.STATUS === 'OK' || response.data.status === 'success' || response.data.status === 'SUCCESS')) {
          return {
            success: true,
            message: 'OTP sent successfully',
            phone: formattedPhone,
            timestamp: new Date().toISOString(),
            otp: otp // Return OTP for storage in database
          };
        } else {
          throw new Error(response.data?.message || 'Failed to send OTP');
        }
    } catch (error) {
        console.error('[AmazeSMS Error]', {
            message: error.message,
            phone: phone,
            timestamp: new Date().toISOString()
        });

        throw new Error(
            error.response?.data?.message ||
            error.message ||
            'Failed to send OTP. Please try again later.'
        );
    }
};

/**
 * Verifies OTP (this is handled by your database, not the SMS service)
 * @param {string} phone - Phone number to verify
 * @param {string} otp - OTP code to verify
 * @returns {Promise<{success: boolean, status: string, phone: string}>} 
 * @throws {Error} If verification fails
 */
const verifyOtp = async (phone, otp) => {
    if (!otp || otp.length !== 4) {
        throw new Error('OTP code must be 4 digits');
    }

    try {
        const formattedPhone = formatPhoneNumber(phone);

        // Note: OTP verification is handled by your database
        // This function is kept for compatibility but doesn't use AmazeSMS API
        return {
            success: true,
            status: 'approved',
            phone: formattedPhone
        };
    } catch (error) {
        console.error('[AmazeSMS Verification Error]', {
            message: error.message,
            phone: phone,
            timestamp: new Date().toISOString()
        });

        throw new Error('Invalid OTP or expired. Please try again.');
    }
};

/**
 * Sends a simple SMS using AmazeSMS API
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

        const url = 'https://amazesms.in/api/pushsms';
        const params = {
            user: AMAZESMS_CONFIG.user,
            authkey: AMAZESMS_CONFIG.authkey,
            sender: AMAZESMS_CONFIG.sender,
            mobile: formattedPhone,
            text: body,
            entityid: AMAZESMS_CONFIG.entityid,
            templateid: AMAZESMS_CONFIG.templateid
        };

        const response = await axios.get(url, { params });

                console.log('AmazeSMS SMS response:', response.data);

        if (response.data && (response.data.STATUS === 'OK' || response.data.status === 'success')) {
          return {
            success: true,
            message: `SMS sent to ${formattedPhone}`
          };
        } else {
          return {
            success: false,
            message: response.data?.message || 'Failed to send SMS'
          };
        }
    } catch (error) {
        console.error("Error sending SMS:", error);
        return {
            success: false,
            message: 'Failed to send SMS'
        };
    }
};

module.exports = {
    sendOtp,
    verifyOtp,
    sendSMS,
    formatPhoneNumber
}; 