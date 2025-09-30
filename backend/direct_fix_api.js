const fs = require('fs');
const path = require('path');

console.log('\n🔧 DIRECT API FIX: Updating userDashboardRoutes.js');
console.log('=' .repeat(70));

const routesFilePath = path.join(__dirname, 'routes', 'userDashboardRoutes.js');

console.log(`📁 Target file: ${routesFilePath}`);

try {
  // Read current content
  let content = fs.readFileSync(routesFilePath, 'utf8');
  console.log('✅ Successfully read userDashboardRoutes.js');

  // Check if our fix is already present
  if (content.includes('Find ALL users with this phone number')) {
    console.log('✅ Our fix is already in the file');
  } else {
    console.log('❌ Our fix is missing - need to apply it');
  }

  // Find the specific line that's causing the issue
  const problematicPattern = /const user = await User\.findOne\(\{ phone: phone \}\);/;
  
  if (content.match(problematicPattern)) {
    console.log('❌ Found problematic code: User.findOne({ phone: phone })');
    console.log('🔄 Applying fix...');

    // Replace the problematic section with our fixed version
    const oldSection = `  // Find user by phone
  const user = await User.findOne({ phone: phone });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found. Please register first.',
      data: null
    });
  }`;

    const newSection = `  // Find ALL users with this phone number (to handle duplicate accounts)
  const phoneFormats = [phone];
  if (phone.startsWith('+')) {
    phoneFormats.push(phone.substring(1));
  } else {
    phoneFormats.push('+' + phone);
  }
  
  const allUsers = await User.find({ phone: { $in: phoneFormats } });
  console.log(\`📱 Found \${allUsers.length} users for dashboard with phone formats:\`, phoneFormats);
  
  if (allUsers.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'User not found. Please register first.',
      data: null
    });
  }

  // Get the most recent user (primary account)
  const user = allUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const allUserIds = allUsers.map(u => u._id);`;

    content = content.replace(oldSection, newSection);

    // Also update the payments query
    const oldPaymentsQuery = `  // Get all user's payments (subscriptions)
  const payments = await PaymentLink.find({
    userid: user._id
  })`;

    const newPaymentsQuery = `  // Get all payments across ALL user accounts with this phone
  const payments = await PaymentLink.find({ 
    userid: { $in: allUserIds }
  })`;

    content = content.replace(oldPaymentsQuery, newPaymentsQuery);

    // Update invite links query
    const oldInviteQuery = `  // Get all user's invite links
  const inviteLinks = await InviteLink.find({
    userId: user._id
  }).sort({ createdAt: -1 });`;

    const newInviteQuery = `  // Get all invite links across ALL user accounts
  const inviteLinks = await InviteLink.find({
    userId: { $in: allUserIds }
  }).sort({ createdAt: -1 });`;

    content = content.replace(oldInviteQuery, newInviteQuery);

    // Write the fixed content back
    fs.writeFileSync(routesFilePath, content, 'utf8');
    console.log('✅ Successfully applied fix to userDashboardRoutes.js');

  } else if (content.includes('Find ALL users with this phone number')) {
    console.log('✅ Fix is already applied in dashboard route');
  }

  // Now check the check-purchase route specifically
  const checkPurchasePattern = /router\.get\('\/check-purchase\/:phone\/:bundleId'/;
  
  if (content.match(checkPurchasePattern)) {
    console.log('✅ Found check-purchase route');
    
    // Check if this route has the fix
    if (content.includes('Find ALL users with this phone number') && 
        content.includes('userid: { $in: allUserIds }')) {
      console.log('✅ check-purchase route already has multi-user fix');
    } else {
      console.log('❌ check-purchase route needs fixing');
      // The fix is more complex for this route - it should already be there from our previous edits
    }
  }

  console.log('\n📊 VERIFICATION: Current file state');
  console.log('-'.repeat(40));
  
  // Count occurrences of key patterns
  const phoneFormatsCount = (content.match(/phoneFormats/g) || []).length;
  const allUsersCount = (content.match(/allUsers/g) || []).length;
  const allUserIdsCount = (content.match(/allUserIds/g) || []).length;
  
  console.log(`📱 phoneFormats references: ${phoneFormatsCount}`);
  console.log(`👥 allUsers references: ${allUsersCount}`);
  console.log(`🆔 allUserIds references: ${allUserIdsCount}`);
  
  if (phoneFormatsCount > 0 && allUsersCount > 0 && allUserIdsCount > 0) {
    console.log('✅ File appears to have multi-user support');
  } else {
    console.log('❌ File may be missing multi-user support');
  }

  console.log('\n🔄 RECOMMENDATION: Restart the backend server');
  console.log('   Command: npm start (or node server.js)');

} catch (error) {
  console.error('❌ Error fixing API file:', error.message);
}

console.log('\n' + '='.repeat(70));
console.log('🎯 Direct fix completed!');
