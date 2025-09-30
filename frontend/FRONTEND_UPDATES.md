# Frontend Updates for AmazeSMS Integration

This document outlines the frontend changes made to support the migration from Twilio to AmazeSMS.

## Changes Made

### 1. Centralized API Service (`src/services/api.js`)
- Created a centralized API service layer for better organization
- Added axios interceptors for request/response handling
- Organized API calls into logical groups (OTP, User, Payment, KYC, Plan)
- Added automatic error handling and authentication token management

### 2. Configuration Management (`src/config/config.js`)
- Created a centralized configuration file
- Added environment variable support for API base URL
- Centralized validation rules, error messages, and app settings
- Made the app more configurable and maintainable

### 3. Updated Login Component (`src/Component/Login/Login.jsx`)
- Replaced direct axios calls with the new API service
- Added configuration-based validation
- Improved error handling with centralized messages
- Enhanced user experience with better toast notifications

### 4. Enhanced OTP Component (`src/Component/Login/OTP.jsx`)
- Added "Resend OTP" functionality with 60-second cooldown timer
- Replaced direct axios calls with the new API service
- Added configuration-based validation
- Improved user experience with better feedback
- Added automatic OTP input reset on resend

### 5. Improved Error Handling
- Centralized error messages in configuration
- Better user feedback with toast notifications
- Consistent error handling across components

## New Features

### Resend OTP Functionality
- Users can resend OTP if they don't receive it
- 60-second cooldown timer to prevent spam
- Automatic OTP input reset when resending
- Visual feedback during the resend process

### Configuration-Based Validation
- Phone number validation using regex patterns
- OTP length validation
- Centralized error messages
- Easy to modify validation rules

### Enhanced User Experience
- Better loading states
- Improved error messages
- Consistent toast notifications
- Dark mode support maintained

## API Integration

The frontend now uses the following API endpoints through the centralized service:

### OTP Endpoints
- `POST /api/otp/send-otp` - Send OTP to phone number
- `POST /api/otp/verify-otp` - Verify OTP
- `POST /api/otp/reset-otp` - Reset OTP (if needed)

### Request/Response Format
The API calls remain the same, ensuring backward compatibility:

**Send OTP Request:**
```json
{
  "phone": "+91XXXXXXXXXX"
}
```

**Send OTP Response:**
```json
{
  "message": "OTP sent and saved successfully",
  "smsData": {
    "success": true,
    "message": "OTP sent successfully",
    "phone": "XXXXXXXXXX",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "otp": "1234"
  },
  "phone": "+91XXXXXXXXXX"
}
```

**Verify OTP Request:**
```json
{
  "phone": "+91XXXXXXXXXX",
  "otp": "1234"
}
```

**Verify OTP Response:**
```json
{
  "message": "OTP verified successfully",
  "user": {
    "_id": "user_id",
    "phone": "+91XXXXXXXXXX"
  }
}
```

## Environment Variables

Add these to your `.env` file in the frontend directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:4000/api

# App Configuration
VITE_APP_NAME=Telegram Bot
VITE_APP_VERSION=1.0.0
```

## Benefits

1. **Better Organization**: Centralized API calls and configuration
2. **Improved Maintainability**: Easy to modify settings and validation rules
3. **Enhanced User Experience**: Better error handling and feedback
4. **Scalability**: Easy to add new API endpoints and features
5. **Consistency**: Uniform error handling and validation across components

## Testing

To test the frontend changes:

1. Ensure the backend is running with AmazeSMS integration
2. Set up the environment variables
3. Test the login flow:
   - Enter phone number
   - Send OTP
   - Verify OTP
   - Test resend functionality
4. Verify error handling with invalid inputs
5. Test dark mode functionality

## Files Modified

- `src/services/api.js` (NEW)
- `src/config/config.js` (NEW)
- `src/Component/Login/Login.jsx` (MODIFIED)
- `src/Component/Login/OTP.jsx` (MODIFIED)
- `FRONTEND_UPDATES.md` (NEW)

## Dependencies

No new dependencies were added. The existing dependencies are sufficient:
- `axios` (already installed)
- `react-toastify` (already installed)
- `react-router-dom` (already installed) 