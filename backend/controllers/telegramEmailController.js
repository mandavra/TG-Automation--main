const generateOneTimeInviteLink = require('../services/generateOneTimeInviteLink');
const emailService = require('../services/emailService');

/**
 * Controller for handling Telegram invite link email functionality
 */
class TelegramEmailController {

  /**
   * Generate and send single channel invite link via email
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendSingleChannelInvite(req, res) {
    try {
      const { userId, channelId, channelTitle, duration, sendEmail = true } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      // Generate invite link
      const inviteLink = await generateOneTimeInviteLink.generateInviteLinkForChannel(
        userId,
        channelId,
        channelTitle,
        duration
      );

      if (!inviteLink) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate invite link'
        });
      }

      // Send email if requested
      let emailResult = null;
      if (sendEmail) {
        emailResult = await generateOneTimeInviteLink.sendInviteLinkEmail(
          userId,
          inviteLink.link,
          channelTitle,
          'single'
        );
      }

      res.json({
        success: true,
        data: {
          inviteLink: inviteLink.link,
          linkId: inviteLink._id,
          channelId: inviteLink.channelId,
          channelTitle: inviteLink.channelTitle,
          emailSent: emailResult?.success || false,
          emailAddress: emailResult?.email || null
        }
      });

    } catch (error) {
      console.error('Error in sendSingleChannelInvite:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate and send channel bundle invite links via email
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendChannelBundleInvite(req, res) {
    try {
      const { userId, groupId, duration, paymentLinkId, planId, sendEmail = true } = req.body;

      if (!userId || !groupId) {
        return res.status(400).json({
          success: false,
          error: 'User ID and Group ID are required'
        });
      }

      // Generate invite links for channel bundle
      const result = await generateOneTimeInviteLink.generateInviteLinksForChannelBundle(
        userId,
        groupId,
        duration,
        paymentLinkId,
        planId,
        sendEmail
      );

      res.json({
        success: result.success,
        data: {
          channelBundle: result.channelBundle,
          generatedLinks: result.generatedLinks,
          totalChannels: result.totalChannels,
          successCount: result.successCount,
          errorCount: result.errorCount,
          errors: result.errors,
          emailSent: sendEmail && result.successCount > 0
        }
      });

    } catch (error) {
      console.error('Error in sendChannelBundleInvite:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Send Telegram invite with payment confirmation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendInviteWithPaymentConfirmation(req, res) {
    try {
      const { userId, paymentDetails, channelId, channelTitle, duration } = req.body;

      if (!userId || !paymentDetails || !channelId) {
        return res.status(400).json({
          success: false,
          error: 'User ID, payment details, and channel ID are required'
        });
      }

      // Generate invite link
      const inviteLink = await generateOneTimeInviteLink.generateInviteLinkForChannel(
        userId,
        channelId,
        channelTitle,
        duration
      );

      if (!inviteLink) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate invite link'
        });
      }

      // Get user details
      const User = require('../models/user.model');
      const user = await User.findById(userId);
      
      if (!user || !user.email) {
        return res.status(400).json({
          success: false,
          error: 'User not found or no email address'
        });
      }

      const userDetails = {
        firstName: user.firstName || 'User',
        email: user.email
      };

      // Send payment confirmation email with invite link
      await emailService.sendTelegramInviteWithPaymentEmail(
        user.email,
        userDetails,
        paymentDetails,
        inviteLink.link
      );

      res.json({
        success: true,
        data: {
          inviteLink: inviteLink.link,
          linkId: inviteLink._id,
          emailSent: true,
          emailAddress: user.email,
          paymentConfirmed: true
        }
      });

    } catch (error) {
      console.error('Error in sendInviteWithPaymentConfirmation:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Resend invite link email to user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resendInviteEmail(req, res) {
    try {
      const { userId, linkId, emailType = 'single' } = req.body;

      if (!userId || !linkId) {
        return res.status(400).json({
          success: false,
          error: 'User ID and Link ID are required'
        });
      }

      // Get the invite link from database
      const InviteLink = require('../models/InviteLink');
      const inviteLink = await InviteLink.findById(linkId);

      if (!inviteLink) {
        return res.status(404).json({
          success: false,
          error: 'Invite link not found'
        });
      }

      // Send email
      const emailResult = await generateOneTimeInviteLink.sendInviteLinkEmail(
        userId,
        inviteLink.link,
        inviteLink.channelTitle,
        emailType
      );

      res.json({
        success: emailResult.success,
        data: {
          emailSent: emailResult.success,
          emailAddress: emailResult.email,
          inviteLink: inviteLink.link,
          error: emailResult.error
        }
      });

    } catch (error) {
      console.error('Error in resendInviteEmail:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user's active invite links and send reminder email
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendInviteReminderEmail(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      // Get user's channel bundles with invite links
      const channelBundles = await generateOneTimeInviteLink.getUserChannelBundles(userId);

      if (channelBundles.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No active channel bundles found for user'
        });
      }

      // Get user details
      const User = require('../models/user.model');
      const user = await User.findById(userId);
      
      if (!user || !user.email) {
        return res.status(400).json({
          success: false,
          error: 'User not found or no email address'
        });
      }

      const userDetails = {
        firstName: user.firstName || 'User',
        email: user.email
      };

      // Send reminder email for each channel bundle
      const emailResults = [];
      for (const bundle of channelBundles) {
        try {
          const emailData = {
            channelBundle: bundle.channelBundle,
            generatedLinks: bundle.inviteLinks.map(link => ({
              channelId: link.channelId,
              channelTitle: link.channelTitle,
              inviteLink: link.link,
              linkId: link._id
            })),
            expiryDate: bundle.expiryDate
          };

          await emailService.sendTelegramChannelBundleEmail(
            user.email,
            userDetails,
            emailData
          );

          emailResults.push({
            bundleId: bundle.channelBundle._id,
            bundleName: bundle.channelBundle.name,
            emailSent: true
          });
        } catch (emailError) {
          console.error(`Error sending reminder for bundle ${bundle.channelBundle.name}:`, emailError);
          emailResults.push({
            bundleId: bundle.channelBundle._id,
            bundleName: bundle.channelBundle.name,
            emailSent: false,
            error: emailError.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          emailAddress: user.email,
          channelBundles: emailResults,
          totalBundles: channelBundles.length,
          successfulEmails: emailResults.filter(r => r.emailSent).length
        }
      });

    } catch (error) {
      console.error('Error in sendInviteReminderEmail:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new TelegramEmailController();
