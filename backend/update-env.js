const fs = require('fs');
const path = require('path');

// Read the current .env file
const envPath = path.join(__dirname, '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Replace the incorrect CASHFREE_BASE_URL
envContent = envContent.replace(
  'CASHFREE_BASE_URL=https://sandbox.cashfree.com/pg',
  'CASHFREE_BASE_URL=https://sandbox.cashfree.com'
);

// Write the updated content back to the file
fs.writeFileSync(envPath, envContent);

console.log('✅ Updated CASHFREE_BASE_URL in .env file');
console.log('New URL: https://sandbox.cashfree.com'); 