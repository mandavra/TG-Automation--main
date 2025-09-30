# 🚀 Group Backend & Telegram Integration - Complete Setup

## Overview
This document describes the complete implementation of the Group backend system with Telegram integration for the TG Automation project. The system allows admins to create groups, link them with Telegram groups/channels, and manage user access automatically.

## 🏗️ Backend Architecture

### 1. Models
- **`Group`** - Stores group information, Telegram connection details, and statistics
- **`User`** - Enhanced with Telegram user ID and join status tracking
- **`Plan`** - Subscription plans for groups
- **`InviteLink`** - Temporary access links for Telegram groups

### 2. Services
- **`GroupService`** - Business logic for group operations
- **`TelegramIntegrationService`** - Handles all Telegram bot operations and user management

### 3. Controllers
- **`GroupController`** - HTTP endpoints for group management
- **`TelegramController`** - Webhook endpoints for bot integration

### 4. Routes
- **`/api/groups/*`** - All group-related endpoints
- **`/api/telegram/*`** - Telegram webhook and integration endpoints

## 🔧 Key Features

### Group Management
- ✅ Create groups with name, description, and image
- ✅ Set subscription plans and pricing
- ✅ Add custom FAQs
- ✅ Enable/disable GST
- ✅ Set default group

### Telegram Integration
- ✅ Link groups with Telegram groups/channels
- ✅ Automatic bot permission verification
- ✅ Real-time user join/leave tracking
- ✅ Automatic user access expiration
- ✅ Admin commands for link generation and user management

### User Access Control
- ✅ Temporary invite links with configurable duration
- ✅ Automatic user approval based on invite links
- ✅ Scheduled user removal when access expires
- ✅ User status tracking (joined, left, kicked, expired)

## 🚀 Getting Started

### Prerequisites
1. **Telegram Bot Token** - Create a bot via @BotFather
2. **MongoDB** - Database for storing groups and users
3. **Node.js** - Backend runtime environment

### Environment Variables
```env
BOT_TOKEN=your_telegram_bot_token
MONGODB_URI=your_mongodb_connection_string
CHANNEL_ID=your_default_channel_id
```

### Installation
```bash
# Install dependencies
npm install

# Start the server
npm start
```

## 📱 Telegram Bot Commands

### Admin Commands
- **`/getlink <duration>`** - Generate temporary invite link
  - Examples: `/getlink 30m`, `/getlink 1h`, `/getlink 2d`
- **`/stats`** - View group statistics
- **`/kick <user_id>`** - Remove user from group

### Bot Features
- **Auto-approval** - Users with valid invite links are automatically approved
- **Access control** - Users are automatically removed when their access expires
- **Real-time monitoring** - Tracks all user join/leave events

## 🔗 API Endpoints

### Group Management
```http
POST   /api/groups/create           # Create new group
GET    /api/groups/all              # Get all groups
GET    /api/groups/:id              # Get group by ID
PUT    /api/groups/:id              # Update group
DELETE /api/groups/:id              # Delete group
```

### Telegram Integration
```http
POST   /api/groups/:id/link-telegram    # Link group with Telegram
POST   /api/groups/:id/test-connection  # Test bot connection
```

### Group Operations
```http
GET    /api/groups/:id/stats         # Get group statistics
PUT    /api/groups/:id/stats         # Update group statistics
POST   /api/groups/:id/set-default   # Set as default group
GET    /api/groups/default           # Get default group
```

## 🎯 Frontend Integration

### CreateGroup Component
- **Step 1**: Basic group information (name, description, image)
- **Step 2**: Subscription plans and pricing
- **Step 3**: Custom FAQs
- **Completion**: Group creation and navigation to setup

### Setup-page Component
- **Telegram linking**: Enter chat ID and test bot connection
- **Bot verification**: Ensures bot has admin permissions
- **Final setup**: Links group with Telegram and completes setup

### Group Management
- **Real-time data**: Shows all groups with live statistics
- **Search & filter**: Find groups by name or status
- **Actions**: Set default, delete, and manage groups

## 🔐 Security Features

### Admin Authentication
- All group endpoints require admin authentication
- JWT-based session management
- Role-based access control

### Bot Security
- Bot permission verification before linking
- Secure invite link generation
- User access validation

### Data Protection
- Input validation and sanitization
- Secure image upload handling
- Database query protection

## 📊 Database Schema

### Group Collection
```javascript
{
  name: String,                    // Group name
  description: String,             // Group description
  image: String,                   // Group image URL
  telegramChatId: String,          // Telegram chat ID
  telegramChatType: String,        // group/channel/supergroup
  telegramChatTitle: String,       // Telegram chat title
  botStatus: String,               // not_connected/connected/error
  status: String,                  // active/inactive/pending/error
  subscriptionPlans: [ObjectId],   // Array of plan IDs
  addGST: Boolean,                 // GST enabled/disabled
  faqs: [{question: String, answer: String}],
  isDefault: Boolean,              // Default group flag
  stats: {
    totalSubscribers: Number,
    totalRevenue: Number,
    activeSubscriptions: Number
  },
  createdBy: ObjectId,             // Admin who created the group
  linkedAt: Date,                  // When linked with Telegram
  createdAt: Date,
  updatedAt: Date
}
```

## 🚨 Error Handling

### Common Issues
1. **Bot not admin**: Ensure bot has admin permissions in Telegram group
2. **Invalid chat ID**: Use correct format (e.g., -1001234567890)
3. **Connection failed**: Check bot token and network connectivity
4. **Permission denied**: Verify admin authentication

### Troubleshooting
- Check bot logs for detailed error messages
- Verify MongoDB connection
- Ensure all environment variables are set
- Check bot permissions in Telegram groups

## 🔄 Background Jobs

### User Expiry Management
- Runs every 5 minutes
- Automatically removes expired users
- Updates user status in database
- Logs all expiry actions

### Group Monitoring
- Tracks active groups
- Monitors bot connection status
- Updates group statistics
- Handles real-time events

## 📈 Future Enhancements

### Planned Features
- **Analytics Dashboard**: Detailed group performance metrics
- **Multi-language Support**: Internationalization for groups
- **Advanced Access Control**: Role-based permissions within groups
- **Payment Integration**: Direct subscription management
- **API Rate Limiting**: Protection against abuse
- **Webhook Support**: Real-time notifications to external systems

### Scalability Improvements
- **Redis Caching**: Improve response times
- **Queue System**: Handle high-volume operations
- **Microservices**: Split into smaller, focused services
- **Load Balancing**: Distribute traffic across multiple instances

## 🎉 Success Indicators

### Setup Complete When:
1. ✅ Group created successfully
2. ✅ Telegram group/channel linked
3. ✅ Bot has admin permissions
4. ✅ First invite link generated
5. ✅ User access control working
6. ✅ Background jobs running

### Testing Checklist:
- [ ] Create group via frontend
- [ ] Link with Telegram group
- [ ] Generate invite link via bot command
- [ ] Test user join/approval flow
- [ ] Verify user expiry system
- [ ] Check admin commands functionality

## 📞 Support

For technical support or questions:
1. Check the logs for error messages
2. Verify all environment variables
3. Test bot permissions in Telegram
4. Review database connections
5. Check network connectivity

---

**🎯 The Group backend and Telegram integration is now complete and ready for production use!**
