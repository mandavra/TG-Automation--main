# Multi-Channel Telegram Automation System

## Overview

The system has been updated to support **channel bundles** - collections of Telegram channels that users can subscribe to. Instead of generating invite links for just one hardcoded channel, the system now generates invite links for all active channels in a user's purchased channel bundle.

## Key Changes Made

### 1. Enhanced InviteLink Model (`models/InviteLink.js`)
- Added `groupId` field to link invite links to channel bundles
- Added `channelId` and `channelTitle` fields to identify which specific channel the link belongs to
- Added `paymentLinkId` and `planId` fields to track the payment and plan association
- Maintains backward compatibility with existing single-channel records

### 2. Multi-Channel Invite Link Generation (`services/generateOneTimeInviteLink.js`)
- **New Function: `generateInviteLinkForChannel()`** - Generates invite link for a specific channel
- **New Function: `generateInviteLinksForChannelBundle()`** - Generates invite links for all active channels in a channel bundle
- **Enhanced Function: `revokeInviteLink()`** - Now detects the correct channel ID from database
- **New Functions: `getUserChannelBundles()`, `getInviteLinksByChannelBundle()`** - Management functions

### 3. Updated Payment Success Handler (`services/cashfreeService.js`)
The `handlePaymentSuccess()` function now:
- Checks if the payment has an associated channel bundle (`groupId`)
- If channel bundle exists: Generates invite links for all active channels in the bundle
- If no channel bundle: Falls back to generating a single invite link for the default channel
- Includes error handling and fallback mechanisms

### 4. Enhanced Telegram Validation (`controllers/telegramController.js`)
The `validateJoinRequest()` function now:
- Retrieves invite link details to identify which channel it belongs to
- Validates channel ID matches (if provided by bot)
- Logs detailed information about channel bundle and channel details
- Maintains backward compatibility with existing validation logic

### 5. New Channel Bundle Management (`controllers/channelBundleController.js`)
New API endpoints for managing channel bundles:
- `getUserActiveChannelBundles()` - Get user's active channel bundles with invite links
- `getChannelBundleInviteLinks()` - Get invite links for a specific channel bundle
- `regenerateChannelBundleLinks()` - Regenerate invite links for a channel bundle
- `getUserSubscriptionStatus()` - Get subscription status with channel bundle info
- `getUserInviteLinkSummary()` - Get invite link summary for dashboard

### 6. API Routes (`routes/channelBundleRoutes.js`)
New endpoints:
- `GET /api/channel-bundles/user/:userId/channel-bundles`
- `GET /api/channel-bundles/user/:userId/channel-bundle/:groupId/invite-links`
- `POST /api/channel-bundles/user/:userId/channel-bundle/:groupId/regenerate-links`
- `GET /api/channel-bundles/user/:userId/subscription-status`
- `GET /api/channel-bundles/user/:userId/invite-links/summary`

## How It Works

### Payment Flow
1. User purchases a plan associated with a channel bundle
2. Payment is processed and marked as SUCCESS
3. System checks if payment has `groupId` (channel bundle)
4. If yes: Generates invite links for all active channels in the bundle
5. If no: Generates single invite link for default channel (backward compatibility)

### Join Request Flow
1. User clicks invite link for a specific channel
2. Telegram bot sends join request validation to backend
3. Backend validates invite link and checks channel association
4. If valid: User is approved to join that specific channel
5. Invite link is marked as used and revoked

### Channel Bundle Structure
```javascript
// Channel Bundle (Group model)
{
  name: "Premium Trading Signals",
  description: "Access to all our trading channels",
  channels: [
    {
      chatId: "-1001234567890",
      chatTitle: "Crypto Signals",
      isActive: true
    },
    {
      chatId: "-1009876543210", 
      chatTitle: "Stock Alerts",
      isActive: true
    }
  ]
}
```

### Invite Link Structure
```javascript
// Invite Link
{
  link: "https://t.me/+AbC123...",
  userId: "user_object_id",
  channelId: "-1001234567890",
  channelTitle: "Crypto Signals",
  groupId: "channel_bundle_object_id",
  paymentLinkId: "payment_object_id",
  planId: "plan_object_id",
  expires_at: "2024-01-01T00:00:00Z",
  is_used: false
}
```

## Benefits

1. **Multi-Channel Support**: Users can access multiple channels with one subscription
2. **Scalable**: Easy to add/remove channels from bundles
3. **Organized**: Each channel has its own invite link
4. **Trackable**: Can track which channels users join
5. **Backward Compatible**: Existing single-channel setups continue to work
6. **Secure**: Each invite link is channel-specific and single-use

## Environment Variables

The system still uses the existing environment variables:
- `BOT_TOKEN` - Telegram bot token
- `CHANNEL_ID` - Default channel ID (for backward compatibility)

## Database Collections Used

- `invitelinks` - Stores all invite links with channel associations
- `paymentlinks` - Payment records with channel bundle references
- `groups` - Channel bundle definitions
- `plans` - Subscription plans linked to channel bundles
- `users` - User records

## API Usage Examples

### Get User's Channel Bundles
```http
GET /api/channel-bundles/user/USER_ID/channel-bundles
```

### Get Invite Links for Specific Bundle
```http
GET /api/channel-bundles/user/USER_ID/channel-bundle/GROUP_ID/invite-links
```

### Regenerate Links
```http
POST /api/channel-bundles/user/USER_ID/channel-bundle/GROUP_ID/regenerate-links
Content-Type: application/json

{
  "duration": 86400
}
```

## Migration from Single Channel

Existing installations will continue to work without any changes. The system automatically detects:
- If payment has `groupId`: Uses multi-channel flow
- If payment has no `groupId`: Uses single-channel flow (backward compatible)

New installations can immediately use channel bundles by:
1. Creating channel bundles in the Groups/Channel Bundles section
2. Associating plans with channel bundles
3. Adding channels to the bundles

## Error Handling

The system includes comprehensive error handling:
- If some channels fail to generate links, others still succeed
- Fallback to default channel if channel bundle generation fails completely
- Detailed logging for debugging
- Graceful degradation for missing data

## Security Considerations

- Each invite link is tied to a specific channel
- Invite links are single-use and expire
- Channel ID validation prevents cross-channel access
- Webhook signature verification for payment security
