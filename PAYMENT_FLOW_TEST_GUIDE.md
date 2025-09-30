# Payment Flow Test Guide

This guide outlines how to test the payment flow fixes to ensure the issues are resolved.

## Issues That Were Fixed

1. **Empty Dashboard After Payment**: Users saw zero data after successful payment
2. **Duplicate Payments**: Users could repurchase the same bundle multiple times
3. **Lost Purchase State**: Returning to bundle links triggered new payments instead of recognizing existing purchases
4. **Incorrect Redirects**: Payment success didn't redirect properly to show purchased bundles

## Test Scenarios

### Scenario 1: First-Time Purchase Flow

**Expected Behavior**: User should be able to complete payment and see their purchase in dashboard

1. **Setup**:
   - Ensure backend server is running on `http://localhost:4000`
   - Ensure frontend is running on `http://localhost:4000`
   - Have a valid channel bundle with active plans

2. **Steps**:
   - Visit a channel bundle page: `/pc/{customRoute}`
   - Select a subscription plan
   - Click "Subscribe" button
   - Complete payment on Cashfree gateway
   - Verify redirect to dashboard after payment success
   - Confirm the purchased bundle appears in "Active Channel Bundles" section

3. **Expected Results**:
   - ✅ Bundle shows in dashboard with "Active" status
   - ✅ Dashboard shows correct summary counts (1 active subscription)
   - ✅ User can click on bundle card to return to bundle page
   - ✅ Telegram invite links are visible (if applicable)

### Scenario 2: Duplicate Purchase Prevention

**Expected Behavior**: Users with existing subscriptions should not be able to purchase again

1. **Prerequisites**: Complete Scenario 1 first

2. **Steps**:
   - Return to the same channel bundle page: `/pc/{customRoute}`
   - Try to click on the same subscription plan

3. **Expected Results**:
   - ✅ Subscription button shows "Already Purchased" instead of price
   - ✅ Clicking button redirects to dashboard instead of payment
   - ✅ User sees message "You already have an active subscription for this bundle"

### Scenario 3: Payment Page Validation

**Expected Behavior**: Payment page should detect existing purchases

1. **Prerequisites**: Complete Scenario 1 first

2. **Steps**:
   - Try to access payment page directly with bundle data (e.g., by navigating back in browser)
   - Or try to trigger payment flow programmatically

3. **Expected Results**:
   - ✅ Payment page shows "Already Purchased" section instead of payment button
   - ✅ "Go to Dashboard" button is available
   - ✅ Clicking "Proceed to Secure Payment" redirects to dashboard with message

### Scenario 4: Backend Duplicate Prevention

**Expected Behavior**: Backend should reject duplicate payment requests

1. **Prerequisites**: Complete Scenario 1 first

2. **Steps**:
   - Make a direct API call to create payment link for same user/bundle:
   ```bash
   curl -X POST http://localhost:4000/api/payment/create-payment-link \
     -H "Content-Type: application/json" \
     -d '{
       "customer_id": "test_user",
       "userid": "test_user", 
       "phone": "1234567890",
       "amount": 100,
       "plan_id": "existing_plan_id",
       "plan_name": "Test Plan",
       "purchase_datetime": "2023-12-01T00:00:00Z",
       "expiry_date": "2024-01-01T00:00:00Z",
       "duration": 30
     }'
   ```

3. **Expected Results**:
   - ✅ API returns 409 status code
   - ✅ Response message indicates existing subscription
   - ✅ No new payment link is created

### Scenario 5: Dashboard Data Persistence

**Expected Behavior**: Dashboard should load user data from database, not localStorage

1. **Steps**:
   - Complete Scenario 1
   - Clear browser localStorage and sessionStorage
   - Navigate directly to dashboard: `/dashboard?phone={userPhone}`
   - Refresh the page multiple times

2. **Expected Results**:
   - ✅ Dashboard still shows purchased bundles after localStorage clear
   - ✅ Data persists across page refreshes
   - ✅ Bundle information is loaded from backend API
   - ✅ Summary counts are accurate

### Scenario 6: Return User Experience

**Expected Behavior**: Users returning after successful purchase should see their subscriptions

1. **Prerequisites**: Complete Scenario 1

2. **Steps**:
   - Close browser completely
   - Reopen browser and visit the original bundle page: `/pc/{customRoute}`
   - Try to access dashboard: `/dashboard?phone={userPhone}`

3. **Expected Results**:
   - ✅ Bundle page shows "Already Purchased" state for existing user
   - ✅ Dashboard loads with existing subscriptions
   - ✅ No empty state or "zero data" shown
   - ✅ User can access their purchased content

## Test Data Validation

### Database Checks

After completing tests, verify the following in your MongoDB database:

1. **PaymentLink Collection**:
   ```javascript
   // Check for test payment records
   db.paymentlinks.find({ phone: "test_phone_number" })
   ```
   - Should show payment records with correct status
   - Should have proper groupId linking to channel bundle
   - Should have correct expiry dates

2. **User Collection**:
   ```javascript
   // Check user account creation
   db.users.find({ phone: "test_phone_number" })
   ```
   - Should show user account with correct phone number

### API Endpoint Tests

Test individual API endpoints:

1. **Check Purchase API**:
   ```bash
   curl http://localhost:4000/api/user/check-purchase/{phone}/{bundleId}
   ```

2. **Dashboard API**:
   ```bash
   curl http://localhost:4000/api/user/dashboard/{phone}
   ```

3. **Payment Details API**:
   ```bash
   curl http://localhost:4000/api/payment/details/{orderId}
   ```

## Troubleshooting

### Common Issues

1. **Dashboard Shows Empty State**: 
   - Check if backend API endpoints are responding
   - Verify MongoDB connection
   - Check browser network tab for failed API calls

2. **Purchase Validation Not Working**:
   - Verify bundleId is correctly passed to components
   - Check backend logs for API call errors
   - Ensure database has correct groupId associations

3. **Payment Links Still Created for Existing Purchases**:
   - Check if groupId is properly set in plan lookup
   - Verify backend duplicate check logic
   - Check database for orphaned payment records

### Logs to Monitor

1. **Frontend Console**: Check for API call errors and state issues
2. **Backend Console**: Monitor payment creation and validation logs
3. **MongoDB Logs**: Verify database operations are working

## Success Criteria

The payment flow is working correctly when:

- ✅ New users can complete purchase and see bundles in dashboard
- ✅ Existing users cannot create duplicate payments
- ✅ Dashboard loads purchase data from database, not localStorage
- ✅ Payment success redirects to dashboard with visible purchases
- ✅ Bundle pages show correct purchase status for returning users
- ✅ No "empty dashboard" or "zero data" states for users with purchases

## Performance Considerations

- Purchase validation calls should not significantly slow down page loading
- Dashboard should load within 2-3 seconds for users with subscriptions
- Bundle pages should show purchase status within 1-2 seconds

## Security Validation

- Ensure payment validation cannot be bypassed by URL manipulation
- Verify backend properly validates user ownership before showing purchase data
- Check that payment creation requires valid user authentication
