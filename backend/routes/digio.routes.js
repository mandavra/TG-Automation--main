const express = require('express');
const router = express.Router();
const digioController = require('../controllers/digio.controller');
const DigioError = require('../models/digioError.model');

router.post('/uploadPDF', digioController.uploadDigioPDF);
router.get('/signed-link/:docId', digioController.getSignedDocumentLink);
router.post('/webhook', digioController.handleDigioWebhook);
router.post('/complete', digioController.completeESign);

// Get all Digio errors
router.get('/errors', async (req, res) => {
  try {
    const errors = await DigioError.find({})
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json(errors);
  } catch (error) {
    console.error('Error fetching Digio errors:', error);
    res.status(500).json({ 
      message: 'Error fetching Digio errors',
      error: error.message 
    });
  }
});

// Create a new Digio error (for POST /api/digio/errors)
router.post('/errors', async (req, res) => {
  try {
    const { type, message, userId } = req.body;
    
    if (!type || !message || !userId) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        required: ['type', 'message', 'userId'] 
      });
    }

    const newError = new DigioError({
      type,
      message,
      userId,
      status: 'unresolved',
      timestamp: new Date()
    });

    await newError.save();
    console.log('New Digio error saved:', newError);
    res.status(201).json(newError);
  } catch (error) {
    console.error('Error creating Digio error:', error);
    res.status(500).json({ message: 'Error creating Digio error', error: error.message });
  }
});

module.exports = router;
