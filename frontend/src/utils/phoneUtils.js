/**
 * Phone number utility functions to ensure consistent formatting across the application
 */

/**
 * Formats phone number to include +91 prefix if not already present
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number with +91 prefix
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // If already starts with +91, return as is
  if (cleaned.startsWith('+91')) {
    return cleaned;
  }
  
  // If starts with 91 but no +, add the +
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  // If it's a 10-digit number, add +91 prefix
  if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  
  // Return cleaned version for any other case
  return cleaned;
};

/**
 * Gets phone number from localStorage with proper formatting
 * @returns {string} - Formatted phone number or empty string if not found
 */
export const getFormattedUserPhone = () => {
  const phone = localStorage.getItem('userPhone');
  return formatPhoneNumber(phone);
};

/**
 * Stores phone number in localStorage with proper formatting
 * @param {string} phone - Phone number to store
 */
export const setUserPhone = (phone) => {
  const formattedPhone = formatPhoneNumber(phone);
  localStorage.setItem('userPhone', formattedPhone);
};

/**
 * Validates if phone number has correct format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if phone number is valid
 */
export const isValidPhoneNumber = (phone) => {
  const formatted = formatPhoneNumber(phone);
  // Should be +91 followed by 10 digits
  return /^\+91\d{10}$/.test(formatted);
};

/**
 * Gets the 10-digit phone number without country code
 * @param {string} phone - Full phone number with country code
 * @returns {string} - 10-digit phone number
 */
export const getPhoneDigits = (phone) => {
  const formatted = formatPhoneNumber(phone);
  if (formatted.startsWith('+91')) {
    return formatted.slice(3);
  }
  return formatted.replace(/\D/g, '').slice(-10);
};
