const express = require("express");
const router = express.Router();
const InviteLink = require("../models/InviteLink");
const { 
  generateAndStoreInviteLink,
  markInviteLinkAsUsed,
  getUnusedInviteLinks,
  cleanupExpiredInviteLinks,
  getUserInviteLink,
  generateInviteLinksForChannelBundle,
  convertDurationToSeconds
} = require("../services/generateOneTimeInviteLink");

// Route to generate a one-time invite link
router.get("/invite-link", async (req, res) => {
  try {
    const { telegramUserId, duration = 86400 } = req.query;
    
    console.log(`Generating invite link for user: ${telegramUserId || 'anonymous'}, duration: ${duration}s`);
    
    // Generate and store the invite link
    const link = await generateAndStoreInviteLink(telegramUserId, parseInt(duration));

    // Return the generated invite link as JSON
    res.json({ 
      success: true,
      link: link.link,
      linkId: link._id,
      expiresAt: link.expires_at,
      duration: link.duration
    });
  } catch (error) {
    console.error("❌ Error generating invite link:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Error generating invite link", 
      error: error.message 
    });
  }
});

// Route to mark the invite link as used
router.patch("/invite-link/use/:linkId", async (req, res) => {
  try {
    const { linkId } = req.params;
    const { telegramUserId } = req.body;

    console.log(`Marking invite link as used: ${linkId} by user: ${telegramUserId}`);

    const updatedLink = await markInviteLinkAsUsed(linkId, telegramUserId);

    res.json({
      success: true,
      message: "Invite link marked as used",
      link: updatedLink
    });
  } catch (error) {
    console.error("❌ Error marking invite link as used:", error.message);
    res.status(500).json({
      success: false,
      message: "Error marking invite link as used",
      error: error.message
    });
  }
});

// Route to get unused invite links for a user
router.get("/invite-links/:telegramUserId", async (req, res) => {
  try {
    const { telegramUserId } = req.params;

    console.log(`Fetching unused invite links for user: ${telegramUserId}`);

    const links = await getUnusedInviteLinks(telegramUserId);

    res.json({
      success: true,
      links: links,
      count: links.length
    });
  } catch (error) {
    console.error("❌ Error fetching invite links:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching invite links",
      error: error.message
    });
  }
});

// Route to get all invite links (admin only)
router.get("/invite-links", async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = {};
    if (status === 'used') query.is_used = true;
    if (status === 'unused') query.is_used = false;
    if (status === 'expired') query.expires_at = { $lt: new Date() };

    const skip = (page - 1) * limit;
    
    const links = await InviteLink.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await InviteLink.countDocuments(query);

    res.json({
      success: true,
      links: links,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("❌ Error fetching all invite links:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching invite links",
      error: error.message
    });
  }
});

// Route to cleanup expired invite links
router.delete("/invite-links/cleanup", async (req, res) => {
  try {
    console.log("Cleaning up expired invite links...");
    
    const deletedCount = await cleanupExpiredInviteLinks();

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired invite links`,
      deletedCount
    });
  } catch (error) {
    console.error("❌ Error cleaning up invite links:", error.message);
    res.status(500).json({
      success: false,
      message: "Error cleaning up invite links",
      error: error.message
    });
  }
});

// Route to delete a specific invite link
router.delete("/invite-link/:linkId", async (req, res) => {
  try {
    const { linkId } = req.params;

    console.log(`Deleting invite link: ${linkId}`);

    const deletedLink = await InviteLink.findByIdAndDelete(linkId);

    if (!deletedLink) {
      return res.status(404).json({
        success: false,
        message: "Invite link not found"
      });
    }

    res.json({
      success: true,
      message: "Invite link deleted successfully",
      link: deletedLink
    });
  } catch (error) {
    console.error("❌ Error deleting invite link:", error.message);
    res.status(500).json({
      success: false,
      message: "Error deleting invite link",
      error: error.message
    });
  }
});

// Route to get user's Telegram invite link (for frontend display)
router.get("/user-invite/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`Fetching Telegram invite link for user: ${userId}`);

    const inviteLink = await getUserInviteLink(userId);

    if (!inviteLink) {
      return res.status(404).json({
        success: false,
        message: "No active invite link found for this user"
      });
    }

    res.json({
      success: true,
      invite_link: inviteLink.link,
      expires_at: inviteLink.expires_at,
      is_used: inviteLink.is_used
    });
  } catch (error) {
    console.error("❌ Error fetching user invite link:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching user invite link",
      error: error.message
    });
  }
});

// Route to generate bundle-specific invite links with plan context
router.post("/channel-bundle-links", async (req, res) => {
  try {
    const { userId, groupId, duration = '30', paymentLinkId, planId } = req.body;
    
    console.log(`🎯 Generating bundle-specific invite links:`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Group ID: ${groupId}`);
    console.log(`   Duration: ${duration}`);
    console.log(`   Payment Link ID: ${paymentLinkId}`);
    console.log(`   Plan ID: ${planId}`);
    
    if (!userId || !groupId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Group ID are required"
      });
    }
    
    // Convert duration to seconds
    const durationInSeconds = convertDurationToSeconds(duration);
    console.log(`   Duration in seconds: ${durationInSeconds}`);
    
    // Generate invite links for all channels in the bundle
    const result = await generateInviteLinksForChannelBundle(
      userId,
      groupId,
      durationInSeconds,
      paymentLinkId,
      planId
    );
    
    console.log(`✅ Generated ${result.successCount} invite links for bundle`);
    
    // Return the first invite link for display (or all links if needed)
    const primaryLink = result.generatedLinks?.[0]?.inviteLink;
    
    res.json({
      success: true,
      link: primaryLink, // Primary link for UI display
      links: result.generatedLinks, // All generated links
      bundleInfo: result.channelBundle,
      summary: {
        totalChannels: result.totalChannels,
        successCount: result.successCount,
        errorCount: result.errorCount
      },
      errors: result.errors
    });
    
  } catch (error) {
    console.error("❌ Error generating bundle invite links:", error.message);
    res.status(500).json({
      success: false,
      message: "Error generating bundle invite links",
      error: error.message
    });
  }
});

module.exports = router;
