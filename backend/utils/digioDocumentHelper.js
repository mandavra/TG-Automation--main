const DigioDocument = require('../models/DigioDocument');
const User = require('../models/user.model');

/**
 * Create a new DigioDocument record when a document is uploaded to Digio
 * @param {Object} params - Document creation parameters
 * @param {string} params.documentId - Digio document ID
 * @param {string} params.userId - User ID who owns the document
 * @param {string} params.adminId - Admin ID (tenant isolation)
 * @param {string} params.fileName - Document filename
 * @param {string} params.originalFileName - Original filename if different
 * @param {Object} params.digioResponse - Full Digio API response
 * @param {Object} params.signerData - Signer information
 * @param {Object} params.metadata - Additional metadata
 * @param {string} params.paymentLinkId - Related payment link ID (optional)
 * @param {string} params.groupId - Related group ID (optional)
 * @returns {Promise<DigioDocument>} Created document record
 */
async function createDigioDocument(params) {
  try {
    const {
      documentId,
      userId,
      adminId,
      fileName,
      originalFileName,
      digioResponse,
      signerData,
      metadata = {},
      paymentLinkId,
      groupId,
      documentType = 'agreement',
      originalFilePath,
      downloadUrl
    } = params;

    // Validate required parameters
    if (!documentId || !userId || !adminId || !fileName) {
      throw new Error('Missing required parameters: documentId, userId, adminId, fileName');
    }

    // Check if document already exists
    const existingDoc = await DigioDocument.findOne({ documentId });
    if (existingDoc) {
      console.log(`Document ${documentId} already exists, updating...`);
      return await updateDigioDocument(documentId, {
        digioResponse,
        metadata,
        downloadUrl,
        status: 'uploaded'
      });
    }

    // Create new document record
    const documentData = {
      documentId,
      userId,
      adminId,
      fileName,
      originalFileName: originalFileName || fileName,
      documentType,
      digioResponse,
      signerData: signerData || {},
      metadata: {
        ...metadata,
        createdViaHelper: true
      },
      status: 'uploaded',
      uploadedAt: new Date(),
      originalFilePath,
      downloadUrl
    };

    // Add optional references
    if (paymentLinkId) {
      documentData.paymentLinkId = paymentLinkId;
    }
    if (groupId) {
      documentData.groupId = groupId;
    }

    const document = new DigioDocument(documentData);
    await document.save();

    console.log(`✅ Created DigioDocument record for ${documentId}`);
    return document;
  } catch (error) {
    console.error('❌ Error creating DigioDocument:', error.message);
    throw error;
  }
}

/**
 * Update DigioDocument when document status changes
 * @param {string} documentId - Digio document ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<DigioDocument>} Updated document record
 */
async function updateDigioDocument(documentId, updateData) {
  try {
    const document = await DigioDocument.findOne({ documentId });
    
    if (!document) {
      console.warn(`⚠️ DigioDocument not found for ${documentId}`);
      return null;
    }

    // Update document with new data
    Object.keys(updateData).forEach(key => {
      if (key === 'metadata' && document.metadata) {
        document.metadata = { ...document.metadata, ...updateData.metadata };
      } else {
        document[key] = updateData[key];
      }
    });

    await document.save();
    console.log(`✅ Updated DigioDocument ${documentId} with status: ${document.status}`);
    return document;
  } catch (error) {
    console.error('❌ Error updating DigioDocument:', error.message);
    throw error;
  }
}

/**
 * Handle document signed webhook event
 * @param {string} documentId - Digio document ID
 * @param {Object} signerData - Signer information from webhook
 * @param {Object} additionalData - Additional data like download URLs
 * @returns {Promise<DigioDocument>} Updated document record
 */
async function handleDocumentSigned(documentId, signerData, additionalData = {}) {
  try {
    const document = await DigioDocument.findOne({ documentId });
    
    if (!document) {
      console.warn(`⚠️ DigioDocument not found for signed document ${documentId}`);
      return null;
    }

    // Update document status to signed
    await document.updateStatus('signed', {
      signerData: {
        ...document.signerData,
        ...signerData,
        signedAt: new Date()
      }
    });

    // Add webhook event
    await document.addWebhookEvent('document_signed', {
      signerData,
      ...additionalData
    });

    console.log(`✅ Marked document ${documentId} as signed by ${signerData.email}`);
    return document;
  } catch (error) {
    console.error('❌ Error handling document signed:', error.message);
    throw error;
  }
}

/**
 * Handle document completion (when signed document is downloaded and stored)
 * @param {string} documentId - Digio document ID
 * @param {string} signedFilePath - Local path to signed document
 * @param {string} signedDownloadUrl - Download URL for signed document
 * @returns {Promise<DigioDocument>} Updated document record
 */
async function handleDocumentCompleted(documentId, signedFilePath, signedDownloadUrl) {
  try {
    const document = await DigioDocument.findOne({ documentId });
    
    if (!document) {
      console.warn(`⚠️ DigioDocument not found for completed document ${documentId}`);
      return null;
    }

    // Update document status to completed
    await document.updateStatus('completed', {
      signedFilePath,
      signedDownloadUrl
    });

    console.log(`✅ Marked document ${documentId} as completed`);
    return document;
  } catch (error) {
    console.error('❌ Error handling document completion:', error.message);
    throw error;
  }
}

/**
 * Add error to document record
 * @param {string} documentId - Digio document ID
 * @param {string} errorType - Type of error
 * @param {string} errorMessage - Error message
 * @returns {Promise<DigioDocument>} Updated document record
 */
async function addDocumentError(documentId, errorType, errorMessage) {
  try {
    const document = await DigioDocument.findOne({ documentId });
    
    if (!document) {
      console.warn(`⚠️ DigioDocument not found for error logging ${documentId}`);
      return null;
    }

    await document.addError(errorType, errorMessage);
    console.log(`⚠️ Added error to document ${documentId}: ${errorType} - ${errorMessage}`);
    return document;
  } catch (error) {
    console.error('❌ Error adding document error:', error.message);
    throw error;
  }
}

/**
 * Get admin-filtered documents for a user
 * @param {string} userId - User ID
 * @param {string} adminId - Admin ID for tenant filtering
 * @returns {Promise<Array<DigioDocument>>} User's documents
 */
async function getUserDocuments(userId, adminId) {
  try {
    return await DigioDocument.find({ userId, adminId })
      .sort({ createdAt: -1 })
      .populate('paymentLinkId', 'amount plan_name status')
      .populate('groupId', 'name description');
  } catch (error) {
    console.error('❌ Error getting user documents:', error.message);
    throw error;
  }
}

module.exports = {
  createDigioDocument,
  updateDigioDocument,
  handleDocumentSigned,
  handleDocumentCompleted,
  addDocumentError,
  getUserDocuments
};