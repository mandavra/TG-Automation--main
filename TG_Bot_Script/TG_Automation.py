# Telegram Channel Membership Bot
# This bot uses Join Requests to manage temporary access to a private channel.
# Updated for python-telegram-bot v20+ and .env configuration

import logging
import os
import requests
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Make sure to install the required libraries:
# pip install python-telegram-bot --upgrade
# pip install python-dotenv
# pip install requests
from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackContext,
    ChatJoinRequestHandler, # <-- IMPORTANT: Using ChatJoinRequestHandler now
)

# --- CONFIGURATION ---
# Variables are now loaded from the .env file
BOT_TOKEN = os.getenv("BOT_TOKEN")
CHANNEL_ID_STR = os.getenv("CHANNEL_ID")
ADMIN_USER_IDS_STR = os.getenv("ADMIN_USER_IDS")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")

# --- Type Casting and Validation ---
CHANNEL_ID = int(CHANNEL_ID_STR) if CHANNEL_ID_STR else None
ADMIN_USER_IDS = []
if ADMIN_USER_IDS_STR:
    # This splits the comma-separated string into a list of integers
    ADMIN_USER_IDS = [int(admin_id.strip()) for admin_id in ADMIN_USER_IDS_STR.split(',')]

# This dictionary will store user data in memory.
# For a real-world application, you should use a database (like SQLite, PostgreSQL) for persistence.
# Structure: {user_id: {"kick_time": datetime_object}}
expiring_users = defaultdict(dict)

# --- LOGGING SETUP ---
# Enables logging to see errors and bot activity.
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


# --- BOT COMMANDS ---

async def start_command(update: Update, context: CallbackContext) -> None:
    """
    Handler for the /start command.
    Greets the user and provides instructions.
    """
    user = update.effective_user
    welcome_message = (
        f"👋 Hello, {user.first_name}!\n\n"
        "I am your Channel Membership Manager.\n\n"
        "As an admin, you can use me to generate temporary invite links for your channel.\n\n"
        "👉 **Available Commands:**\n"
        "• `/getlink <duration>` - Generate a temporary invite link.\n"
        "   *Example:* `/getlink 1h` for 1 hour\n"
        "   *Example:* `/getlink 30m` for 30 minutes\n"
        "   *Example:* `/getlink 7d` for 7 days\n"
    )
    await update.message.reply_text(welcome_message, parse_mode=ParseMode.MARKDOWN)


async def get_link_command(update: Update, context: CallbackContext) -> None:
    """
    Handler for the /getlink command.
    Usage: /getlink 1m, /getlink 2m, etc.
    Generates a test invite link with custom expiry time and stores it in the backend database.
    """
    if update.effective_user.id not in ADMIN_USER_IDS:
        await update.message.reply_text("⚠️ You are not authorized to use this command.")
        logger.warning(f"Unauthorized /getlink attempt by user {update.effective_user.id}.")
        return

    try:
        # Parse duration from command arguments
        if not context.args:
            await update.message.reply_text(
                "❌ **Please specify duration!**\n\n"
                "**Usage:** `/getlink <time>`\n\n"
                "**Examples:**\n"
                "• `/getlink 1m` - 1 minute\n"
                "• `/getlink 2m` - 2 minutes\n"
                "• `/getlink 5m` - 5 minutes\n"
                "• `/getlink 1h` - 1 hour",
                parse_mode=ParseMode.MARKDOWN
            )
            return

        duration_str = context.args[0]
        unit = duration_str[-1].lower()
        value = int(duration_str[:-1])

        if unit == 'm':
            duration_seconds = value * 60
            duration_text = f"{value} minute{'s' if value > 1 else ''}"
        elif unit == 'h':
            duration_seconds = value * 3600
            duration_text = f"{value} hour{'s' if value > 1 else ''}"
        else:
            raise ValueError("Invalid time unit. Use 'm' for minutes or 'h' for hours.")

        # Generate the invite link that requires approval (for testing)
        invite_link = await context.bot.create_chat_invite_link(
            chat_id=CHANNEL_ID,
            creates_join_request=True 
        )

        # Calculate expiry time
        expiry_time = datetime.now() + timedelta(seconds=duration_seconds)

        # Store this test link in backend database
        try:
            test_link_data = {
                "link": invite_link.invite_link,
                "link_id": f"test_{int(datetime.now().timestamp())}_{value}{unit}",
                "telegramUserId": None,
                "userId": None,  # Test link without specific user
                "is_used": False,
                "expires_at": expiry_time.isoformat(),
                "duration": duration_seconds,
                "test_expiry_duration": f"{value}{unit}"  # For tracking
            }
            
            # Send to backend to store
            response = requests.post(
                f"{BACKEND_URL}/api/telegram/store-test-link",
                json=test_link_data,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"✅ Test invite link stored in backend database")
            else:
                logger.warning(f"⚠️ Failed to store test link in backend: {response.status_code}")
                
        except Exception as store_error:
            logger.error(f"Failed to store test link in backend: {store_error}")

        # Send the link to the admin who requested it
        await update.message.reply_text(
            f"🔗 **Test Invite Link Generated ({duration_text}):**\n\n"
            f"`{invite_link.invite_link}`\n\n"
            f"⏰ **User will be removed after:** {duration_text}\n"
            f"🕐 **Expiry time:** {expiry_time.strftime('%H:%M:%S')}\n\n"
            "✅ **This test link creates a temporary subscription that expires automatically.**\n\n"
            "🧪 **To test:**\n"
            "1. Click the link → Request to Join\n"
            "2. Bot will approve and start timer\n"
            "3. User will be removed after the specified time",
            parse_mode=ParseMode.MARKDOWN
        )

        logger.info(f"Generated test invite link {invite_link.invite_link} with {duration_text} expiry for admin {update.effective_user.id}")

    except (IndexError, ValueError) as e:
        await update.message.reply_text(
            "❌ **Invalid format!**\n\n"
            "**Usage:** `/getlink <time>`\n\n"
            "**Examples:**\n"
            "• `/getlink 1m` - 1 minute\n"
            "• `/getlink 2m` - 2 minutes\n"
            "• `/getlink 5m` - 5 minutes\n"
            "• `/getlink 1h` - 1 hour",
            parse_mode=ParseMode.MARKDOWN
        )
    except Exception as e:
        logger.error(f"Error creating test invite link: {e}")
        await update.message.reply_text(
            "❌ An error occurred while creating the test invite link. "
            "Make sure I am an admin in the channel and have the 'Invite users via link' and 'Manage join requests' permissions."
        )


