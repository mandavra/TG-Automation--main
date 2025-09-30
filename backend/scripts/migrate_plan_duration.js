const mongoose = require('mongoose');
const Plan = require('../models/plan');

// Set your actual database name here
const MONGODB_URI = "mongodb://127.0.0.1:27017/tg_automation";

const durationMap = {
  'month': '1 month',
  'year': '1 year',
  'week': '1 week',
  'day': '1 day',
  'quarter': '3 months',
  '2min': '2 minutes',
  '5min': '5 minutes',
  '10min': '10 minutes',
  '15min': '15 minutes',
  '30min': '30 minutes',
  '1hour': '1 hour',
};

function isAlreadyFormatted(val) {
  // Matches: number + space + word (e.g. '20 days', '2 months', '1 year')
  return /^\d+\s+\w+/.test(val);
}

async function migrateDurations() {
  try {
    await mongoose.connect(MONGODB_URI);
  } catch (err) {
    console.error('MongoDB connection failed. Check if MongoDB is running and the URI is correct:', MONGODB_URI);
    throw err;
  }
  const plans = await Plan.find({});
  let updated = 0;
  for (const plan of plans) {
    let newDuration = plan.duration;
    if (durationMap[plan.duration]) {
      newDuration = durationMap[plan.duration];
    } else if (!isAlreadyFormatted(plan.duration)) {
      // If not already formatted and not in map, default to '1 ' + value
      newDuration = `1 ${plan.duration}`;
    }
    if (plan.duration !== newDuration) {
      plan.duration = newDuration;
      await plan.save();
      updated++;
    }
  }
  console.log(`Updated ${updated} plans.`);
  await mongoose.disconnect();
}

migrateDurations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
