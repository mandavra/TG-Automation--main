console.log('Testing route imports...');

try {
  const paymentCompletionRoutes = require('./routes/paymentCompletionRoutes');
  console.log('✅ paymentCompletionRoutes imported successfully');
} catch (error) {
  console.error('❌ Error importing paymentCompletionRoutes:', error.message);
}

try {
  const adminLinkManagementRoutes = require('./routes/adminLinkManagementRoutes');
  console.log('✅ adminLinkManagementRoutes imported successfully');
} catch (error) {
  console.error('❌ Error importing adminLinkManagementRoutes:', error.message);
}

console.log('✅ Route import test completed');
