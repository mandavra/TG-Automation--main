#!/usr/bin/env python3
import requests
import json
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")

def diagnose_channel_links():
    """Diagnose and fix channel link issues"""
    
    print("🔍 CHANNEL LINKS DIAGNOSTIC & FIX TOOL")
    print("=" * 60)
    
    # Step 1: Check current active channels
    print("\n1️⃣ CHECKING CURRENT ACTIVE CHANNELS")
    try:
        response = requests.get(f"{BACKEND_URL}/api/groups/active", timeout=10)
        if response.status_code == 200:
            data = response.json()
            channels = data.get('active_channels', [])
            print(f"   📊 Found {len(channels)} active channels")
            
            for i, channel in enumerate(channels, 1):
                name = channel.get('name', 'Unknown')
                channel_id = channel.get('channel_id', 'N/A')
                join_link = channel.get('join_link', 'MISSING')
                is_legacy = channel.get('is_legacy', False)
                
                print(f"   {i}. {name}")
                print(f"      📍 Channel ID: {channel_id}")
                print(f"      🔗 Join Link: {join_link}")
                print(f"      📜 Legacy: {is_legacy}")
                print()
                
            # Count missing links
            missing_links = sum(1 for ch in channels if not ch.get('join_link'))
            print(f"   ⚠️ Channels missing join links: {missing_links}/{len(channels)}")
            
        else:
            print(f"   ❌ Failed to get active channels: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Error getting active channels: {e}")
        return
    
    # Step 2: Check if we need to generate links
    if missing_links > 0:
        print(f"\n2️⃣ GENERATING MISSING JOIN LINKS")
        print(f"   Need to generate links for {missing_links} channels")
        
        # For each channel without a join link, we need to either:
        # A) Generate a new invite link via Telegram bot
        # B) Update existing stored links
        
        for channel in channels:
            if not channel.get('join_link'):
                print(f"\n   🔧 Fixing channel: {channel.get('name')}")
                print(f"      Channel ID: {channel.get('channel_id')}")
                print(f"      Is Legacy: {channel.get('is_legacy')}")
                
                # This channel needs a join link
                # Since I can't directly call the Telegram API from here,
                # I'll show what needs to be done
                print(f"      ✅ ACTION NEEDED: Generate invite link for this channel")
                
    else:
        print(f"\n2️⃣ ALL CHANNELS HAVE JOIN LINKS ✅")
    
    # Step 3: Provide solution
    print(f"\n3️⃣ SOLUTION SUMMARY")
    print("=" * 60)
    
    if missing_links > 0:
        print("🔧 TO FIX THE 'UNDEFINED' CHANNEL LINKS:")
        print()
        print("   Option 1 - Generate New Links (Recommended):")
        print("   • Use the admin panel to regenerate invite links")
        print("   • Or call the generateChannelJoinLink API for each channel")
        print()
        print("   Option 2 - Manual Fix:")
        print("   • Get invite links directly from Telegram channels")
        print("   • Update the database manually with the links")
        print()
        print("📋 Specific Actions:")
        
        for channel in channels:
            if not channel.get('join_link'):
                group_id = channel.get('group_id')
                channel_db_id = channel.get('channel_db_id')
                
                if channel.get('is_legacy'):
                    print(f"   • Legacy channel '{channel.get('name')}': Update telegramInviteLink field")
                else:
                    print(f"   • Modern channel '{channel.get('name')}': Generate link via API")
                    print(f"     POST /api/groups/{group_id}/channels/{channel_db_id}/generate-link")
    else:
        print("✅ All channels already have join links configured!")
    
    print(f"\n🎯 ROOT CAUSE ANALYSIS:")
    print("   The 'undefined' issue occurs because:")
    print("   • Channels in your system don't have invite links stored")
    print("   • Frontend is trying to display channel.join_link but it's null")
    print("   • Need to generate and store proper invite links")

if __name__ == "__main__":
    diagnose_channel_links()
