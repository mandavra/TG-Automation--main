const mongoose = require('mongoose');
const DigioError = require('../models/DigioError');
require('dotenv').config();

async function createTestError() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MONGODB');

    const testError = new DigioError({
      errorId: 'TEST-001',
      message: 'Test Digio Error',
      status: 'unresolved',
      details: {
        type: 'test',
        description: 'This is a test error'
      }
    });

    await testError.save();
    console.log('Test error created successfully:', testError);
  } catch (error) {
    console.error('Error creating test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MONGODB');
  }
}

createTestError(); 