/**
 * Utility to check if all required steps are completed for a user's payment
 * This ensures telegram links are only generated after the complete workflow
 */

const User = require('../models/user.model');
const PaymentLink = require('../models/paymentLinkModel');
const Group = require('../models/group.model');

/**
 * Check if all required steps are completed for a user's payment
 * @param {string} userId - User ID
 * @param {string} paymentId - Payment ID (optional, uses latest successful payment if not provided)
 * @returns {Promise<{allStepsComplete: boolean, bundleConfig: object, missingSteps: string[]}>}
 */
async function checkAllRequiredStepsComplete(userId, paymentId = null) {
  try {
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find payment
    let payment;
    if (paymentId) {
      payment = await PaymentLink.findById(paymentId).populate('groupId');
    } else {
      // First try to find a successful payment, then fall back to pending
      payment = await PaymentLink.findOne({
        userid: userId,
        status: 'SUCCESS'
      }).sort({ purchase_datetime: -1 }).populate('groupId');

      // If no successful payment found, check pending payments
      if (!payment) {
        payment = await PaymentLink.findOne({
          userid: userId,
          status: 'PENDING'
        }).sort({ purchase_datetime: -1 }).populate('groupId');
      }
    }

    if (!payment) {
      throw new Error('No payment found for user');
    }

    // Get bundle configuration
    const bundleConfig = payment.groupId || null;
    const kycRequired = bundleConfig?.featureToggles?.enableKYC !== false;
    const esignRequired = bundleConfig?.featureToggles?.enableESign !== false;

    console.log(`🔍 Step completion check for user ${userId}:`);
    console.log(`   - Bundle: ${bundleConfig?.name || 'Default'}`);
    console.log(`   - KYC required: ${kycRequired}`);
    console.log(`   - E-Sign required: ${esignRequired}`);

    // Check each step completion based on actual user data
    const stepStatus = {
      payment: true, // Payment is complete (we have successful payment)
      kyc: user.kycCompleted || false,      // Check actual KYC completion status
      esign: user.esignCompleted || false   // Check actual E-Sign completion status
    };

    // Determine which steps are actually required
    const missingSteps = [];
    
    // Payment is always required and already complete
    
    // Check KYC if required
    if (kycRequired && !stepStatus.kyc) {
      missingSteps.push('kyc');
    }
    
    // Check E-Sign if required  
    if (esignRequired && !stepStatus.esign) {
      missingSteps.push('esign');
    }

    console.log(`   - User KYC completed: ${stepStatus.kyc}`);
    console.log(`   - User E-Sign completed: ${stepStatus.esign}`);

    const allStepsComplete = missingSteps.length === 0;

    console.log(`   - Missing steps: [${missingSteps.join(', ')}]`);
    console.log(`   - All steps complete: ${allStepsComplete}`);

    return {
      allStepsComplete,
      bundleConfig: {
        id: bundleConfig?._id,
        name: bundleConfig?.name,
        kycRequired,
        esignRequired,
        enableKYC: bundleConfig?.featureToggles?.enableKYC,
        enableESign: bundleConfig?.featureToggles?.enableESign
      },
      missingSteps,
      user,
      payment
    };

  } catch (error) {
    console.error('❌ Error checking step completion:', error);
    throw error;
  }
}

/**
 * Trigger telegram link generation if all required steps are complete
 * @param {string} userId - User ID  
 * @param {string} paymentId - Payment ID (optional)
 * @returns {Promise<{linksGenerated: boolean, reason: string}>}
 */
async function triggerTelegramLinksIfReady(userId, paymentId = null) {
  try {
    const stepCheck = await checkAllRequiredStepsComplete(userId, paymentId);
    
    if (!stepCheck.allStepsComplete) {
      console.log(`⏳ Not generating telegram links - missing steps: [${stepCheck.missingSteps.join(', ')}]`);
      return {
        linksGenerated: false,
        reason: `Missing required steps: ${stepCheck.missingSteps.join(', ')}`
      };
    }

    // All steps complete - generate telegram links
    console.log('✅ All required steps complete - generating telegram links...');

    const { generateInviteLinksForChannelBundle } = require('../services/generateOneTimeInviteLink');
    const { convertDurationToSeconds, convertSecondsToHumanReadable } = require('./durationConverter');

    const durationInSeconds = convertDurationToSeconds(stepCheck.payment.duration);

    console.log(`📊 Payment duration: ${stepCheck.payment.duration} -> ${durationInSeconds} seconds (${convertSecondsToHumanReadable(durationInSeconds)})`);

    const result = await generateInviteLinksForChannelBundle(
      stepCheck.user._id,
      stepCheck.payment.groupId._id,
      durationInSeconds,
      stepCheck.payment._id,
      stepCheck.payment.plan_id
    );

    console.log(`🎫 Generated ${result.successCount} telegram links for user ${userId}`);

    return {
      linksGenerated: true,
      reason: 'All required steps completed',
      result
    };

  } catch (error) {
    console.error('❌ Error triggering telegram links:', error);
    return {
      linksGenerated: false,
      reason: `Error: ${error.message}`
    };
  }
}

module.exports = {
  checkAllRequiredStepsComplete,
  triggerTelegramLinksIfReady
};