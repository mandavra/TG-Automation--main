const express = require('express');
const router = express.Router();
const digioController = require('../controllers/digioController');

// Get all Digio errors
router.get('/errors', digioController.getErrors);

// Create a new Digio error
router.post('/errors', digioController.createError);

// Update error status
router.patch('/errors/:errorId', digioController.updateErrorStatus);

// Delete a Digio error
router.delete('/errors/:errorId', digioController.deleteError);

module.exports = router; 