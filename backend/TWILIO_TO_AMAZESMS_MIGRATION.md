# Migration from Twilio to AmazeSMS

This document outlines the changes made to migrate from Twilio SMS service to AmazeSMS API.

## Changes Made

### 1. New Service File
- Created `services/amazeSmsService.js` to replace `services/twilioService.js`
- Implements the same interface as the original Twilio service for seamless migration

### 2. Updated OTP Controller
- Modified `controllers/otpController.js` to use AmazeSMS instead of Twilio
- Updated OTP generation logic to work with AmazeSMS API

### 3. Environment Variables
- Added new AmazeSMS environment variables
- Kept Twilio variables for backward compatibility (can be removed after testing)

## Environment Variables Required

Add these to your `.env` file:

```env
# AmazeSMS Configuration
AMAZESMS_USER=vyomResearch
AMAZESMS_AUTHKEY=928lk7F8tFoQ
AMAZESMS_SENDER=VYMRSH
AMAZESMS_ENTITYID=1001612146484297247
AMAZESMS_TEMPLATEID=1007542138834564545
```

## API Endpoints

The AmazeSMS service uses the following API endpoint:
```
https://amazesms.in/api/pushsms?user={user}&authkey={authkey}&sender={sender}&mobile={mobile}&text={text}&entityid={entityid}&templateid={templateid}
```

## Key Differences

1. **OTP Generation**: AmazeSMS service generates OTP locally and sends it via SMS
2. **Phone Number Format**: Expects 10-digit Indian phone numbers
3. **Response Format**: Returns success/error status with message
4. **No Verification API**: OTP verification is handled by your database

## Testing

To test the migration:

1. Set up the environment variables
2. Restart your server
3. Test the OTP sending functionality
4. Verify OTP verification works correctly

## Rollback Plan

If you need to rollback to Twilio:
1. Change the import in `otpController.js` back to `twilioService`
2. Restore the original OTP generation logic
3. Ensure Twilio environment variables are set

## Files Modified

- `services/amazeSmsService.js` (NEW)
- `controllers/otpController.js` (MODIFIED)
- `env_template.txt` (NEW)
- `TWILIO_TO_AMAZESMS_MIGRATION.md` (NEW)

## Dependencies

- `axios` (already installed in package.json)
- No additional dependencies required 