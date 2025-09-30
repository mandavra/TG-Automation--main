const express = require('express');
const router = express.Router();
const {
  validateJoinRequest,
  checkUserExpiry,
  notifyUserKicked,
  storeTestLink,
  linkTelegramAccount,
  verifyTelegramLink,
  unlinkTelegramAccount
} = require('../controllers/telegramController');

// Webhook endpoint for Telegram bot to validate join requests
// POST /api/telegram/validate-join
router.post('/validate-join', validateJoinRequest);

// Endpoint to check if a user should be kicked from Telegram
// GET /api/telegram/check-expiry/:telegram_user_id
router.get('/check-expiry/:telegram_user_id', checkUserExpiry);

// Endpoint for Telegram bot to notify when user is kicked
// POST /api/telegram/notify-kick
router.post('/notify-kick', notifyUserKicked);

// Endpoint for bot to store test invite links
// POST /api/telegram/store-test-link
router.post('/store-test-link', storeTestLink);

// Endpoint to handle user join notifications and start expiry tracking
// POST /api/telegram/user-joined
router.post('/user-joined', require('../controllers/telegramController').handleUserJoined);

// Telegram account linking endpoints
// POST /api/telegram/link-account
router.post('/link-account', linkTelegramAccount);

// POST /api/telegram/verify-link
router.post('/verify-link', verifyTelegramLink);

// POST /api/telegram/unlink-account
router.post('/unlink-account', unlinkTelegramAccount);

module.exports = router;