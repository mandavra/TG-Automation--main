# Enhanced Telegram Channel Membership Bot
# Multi-channel support with database integration
# Compatible with python-telegram-bot v20+

import logging
import os
import requests
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackContext,
    ChatJoinRequestHandler,
)

# --- CONFIGURATION ---
BOT_TOKEN = os.getenv("BOT_TOKEN")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")
ADMIN_USER_IDS_STR = os.getenv("ADMIN_USER_IDS")

# Parse admin user IDs
ADMIN_USER_IDS = []
if ADMIN_USER_IDS_STR:
    ADMIN_USER_IDS = [int(admin_id.strip()) for admin_id in ADMIN_USER_IDS_STR.split(',')]

# Multi-channel management
active_channels = {}  # {channel_id: {"admin_id": "xxx", "name": "xxx", "group_id": "xxx"}}

# --- LOGGING SETUP ---
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# --- CHANNEL MANAGEMENT ---
async def load_active_channels():
    """Load active channels and their configurations from the database"""
    global active_channels
    try:
        logger.info("Loading active channels from database...")
        response = requests.get(f"{BACKEND_URL}/api/groups/active", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            channels_data = data.get('active_channels', [])
            
            active_channels.clear()
            
            for channel_data in channels_data:
                channel_id = channel_data.get('channel_id')
                if channel_id:
                    active_channels[int(channel_id)] = {
                        'admin_id': str(channel_data.get('admin_id', '')),
                        'name': channel_data.get('name', 'Unknown Channel'),
                        'group_id': str(channel_data.get('group_id', '')),
                        'chat_title': channel_data.get('chat_title', 'Unknown Channel'),
                        'is_legacy': channel_data.get('is_legacy', False),
                        'channel_db_id': channel_data.get('channel_db_id', ''),
                        'join_link': channel_data.get('join_link', '')
                    }
            
            logger.info(f"✅ Loaded {len(active_channels)} active channels from database")
            
            # Log loaded channels (without sensitive data)
            for channel_id, info in active_channels.items():
                legacy_indicator = " [Legacy]" if info['is_legacy'] else ""
                logger.info(f"  📺 Channel: {info['chat_title']} (ID: {channel_id}){legacy_indicator}")
                
        else:
            logger.warning(f"❌ Failed to load channels from database: HTTP {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Network error loading channels: {e}")
    except Exception as e:
        logger.error(f"❌ Unexpected error loading channels: {e}")

# --- BOT COMMANDS ---

async def start_command(update: Update, context: CallbackContext) -> None:
    """Handler for /start command with enhanced multi-channel info"""
    user = update.effective_user
    
    # Check if user is admin
    is_admin = user.id in ADMIN_USER_IDS
    
    if is_admin:
        welcome_message = (
            f"👋 Hello, {user.first_name}!\n\n"
            "🤖 **Enhanced Channel Management Bot**\n\n"
            "I manage multiple Telegram channels with subscription-based access.\n\n"
            "🔧 **Admin Commands:**\n"
            "• `/getlink <time>` - Generate test invite link\n"
            "   *Examples:* `/getlink 1m`, `/getlink 1h`, `/getlink 1d`\n"
            "• `/reload` - Reload channel configurations\n"
            "• `/channels` - List managed channels\n"
            "• `/status` - Bot status and statistics\n\n"
            f"🏢 **Active Channels:** {len(active_channels)}\n"
            f"🔗 **Backend:** {BACKEND_URL}"
        )
    else:
        welcome_message = (
            f"👋 Hello, {user.first_name}!\n\n"
            "🤖 I manage subscription-based access to premium Telegram channels.\n\n"
            "To join a channel:\n"
            "1. Complete payment and verification process\n"
            "2. You'll receive a joining link via email\n"
            "3. Click the link to request access\n"
            "4. I'll automatically approve valid requests\n\n"
            "❓ Need help? Contact the channel administrator."
        )
    
    await update.message.reply_text(welcome_message, parse_mode=ParseMode.MARKDOWN)


async def reload_channels_command(update: Update, context: CallbackContext) -> None:
    """Reload channel configurations from database (Admin only)"""
    if update.effective_user.id not in ADMIN_USER_IDS:
        await update.message.reply_text("⚠️ Access denied. Admin privileges required.")
        return
    
    await update.message.reply_text("🔄 Reloading channel configurations...")
    
    old_count = len(active_channels)
    await load_active_channels()
    new_count = len(active_channels)
    
    await update.message.reply_text(
        f"✅ **Channels reloaded!**\n\n"
        f"📊 **Before:** {old_count} channels\n"
        f"📊 **After:** {new_count} channels\n"
        f"🔄 **Change:** {'+' if new_count > old_count else ''}{new_count - old_count}"
    )


async def channels_command(update: Update, context: CallbackContext) -> None:
    """List managed channels (Admin only)"""
    if update.effective_user.id not in ADMIN_USER_IDS:
        await update.message.reply_text("⚠️ Access denied. Admin privileges required.")
        return
    
    if not active_channels:
        await update.message.reply_text("📭 No active channels configured.")
        return
    
    message_parts = ["📺 **Managed Channels:**\n"]
    
    for channel_id, info in active_channels.items():
        status_emoji = "🟢" if info.get('status') == 'active' else "🟡"
        message_parts.append(
            f"{status_emoji} **{info['name']}**\n"
            f"   📍 ID: `{channel_id}`\n"
            f"   👤 Admin: `{info['admin_id']}`\n"
        )
    
    message = "\n".join(message_parts)
    await update.message.reply_text(message, parse_mode=ParseMode.MARKDOWN)


async def status_command(update: Update, context: CallbackContext) -> None:
    """Show bot status and statistics (Admin only)"""
    if update.effective_user.id not in ADMIN_USER_IDS:
        await update.message.reply_text("⚠️ Access denied. Admin privileges required.")
        return
    
    # Test backend connection
    backend_status = "❌ Disconnected"
    try:
        response = requests.get(f"{BACKEND_URL}/api/payment/test-config", timeout=10)
        if response.status_code == 200:
            backend_status = "✅ Connected"
        else:
            backend_status = f"⚠️ HTTP {response.status_code}"
    except Exception as e:
        backend_status = f"❌ Error: {str(e)[:50]}"
    
    status_message = (
        f"🤖 **Bot Status Report**\n\n"
        f"🔗 **Backend:** {backend_status}\n"
        f"📺 **Channels:** {len(active_channels)} active\n"
        f"👥 **Admins:** {len(ADMIN_USER_IDS)} configured\n"
        f"🌐 **Backend URL:** `{BACKEND_URL}`\n"
        f"⏰ **Uptime:** Bot running\n"
        f"🔄 **Last Update:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    )
    
    await update.message.reply_text(status_message, parse_mode=ParseMode.MARKDOWN)


async def get_link_command(update: Update, context: CallbackContext) -> None:
    """Generate test invite link (Admin only)"""
    if update.effective_user.id not in ADMIN_USER_IDS:
        await update.message.reply_text("⚠️ Access denied. Admin privileges required.")
        return

    try:
        if not context.args:
            await update.message.reply_text(
                "❌ **Please specify duration!**\n\n"
                "**Usage:** `/getlink <time>`\n\n"
                "**Examples:**\n"
                "• `/getlink 1m` - 1 minute\n"
                "• `/getlink 5m` - 5 minutes\n"
                "• `/getlink 1h` - 1 hour\n"
                "• `/getlink 1d` - 1 day",
                parse_mode=ParseMode.MARKDOWN
            )
            return

        duration_str = context.args[0].lower()
        
        # Parse duration
        duration_seconds = parse_duration(duration_str)
        if not duration_seconds:
            await update.message.reply_text(
                "❌ **Invalid duration format!**\n\n"
                "**Valid formats:**\n"
                "• `1m` = 1 minute\n"
                "• `30m` = 30 minutes\n"
                "• `1h` = 1 hour\n"
                "• `1d` = 1 day",
                parse_mode=ParseMode.MARKDOWN
            )
            return

        # Generate test invite link via backend
        test_data = {
            "telegram_user_id": str(update.effective_user.id),
            "duration": duration_seconds,
            "admin_id": str(update.effective_user.id),
            "test_mode": True
        }

        response = requests.post(
            f"{BACKEND_URL}/api/invite/generate-test-link",
            json=test_data,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            invite_link = result.get("invite_link")
            
            if invite_link:
                await update.message.reply_text(
                    f"✅ **Test invite link generated!**\n\n"
                    f"🔗 **Link:** {invite_link}\n"
                    f"⏰ **Duration:** {duration_str}\n"
                    f"⚠️ **Note:** This is a test link for verification purposes.",
                    parse_mode=ParseMode.MARKDOWN
                )
            else:
                await update.message.reply_text("❌ Failed to generate invite link.")
        else:
            await update.message.reply_text(
                f"❌ **Backend Error:** {response.status_code}\n"
                f"Details: {response.text[:200]}"
            )

    except Exception as e:
        logger.error(f"Error in get_link_command: {e}")
        await update.message.reply_text(f"❌ **Error:** {str(e)}")


def parse_duration(duration_str):
    """Parse duration string like '1m', '2h', '1d' into seconds"""
    try:
        if duration_str.endswith('m'):
            return int(duration_str[:-1]) * 60
        elif duration_str.endswith('h'):
            return int(duration_str[:-1]) * 3600
        elif duration_str.endswith('d'):
            return int(duration_str[:-1]) * 86400
        elif duration_str.isdigit():
            return int(duration_str) * 60  # Default to minutes
        else:
            return None
    except ValueError:
        return None


# --- JOIN REQUEST HANDLING ---

async def handle_join_request(update: Update, context: CallbackContext) -> None:
    """Handle join requests with multi-channel support"""
    chat = update.chat_join_request.chat
    user = update.chat_join_request.from_user
    invite_link = update.chat_join_request.invite_link
    
    logger.info(f"📝 Join request from {user.first_name} (ID: {user.id}) for chat: {chat.title} ({chat.id})")
    
    # Store the invite link for potential revocation
    invite_link_url = invite_link.invite_link if invite_link else None
    logger.info(f"🔗 Using invite link: {invite_link_url}")

    # Check if this channel is managed by our system
    if chat.id not in active_channels:
        logger.warning(f"Join request for unmanaged channel {chat.id}. Declining.")
        try:
            await context.bot.decline_chat_join_request(chat_id=chat.id, user_id=user.id)
            # Notify user
            try:
                await context.bot.send_message(
                    user.id,
                    f"❌ Sorry, {chat.title} is not configured for automatic access management."
                )
            except:
                pass  # User might have blocked the bot
        except Exception as e:
            logger.error(f"Failed to decline join request for unmanaged channel: {e}")
        return

    if not invite_link:
        logger.warning(f"Join request from {user.id} has no invite link. Declining.")
        try:
            await context.bot.decline_chat_join_request(chat_id=chat.id, user_id=user.id)
        except Exception as e:
            logger.error(f"Failed to decline join request for {user.id}: {e}")
        return

    # Validate with backend
    try:
        channel_info = active_channels[chat.id]
        validation_data = {
            "invite_link": invite_link.invite_link,
            "telegram_user_id": str(user.id),
            "channel_id": str(chat.id),
            "user_info": {
                "first_name": user.first_name,
                "last_name": user.last_name,
                "username": user.username
            },
            "channel_info": {
                "admin_id": channel_info.get("admin_id"),
                "group_id": channel_info.get("group_id"),
                "channel_name": channel_info.get("name")
            }
        }

        logger.info(f"Validating join request with backend...")
        
        response = requests.post(
            f"{BACKEND_URL}/api/telegram/validate-join",
            json=validation_data,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            
            if result.get("approve", False):
                # Approve the user
                try:
                    await context.bot.approve_chat_join_request(chat_id=chat.id, user_id=user.id)
                    logger.info(f"✅ Approved join request for {user.id} - validated by backend")
                except Exception as approve_error:
                    error_msg = str(approve_error)
                    if "Hide_requester_missing" in error_msg:
                        logger.warning(f"⚠️ Join request for {user.id} already processed or expired")
                        return  # Exit early, don't try to revoke link
                    else:
                        logger.error(f"❌ Failed to approve join request for {user.id}: {approve_error}")
                        return

                # IMMEDIATELY REVOKE THE INVITE LINK (one-time use)
                if invite_link_url:
                    try:
                        await context.bot.revoke_chat_invite_link(chat_id=chat.id, invite_link=invite_link_url)
                        logger.info(f"🚫 Revoked invite link after successful join: {invite_link_url}")
                        
                        # Notify backend about link revocation and join time
                        join_data = {
                            "invite_link": invite_link_url,
                            "telegram_user_id": str(user.id),
                            "channel_id": str(chat.id),
                            "joined_at": datetime.now(timezone.utc).isoformat(),
                            "action": "joined_and_revoked"
                        }
                        
                        # Send join notification to backend (don't wait for response)
                        try:
                            requests.post(
                                f"{BACKEND_URL}/api/telegram/user-joined",
                                json=join_data,
                                timeout=5
                            )
                            logger.info(f"📡 Notified backend of user join and link revocation")
                        except Exception as backend_error:
                            logger.warning(f"⚠️ Could not notify backend of join: {backend_error}")
                            
                    except Exception as revoke_error:
                        logger.error(f"❌ Failed to revoke invite link: {revoke_error}")

                # Send welcome message
                try:
                    welcome_msg = (
                        f"🎉 **Welcome to {chat.title}!**\n\n"
                        "Your access has been approved and is now active.\n\n"
                        "📋 **Important Notes:**\n"
                        "• Your access is time-limited based on your plan\n"
                        "• You'll receive notifications before expiry\n"
                        "• Your timer starts from the moment you joined\n"
                        "• Contact support for any issues\n\n"
                        "Enjoy your premium content! 🚀"
                    )
                    await context.bot.send_message(
                        user.id,
                        welcome_msg,
                        parse_mode=ParseMode.MARKDOWN
                    )
                except Exception as e:
                    logger.warning(f"Could not send welcome message to {user.id}: {e}")
                
            else:
                # Decline the user
                try:
                    await context.bot.decline_chat_join_request(chat_id=chat.id, user_id=user.id)
                    logger.info(f"❌ Declined join request for {user.id} - reason: {result.get('reason', 'Backend validation failed')}")
                except Exception as decline_error:
                    error_msg = str(decline_error)
                    if "Hide_requester_missing" in error_msg:
                        logger.warning(f"⚠️ Join request for {user.id} already processed or expired")
                        return
                    else:
                        logger.error(f"❌ Failed to decline join request for {user.id}: {decline_error}")
                        return
                
                # Send decline reason to user if available
                try:
                    decline_msg = (
                        f"❌ **Access Denied to {chat.title}**\n\n"
                        f"Reason: {result.get('reason', 'Validation failed')}\n\n"
                        "Please contact support if you believe this is an error."
                    )
                    await context.bot.send_message(
                        user.id,
                        decline_msg,
                        parse_mode=ParseMode.MARKDOWN
                    )
                except Exception as e:
                    logger.warning(f"Could not send decline message to {user.id}: {e}")
                
        else:
            logger.error(f"Backend validation failed with status {response.status_code}: {response.text}")
            await context.bot.decline_chat_join_request(chat_id=chat.id, user_id=user.id)
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to connect to backend for validation: {e}")
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


# --- MAIN BOT SETUP ---

def main() -> None:
    """Start the enhanced bot"""
    if not BOT_TOKEN or not ADMIN_USER_IDS:
        logger.error("❌ Missing required environment variables (BOT_TOKEN, ADMIN_USER_IDS)")
        return

    logger.info("🚀 Starting Enhanced Telegram Channel Management Bot...")

    # Test backend connection
    try:
        response = requests.get(f"{BACKEND_URL}/api/payment/test-config", timeout=10)
        if response.status_code == 200:
            logger.info(f"✅ Backend connection successful: {BACKEND_URL}")
        else:
            logger.warning(f"⚠️ Backend responded with status {response.status_code}")
    except Exception as e:
        logger.error(f"❌ Failed to connect to backend at {BACKEND_URL}: {e}")
        logger.info("Bot will continue but may not function properly without backend connection")

    # Create the Application
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Load active channels from database on startup
    import asyncio
    
    # Use a proper async initialization
    async def initialize():
        await load_active_channels()
    
    # Run initialization in a way that doesn't interfere with the main loop
    # We'll load channels after starting the application

    # Add command handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("getlink", get_link_command))
    application.add_handler(CommandHandler("reload", reload_channels_command))
    application.add_handler(CommandHandler("channels", channels_command))
    application.add_handler(CommandHandler("status", status_command))

    # Add join request handler
    application.add_handler(ChatJoinRequestHandler(handle_join_request))

    # Schedule periodic channel reload (every 5 minutes)
    from telegram.ext import JobQueue
    job_queue = application.job_queue
    
    async def periodic_reload(context: CallbackContext):
        """Periodically reload channel configurations"""
        logger.info("🔄 Periodic channel configuration reload...")
        await load_active_channels()
    
    # Add startup job to load channels immediately  
    async def startup_load(context):
        await load_active_channels()
    job_queue.run_once(startup_load, when=1)
    
    # Add periodic job
    job_queue.run_repeating(periodic_reload, interval=300, first=300)  # Every 5 minutes

    # Run the bot
    logger.info("✅ Enhanced bot is now running with multi-channel support!")
    logger.info(f"👥 Authorized admins: {ADMIN_USER_IDS}")
    logger.info(f"🔗 Backend URL: {BACKEND_URL}")
    logger.info(f"📺 Active channels: {len(active_channels)}")
    
    try:
        application.run_polling(allowed_updates=Update.ALL_TYPES)
    except KeyboardInterrupt:
        logger.info("🛑 Bot stopped by user")
    except Exception as e:
        logger.error(f"❌ Bot crashed: {e}")


if __name__ == '__main__':
    main()