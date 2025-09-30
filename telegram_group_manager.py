#!/usr/bin/env python3
"""
Telegram Group Manager
This script helps you connect to Telegram groups and generate invite links.
"""

import asyncio
import logging
from telethon import TelegramClient
from telethon.tl.functions.messages import GetDialogsRequest
from telethon.tl.functions.channels import CreateChannelRequest, InviteToChannelRequest
from telethon.tl.functions.messages import CreateChatRequest
from telethon.tl.types import InputPeerEmpty
import json
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(_name_)

class TelegramGroupManager:
    def _init_(self, api_id, api_hash, phone_number):
        """
        Initialize the Telegram Group Manager
        
        Args:
            api_id (int): Your Telegram API ID
            api_hash (str): Your Telegram API Hash
            phone_number (str): Your phone number with country code
        """
        self.api_id = api_id
        self.api_hash = api_hash
        self.phone_number = phone_number
        self.client = TelegramClient('session_name', api_id, api_hash)
        
    async def connect(self):
        """Connect to Telegram"""
        try:
            await self.client.start(phone=self.phone_number)
            logger.info("Successfully connected to Telegram!")
            return True
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False
    
    async def get_all_groups(self):
        """Get all groups and channels you're part of"""
        try:
            dialogs = await self.client(GetDialogsRequest(
                offset_date=None,
                offset_id=0,
                offset_peer=InputPeerEmpty(),
                limit=100,
                hash=0
            ))
            
            groups = []
            for dialog in dialogs.dialogs:
                entity = dialog.entity
                if hasattr(entity, 'megagroup') or hasattr(entity, 'broadcast'):
                    groups.append({
                        'id': entity.id,
                        'title': entity.title,
                        'username': getattr(entity, 'username', None),
                        'type': 'Supergroup' if hasattr(entity, 'megagroup') else 'Channel'
                    })
            
            return groups
        except Exception as e:
            logger.error(f"Error getting groups: {e}")
            return []
    
    async def create_invite_link(self, group_id, expire_date=None, usage_limit=None):
        """
        Create an invite link for a group
        
        Args:
            group_id (int): ID of the group
            expire_date (int, optional): Expiration date (Unix timestamp)
            usage_limit (int, optional): Maximum number of uses
        """
        try:
            # Get the group entity
            group = await self.client.get_entity(group_id)
            
            # Create invite link
            invite_link = await self.client.create_invite_link(
                group,
                expire_date=expire_date,
                usage_limit=usage_limit
            )
            
            return {
                'success': True,
                'invite_link': invite_link.link,
                'group_title': group.title,
                'expire_date': expire_date,
                'usage_limit': usage_limit
            }
        except Exception as e:
            logger.error(f"Error creating invite link: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def create_group(self, title, description=""):
        """
        Create a new Telegram group
        
        Args:
            title (str): Group title
            description (str): Group description
        """
        try:
            # Create the group
            result = await self.client(CreateChatRequest(
                users=[],  # Empty list for now
                title=title
            ))
            
            group_id = result.chats[0].id
            group_title = result.chats[0].title
            
            # Create invite link for the new group
            invite_info = await self.create_invite_link(group_id)
            
            return {
                'success': True,
                'group_id': group_id,
                'group_title': group_title,
                'invite_link': invite_info.get('invite_link'),
                'message': f"Group '{group_title}' created successfully!"
            }
        except Exception as e:
            logger.error(f"Error creating group: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def join_group_by_link(self, invite_link):
        """
        Join a group using an invite link
        
        Args:
            invite_link (str): The invite link to join
        """
        try:
            # Extract group info from invite link
            group = await self.client.get_entity(invite_link)
            
            return {
                'success': True,
                'group_id': group.id,
                'group_title': group.title,
                'message': f"Successfully joined group: {group.title}"
            }
        except Exception as e:
            logger.error(f"Error joining group: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def disconnect(self):
        """Disconnect from Telegram"""
        await self.client.disconnect()
        logger.info("Disconnected from Telegram")

async def main():
    """Main function to demonstrate usage"""
    
    # Configuration - Replace with your actual values
    API_ID = "YOUR_API_ID"  # Get from https://my.telegram.org
    API_HASH = "YOUR_API_HASH"  # Get from https://my.telegram.org
    PHONE_NUMBER = "YOUR_PHONE_NUMBER"  # e.g., "+1234567890"
    
    # Check if credentials are provided
    if API_ID == "YOUR_API_ID" or API_HASH == "YOUR_API_HASH":
        print("Please update the API_ID, API_HASH, and PHONE_NUMBER in the script!")
        print("Get your API credentials from: https://my.telegram.org")
        return
    
    # Initialize the manager
    manager = TelegramGroupManager(API_ID, API_HASH, PHONE_NUMBER)
    
    try:
        # Connect to Telegram
        if not await manager.connect():
            return
        
        print("\n=== Telegram Group Manager ===")
        print("1. List all groups")
        print("2. Create new group")
        print("3. Generate invite link for existing group")
        print("4. Join group by invite link")
        print("5. Exit")
        
        while True:
            choice = input("\nEnter your choice (1-5): ").strip()
            
            if choice == "1":
                # List all groups
                print("\nFetching your groups...")
                groups = await manager.get_all_groups()
                
                if groups:
                    print(f"\nFound {len(groups)} groups:")
                    for i, group in enumerate(groups, 1):
                        print(f"{i}. {group['title']} ({group['type']})")
                        if group['username']:
                            print(f"   Username: @{group['username']}")
                        print(f"   ID: {group['id']}")
                        print()
                else:
                    print("No groups found.")
            
            elif choice == "2":
                # Create new group
                title = input("Enter group title: ").strip()
                if title:
                    print("Creating group...")
                    result = await manager.create_group(title)
                    if result['success']:
                        print(f"✅ {result['message']}")
                        print(f"Group ID: {result['group_id']}")
                        print(f"Invite Link: {result['invite_link']}")
                    else:
                        print(f"❌ Error: {result['error']}")
                else:
                    print("Group title cannot be empty!")
            
            elif choice == "3":
                # Generate invite link
                print("\nYour groups:")
                groups = await manager.get_all_groups()
                if not groups:
                    print("No groups found.")
                    continue
                
                for i, group in enumerate(groups, 1):
                    print(f"{i}. {group['title']}")
                
                try:
                    group_choice = int(input("Select group number: ")) - 1
                    if 0 <= group_choice < len(groups):
                        selected_group = groups[group_choice]
                        print(f"Generating invite link for: {selected_group['title']}")
                        
                        # Ask for optional parameters
                        expire_days = input("Expire in how many days? (press Enter for no expiry): ").strip()
                        expire_date = None
                        if expire_days.isdigit():
                            import time
                            expire_date = int(time.time()) + (int(expire_days) * 24 * 60 * 60)
                        
                        usage_limit = input("Usage limit? (press Enter for unlimited): ").strip()
                        usage_limit = int(usage_limit) if usage_limit.isdigit() else None
                        
                        result = await manager.create_invite_link(
                            selected_group['id'], 
                            expire_date, 
                            usage_limit
                        )
                        
                        if result['success']:
                            print(f"✅ Invite link generated successfully!")
                            print(f"Link: {result['invite_link']}")
                            if expire_date:
                                print(f"Expires: {expire_days} days from now")
                            if usage_limit:
                                print(f"Usage limit: {usage_limit} times")
                        else:
                            print(f"❌ Error: {result['error']}")
                    else:
                        print("Invalid group selection!")
                except ValueError:
                    print("Please enter a valid number!")
            
            elif choice == "4":
                # Join group by invite link
                invite_link = input("Enter invite link: ").strip()
                if invite_link:
                    print("Joining group...")
                    result = await manager.join_group_by_link(invite_link)
                    if result['success']:
                        print(f"✅ {result['message']}")
                    else:
                        print(f"❌ Error: {result['error']}")
                else:
                    print("Please enter a valid invite link!")
            
            elif choice == "5":
                print("Goodbye!")
                break
            
            else:
                print("Invalid choice! Please select 1-5.")
    
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        await manager.disconnect()

if _name_ == "_main_":
    asyncio.run(main())