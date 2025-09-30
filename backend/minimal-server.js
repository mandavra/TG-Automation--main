const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();

// Basic CORS
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// OTP send route
app.post('/api/otp/send-otp', async (req, res) => {
  console.log('OTP Request received:', req.body);
  
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  try {
    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const message = `Your OTP is ${otp}. It is valid for 10 minutes. Do not share this with anyone. - Vyom Research`;

    // Send via AmazeSMS
    const url = 'https://amazesms.in/api/pushsms';
    const params = {
      user: process.env.AMAZESMS_USER || 'vyomResearch',
      authkey: process.env.AMAZESMS_AUTHKEY || '928lk7F8tFoQ',
      sender: process.env.AMAZESMS_SENDER || 'VYMRSH',
      mobile: phone.replace(/\D/g, '').slice(-10), // Get last 10 digits
      text: message,
      entityid: process.env.AMAZESMS_ENTITYID || '1001612146484297247',
      templateid: process.env.AMAZESMS_TEMPLATEID || '1007542138834564545'
    };

    console.log('Sending SMS with params:', { ...params, authkey: '***' });

    const response = await axios.get(url, { params });
    console.log('AmazeSMS response:', response.data);

    if (response.data && (response.data.STATUS === 'OK' || response.data.status === 'success')) {
      res.json({ 
        message: 'OTP sent successfully', 
        smsData: {
          success: true,
          message: 'OTP sent successfully',
          phone: phone,
          timestamp: new Date().toISOString(),
          otp: otp
        }, 
        phone 
      });
    } else {
      throw new Error('Failed to send SMS');
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'OTP sent error', error: error.message });
  }
});

// OTP verify route
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

    res.status(200).json({ 
      message: 'OTP verified successfully', 
      user: { phone: phone }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
  console.log('Environment variables:');
  console.log('AMAZESMS_USER:', process.env.AMAZESMS_USER || 'vyomResearch');
  console.log('AMAZESMS_AUTHKEY:', process.env.AMAZESMS_AUTHKEY ? '***' : 'NOT SET');
  console.log('AMAZESMS_SENDER:', process.env.AMAZESMS_SENDER || 'VYMRSH');
}); 