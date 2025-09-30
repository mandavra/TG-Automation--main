const mongoose = require('mongoose');
const User = require('./models/user.model');
const PaymentLink = require('./models/paymentLinkModel');
require('dotenv').config();

mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/telegram-automation').then(async () => {
  console.log('📱 All users in database:');
  const users = await User.find({}).select('phone firstName lastName');
  users.forEach((u, i) => {
    console.log(`${i+1}. ${u.phone} - ${u.firstName} ${u.lastName}`);
  });
  
  console.log('\n💳 Users with payments:');
  const usersWithPayments = await PaymentLink.aggregate([
    { $match: { status: 'SUCCESS' } },
    { $group: { _id: '$userid', count: { $sum: 1 } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }
  ]);
  
  usersWithPayments.forEach((up, i) => {
    const user = up.user[0];
    console.log(`${i+1}. ${user?.phone} - ${user?.firstName} ${user?.lastName} (${up.count} payments)`);
  });
  
  mongoose.connection.close();
});
