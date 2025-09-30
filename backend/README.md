# Telegram Channel Membership Bot (Node.js)

This is a Node.js version of the Telegram bot that manages temporary access to private channels using join requests.

## Features

- Generate temporary invite links with custom durations
- Automatically approve join requests
- Kick users after their subscription expires
- Admin-only commands
- Automatic cleanup every minute

## Installation

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Or use: `winget install OpenJS.NodeJS`

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file with:
   ```
   BOT_TOKEN=your_bot_token_here
   CHANNEL_ID=your_channel_id_here
   ADMIN_USER_IDS=your_admin_user_id_here
   ```

## Setup

### 1. Get Bot Token
1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Copy the token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Get Channel ID
1. Create a private channel in Telegram
2. Add your bot as admin with these permissions:
   - Invite users via link
   - Manage join requests
   - Ban users
3. Get channel ID using @userinfobot

### 3. Get Admin User ID
1. Send a message to @userinfobot on Telegram
2. It will reply with your user ID
3. For multiple admins, separate with commas: `123456789,987654321`

## Usage

### Start the bot
```bash
npm start
```

### Development mode (with auto-restart)
```bash
npm run dev
```

### Bot Commands

- `/start` - Welcome message and instructions
- `/getlink <duration>` - Generate temporary invite link
  - Examples: `/getlink 1h`, `/getlink 30m`, `/getlink 7d`

## How it works

1. Admin uses `/getlink <duration>` to create a temporary invite link
2. Users click the link and request to join the channel
3. Bot automatically approves the request and starts a timer
4. After the duration expires, bot kicks the user from the channel
5. Process repeats for new users

## Files

- `bot.js` - Main bot code
- `package.json` - Dependencies and scripts
- `.env` - Configuration file (create this)
- `README.md` - This file

## Dependencies

- `node-telegram-bot-api` - Telegram Bot API wrapper
- `dotenv` - Environment variable management
- `node-cron` - Cron job scheduling
- `nodemon` - Development auto-restart (dev dependency)

## Notes

- User data is stored in memory (will be lost on restart)
- For production, consider using a database
- Bot runs continuously until stopped with Ctrl+C 