# --- MEMBERSHIP TRACKING ---

async def handle_join_request(update: Update, context: CallbackContext) -> None:
    """
    Handles new join requests by validating with backend, then approving or declining.
    """
    request = update.chat_join_request
    user = request.from_user
    chat = request.chat
    invite_link = request.invite_link

    logger.info(f"Received join request from {user.id} ({user.first_name}) for chat {chat.id}.")

    if not invite_link:
        logger.warning(f"Join request from {user.id} has no invite link. Declining.")
        try:
            await context.bot.decline_chat_join_request(chat_id=chat.id, user_id=user.id)
        except Exception as e:
            logger.error(f"Failed to decline join request for {user.id}: {e}")
        return

    # Validate with backend
    try:
        validation_data = {
            "invite_link": invite_link.invite_link,
            "telegram_user_id": str(user.id),
            "user_info": {
                "first_name": user.first_name,
                "last_name": user.last_name,
                "username": user.username
            }
        }

        logger.info(f"Validating join request with backend: {BACKEND_URL}/api/telegram/validate-join")
        
        response = requests.post(
            f"{BACKEND_URL}/api/telegram/validate-join",
            json=validation_data,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            
            if result.get("approve", False):
                # Approve the user
                await context.bot.approve_chat_join_request(chat_id=chat.id, user_id=user.id)
                logger.info(f"✅ Approved join request for {user.id} - validated by backend")

                # Send welcome message
                try:
                    await context.bot.send_message(
                        user.id,
                        f"🎉 Welcome to {chat.title}! Your access is active and will be managed based on your subscription status."
                    )
                except Exception as e:
                    logger.warning(f"Could not send welcome message to {user.id}: {e}")
                
            else:
                # Decline the user
                await context.bot.decline_chat_join_request(chat_id=chat.id, user_id=user.id)
                logger.info(f"❌ Declined join request for {user.id} - reason: {result.get('reason', 'Backend validation failed')}")
                
        else:
            logger.error(f"Backend validation failed with status {response.status_code}: {response.text}")
            # Decline by default if backend is unavailable
            await context.bot.decline_chat_join_request(chat_id=chat.id, user_id=user.id)
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to connect to backend for validation: {e}")
        # Decline by default if backend is unavailable
        try:
            await context.bot.decline_chat_join_request(chat_id=chat.id, user_id=user.id)
            logger.info(f"Declined join request for {user.id} due to backend connection error")
        except Exception as decline_error:
            logger.error(f"Failed to decline join request for {user.id}: {decline_error}")
    except Exception as e:
        logger.error(f"Unexpected error processing join request for {user.id}: {e}")
        try:
            await context.bot.decline_chat_join_request(chat_id=chat.id, user_id=user.id)
        except Exception as decline_error:
            logger.error(f"Failed to decline join request for {user.id}: {decline_error}")


async def kick_expired_users(context: CallbackContext) -> None:
    """
    This function is now primarily a placeholder since subscription expiry 
    is handled by the backend ExpireUsersJob. The bot no longer needs to 
    track kick times locally as the backend manages the full lifecycle.
    
    This could be used for additional cleanup if needed.
    """
    logger.info("Kick job running - Backend handles subscription expiry management")
    
    # Optional: Clean up any leftover local data
    if expiring_users:
        logger.info(f"Cleaning up {len(expiring_users)} leftover local user records")
        expiring_users.clear()
        
    # The backend ExpireUsersJob handles:
    # 1. Finding expired payments
    # 2. Removing users from Telegram channel
    # 3. Updating user status in database
    # 4. Cleaning up database records


# --- MAIN BOT SETUP ---

def main() -> None:
    """Start the bot."""
    if not BOT_TOKEN or not CHANNEL_ID or not ADMIN_USER_IDS:
        logger.error("!!! One or more environment variables (BOT_TOKEN, CHANNEL_ID, ADMIN_USER_IDS) are not set. Please create and configure your .env file. !!!")
        return

    application = Application.builder().token(BOT_TOKEN).build()

    # Add command handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("getlink", get_link_command))
    
    # Add the handler for join requests
    application.add_handler(ChatJoinRequestHandler(handle_join_request))

    # Set up the recurring job to kick users
    job_queue = application.job_queue
    job_queue.run_repeating(kick_expired_users, interval=60, first=0)

    # Start the Bot
    application.run_polling()
    logger.info("Bot has started successfully.")


if __name__ == '__main__':
    main()
