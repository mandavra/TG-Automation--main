import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackContext,
    ChatJoinRequestHandler,
)

# --- CONFIGURATION ---
BOT_TOKEN = os.getenv("BOT_TOKEN")

# --- LOGGING SETUP ---
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.DEBUG  # Set to DEBUG for maximum verbosity
)
logger = logging.getLogger(__name__)

# --- COMMAND HANDLERS ---
async def start_command(update: Update, context: CallbackContext) -> None:
    """Handler for /start command"""
    user = update.effective_user
    await update.message.reply_text(f"👋 Hello, {user.first_name}! I'm a debug bot for join requests.")

# --- JOIN REQUEST HANDLING ---
async def handle_join_request(update: Update, context: CallbackContext) -> None:
    """Debug handler for join requests"""
    chat = update.chat_join_request.chat
    user = update.chat_join_request.from_user
    invite_link = update.chat_join_request.invite_link
    
    # Log detailed information
    logger.info("🔍 JOIN REQUEST DETECTED!")
    logger.info(f"👤 User: {user.first_name} {user.last_name} (@{user.username})")
    logger.info(f"👤 User ID: {user.id}")
    logger.info(f"📺 Chat: {chat.title} (ID: {chat.id})")
    
    if invite_link:
        logger.info(f"🔗 Invite Link: {invite_link.invite_link}")
        logger.info(f"👑 Creator: {invite_link.creator.id if invite_link.creator else 'Unknown'}")
    else:
        logger.info("❌ No invite link provided")
    
    # Always approve in debug mode
    try:
        logger.info("✅ Attempting to approve join request...")
        await context.bot.approve_chat_join_request(chat_id=chat.id, user_id=user.id)
        logger.info("✅ Join request approved successfully")
        
        # Try to send message to user
        try:
            await context.bot.send_message(
                user.id,
                f"✅ Your join request to {chat.title} has been approved (DEBUG MODE)"
            )
            logger.info("✅ Notification sent to user")
        except Exception as e:
            logger.error(f"❌ Could not send message to user: {e}")
    
    except Exception as e:
        logger.error(f"❌ Failed to approve join request: {e}")
        try:
            # Try to decline instead
            await context.bot.decline_chat_join_request(chat_id=chat.id, user_id=user.id)
            logger.info("❌ Join request declined as fallback")
        except Exception as decline_error:
            logger.error(f"❌ Failed to decline join request too: {decline_error}")

# --- MAIN BOT SETUP ---
def main() -> None:
    """Start the debug bot"""
    if not BOT_TOKEN:
        logger.error("❌ Missing BOT_TOKEN environment variable")
        return

    logger.info("🚀 Starting Debug Join Request Bot...")

    # Create the Application
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Add command handlers
    application.add_handler(CommandHandler("start", start_command))

    # Add join request handler with high priority
    application.add_handler(ChatJoinRequestHandler(handle_join_request), group=1)
    
    # Log all updates at DEBUG level
    logging.getLogger('telegram').setLevel(logging.DEBUG)
    logging.getLogger('httpx').setLevel(logging.DEBUG)
    
    # Run the bot
    logger.info("✅ Debug bot is now running - will log all join requests!")
    logger.info("❗ Make sure the bot is an admin in the channel")
    logger.info("❗ Channel must be set to require admin approval for new members")
    
    try:
        application.run_polling(allowed_updates=Update.ALL_TYPES)
    except KeyboardInterrupt:
        logger.info("🛑 Bot stopped by user")
    except Exception as e:
        logger.error(f"❌ Bot crashed: {e}")


if __name__ == '__main__':
    main()
