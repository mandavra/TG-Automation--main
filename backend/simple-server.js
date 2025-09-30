const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sendOtp, verifyOtp, sendSMS } = require('./services/amazeSmsService');

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://localhost:5173",
    "http://localhost:4000",
    "https://localhost:4000",
    "https://telegram-bot-puce-phi.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Handle preflight requests
app.options('*', cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// OTP routes
app.post('/api/otp/send-otp', async (req, res) => {
  console.log('OTP Controller - Request received:', { body: req.body, headers: req.headers });
  
  const { phone } = req.body;
  if (!phone) {
    console.log('OTP Controller - Phone number missing');
    return res.status(400).json({ message: 'Phone number is required' });
  }

  try {
    console.log('OTP Controller - Sending OTP to:', phone);
    const result = await sendOtp(phone);
    
    console.log('OTP Controller - OTP result:', result);
    
    if (result.success && result.otp) {
      console.log('OTP Controller - OTP sent successfully');
      res.json({ message: 'OTP sent and saved successfully', smsData: result, phone });
    } else {
      throw new Error('Failed to send OTP');
    }
  } catch (error) {
    console.error('OTP Controller - Error:', error);
    res.status(500).json({ message: 'OTP sent error', error: error.message });
  }
});

app.post('/api/otp/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ message: 'Phone and OTP are required' });
  }

  try {
    // For now, just verify the OTP format
    if (otp.length !== 4) {
      return res.status(400).json({ message: 'Invalid OTP format' });
    }

    // In a real app, you would verify against the database
    res.status(200).json({ 
      message: 'OTP verified successfully', 
      user: { phone: phone }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/otp/reset-otp', async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  try {
    const result = await sendOtp(phone);
    
    if (result.success && result.otp) {
      res.status(200).json({
        message: 'OTP reset successfully and sent to user',
        smsResult: result,
        phone
      });
    } else {
      throw new Error('Failed to send new OTP');
    }
  } catch (error) {
    res.status(500).json({
      message: 'Error resetting OTP',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Simple server running on port ${PORT}`);
  console.log('Environment variables:');
  console.log('AMAZESMS_USER:', process.env.AMAZESMS_USER);
  console.log('AMAZESMS_AUTHKEY:', process.env.AMAZESMS_AUTHKEY ? '***' : 'NOT SET');
  console.log('AMAZESMS_SENDER:', process.env.AMAZESMS_SENDER);
}); 