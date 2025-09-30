// controllers/inviteController.js
const InviteLink = require("../models/InviteLink");

exports.markInviteLinkUsed = async (req, res) => {
  const { link_id } = req.body;

  if (!link_id) {
    return res.status(400).json({ error: "link_id is required" });
  }

  const updated = await InviteLink.findOneAndUpdate(
    { link_id },
    { is_used: true },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ error: "Invite link not found" });
  }

  res.json({ message: "Invite link marked as used", data: updated });
};
