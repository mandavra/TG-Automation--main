// Debug GST Detection Logic
console.log('🔍 GST Detection Debug Tool');
console.log('============================\n');

function debugGstDetection(user, payment = null) {
  const creatorStateCode = "24"; // Gujarat

  // Try multiple sources for buyer state code
  const buyerStateCode = (
    user.stateCode ||
    user.State ||
    payment?.stateCode ||
    payment?.customerState ||
    ""
  ).toString().trim();

  console.log('GST Calculation Debug:');
  console.log('- Creator State (Company):', creatorStateCode);
  console.log('- Buyer State Code:', buyerStateCode);
  console.log('- User State Info:', { stateCode: user.stateCode, State: user.state });
  if (payment) {
    console.log('- Payment State Info:', { stateCode: payment?.stateCode, customerState: payment?.customerState });
  }

  // For Gujarat, also check state name if state code is missing
  const isGujaratByName = (user.State || user.state || "").toLowerCase().includes('gujarat');
  const isInterState = buyerStateCode !== creatorStateCode && !isGujaratByName;

  console.log('- Is Gujarat by name?', isGujaratByName);
  console.log('- Final decision - Is Inter State?', isInterState);

  if (isInterState) {
    console.log('✅ GST Type: IGST @18%');
  } else {
    console.log('✅ GST Type: CGST @9% + SGST @9%');
  }
  console.log('---\n');

  return { isInterState, buyerStateCode, isGujaratByName };
}

// Test cases
console.log('Test Case 1: Gujarat customer with state code');
debugGstDetection({
  stateCode: '24',
  State: 'Gujarat',
  state: 'Gujarat'
});

console.log('Test Case 2: Gujarat customer with only state name');
debugGstDetection({
  stateCode: '',
  State: 'Gujarat',
  state: 'gujarat'
});

console.log('Test Case 3: Gujarat customer with case variations');
debugGstDetection({
  stateCode: null,
  State: 'GUJARAT',
  state: 'Gujarat'
});

console.log('Test Case 4: Maharashtra customer');
debugGstDetection({
  stateCode: '27',
  State: 'Maharashtra',
  state: 'Maharashtra'
});

console.log('Test Case 5: Empty state info (should default to IGST)');
debugGstDetection({
  stateCode: '',
  State: '',
  state: ''
});

console.log('🎯 Expected Results:');
console.log('- Test Case 1-3: Should show CGST + SGST (Intra-state)');
console.log('- Test Case 4-5: Should show IGST (Inter-state)');