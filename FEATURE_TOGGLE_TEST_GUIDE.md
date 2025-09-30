# Feature Toggle Testing Guide

## Issue Fixed
The frontend was calling the wrong API endpoint (`/api/groups/route/`) which didn't return feature toggles. Fixed to use `/api/groups/by-route/` which correctly includes feature toggles.

## Test URLs

### 1. First Group Bundle (All Features Disabled)
**URL:** `http://localhost:5173/pc/first-group`

**Expected Behavior:**
- ✅ Should show ONLY "Step 1: Register With Mobile number and OTP"
- ❌ Should NOT show payment, KYC, or e-sign steps
- ✅ After OTP verification, should generate Telegram link directly (no payment flow)

**Feature Toggles:**
```json
{
  "enableESign": false,
  "enableKYC": false, 
  "enablePayment": false
}
```

### 2. ABC Premium Bundle (All Features Enabled)  
**URL:** `http://localhost:5173/pc/abcpremium`

**Expected Behavior:**
- ✅ Should show ALL 4 steps:
  - Step 1: Register With Mobile number and OTP
  - Step 2: Select Plans and make Payment
  - Step 3: Complete KYC And Receive Link  
  - Step 4: Sign Document with Digio
- ✅ Should require payment → KYC → e-sign before generating Telegram link

**Feature Toggles:**
```json
{
  "enableESign": true,
  "enableKYC": true,
  "enablePayment": true
}
```

## Testing Steps

1. **Clear localStorage** (to start fresh):
   - Open browser console
   - Run: `BundleTestUtils.clearAllBundleData()`

2. **Test first-group bundle:**
   - Visit: `http://localhost:5173/pc/first-group`
   - Check console for debug logs
   - Verify only 1 step shows
   - Test OTP flow (should skip payment/KYC/e-sign)

3. **Test abcpremium bundle:**
   - Visit: `http://localhost:5173/pc/abcpremium`  
   - Check console for debug logs
   - Verify all 4 steps show
   - Test full payment → KYC → e-sign flow

4. **Verify bundle isolation:**
   - Test that localStorage keys are bundle-specific
   - Run: `BundleTestUtils.checkBundleStatus()` on each page
   - Verify different bundle IDs are used

## Debug Commands

**In browser console on any bundle page:**

```javascript
// Check current bundle status
BundleTestUtils.checkBundleStatus()

// Clear all bundle data
BundleTestUtils.clearAllBundleData()

// Test specific route
BundleTestUtils.testBundleRoute('first-group')
BundleTestUtils.testBundleRoute('abcpremium')

// Check localStorage data
BundleTestUtils.getAllBundleData()

// Manually set test toggles (for debugging)
BundleTestUtils.setTestToggles(false, false, false) // All disabled
BundleTestUtils.setTestToggles(true, true, true)   // All enabled
```

## Expected Debug Output

The console should show:
- ✅ Feature toggles being loaded from API response
- ✅ Bundle-specific localStorage keys (e.g., `paymentCompleted_68b18784332382f6ec9df2e4`)
- ✅ Different step counts for different bundles
- ✅ Steps filtering based on feature toggles

## API Verification

**Backend API endpoints working:**
- ✅ `/api/groups/by-route/first-group` - Returns feature toggles
- ✅ `/api/groups/by-route/abcpremium` - Returns feature toggles

**Database verification:**
- ✅ first-group bundle: all toggles false
- ✅ abcpremium bundle: all toggles true
