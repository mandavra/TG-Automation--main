const mongoose = require('mongoose');
const Group = require('./models/group.model');
const PaymentLink = require('./models/paymentLinkModel');
require('dotenv').config();

async function getBundles() {
  try {
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation');
    console.log('Getting all bundles:');
    const groups = await Group.find({}).select('_id name route');
    groups.forEach(g => console.log(`ID: ${g._id}, Name: ${g.name}, Route: ${g.route}`));
    
    console.log('\nGetting payment bundle IDs:');
    const payments = await PaymentLink.find({ phone: '+917020025010' });
    payments.forEach(p => console.log(`Payment ID: ${p._id}, Bundle ID: ${p.groupId}, Amount: ${p.amount}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getBundles();