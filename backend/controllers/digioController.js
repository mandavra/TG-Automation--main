const DigioError = require('../models/digioError.model');

// Get all Digio errors
exports.getErrors = async (req, res) => {
  try {
    const errors = await DigioError.find({ status: 'unresolved', type: 'credit' }).sort({ timestamp: -1 });
    res.json(errors);
  } catch (error) {
    console.error('Error fetching Digio errors:', error);
    res.status(500).json({ message: 'Error fetching Digio errors', error: error.message });
  }
};

// Create a new Digio error
exports.createError = async (req, res) => {
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
};

// Update error status
exports.updateErrorStatus = async (req, res) => {
  try {
    const { errorId } = req.params;
    const { status } = req.body;

    const updatedError = await DigioError.findByIdAndUpdate(
      errorId,
      { status },
      { new: true }
    );

    if (!updatedError) {
      return res.status(404).json({ message: 'Error not found' });
    }

    res.json(updatedError);
  } catch (error) {
    console.error('Error updating Digio error:', error);
    res.status(500).json({ message: 'Error updating Digio error', error: error.message });
  }
};

// Delete a Digio error
exports.deleteError = async (req, res) => {
  try {
    const { errorId } = req.params;
    const deletedError = await DigioError.findByIdAndDelete(errorId);

    if (!deletedError) {
      return res.status(404).json({ message: 'Error not found' });
    }

    res.json({ message: 'Error deleted successfully' });
  } catch (error) {
    console.error('Error deleting Digio error:', error);
    res.status(500).json({ message: 'Error deleting Digio error', error: error.message });
  }
}; 