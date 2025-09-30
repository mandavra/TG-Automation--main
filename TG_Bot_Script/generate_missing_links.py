#!/usr/bin/env python3
import requests
import json
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")

def generate_missing_links():
    """Generate missing invite links for all channels"""
    
    print("🔧 GENERATING MISSING CHANNEL INVITE LINKS")
    print("=" * 60)
    
    # Step 1: Get channels that need links
    print("\n1️⃣ GETTING CHANNELS NEEDING LINKS")
    try:
        response = requests.get(f"{BACKEND_URL}/api/groups/active", timeout=10)
        if response.status_code != 200:
            print(f"   ❌ Failed to get active channels: {response.status_code}")
            return
        
        data = response.json()
        channels = data.get('active_channels', [])
        missing_links = [ch for ch in channels if not ch.get('join_link')]
        
        print(f"   📊 Total channels: {len(channels)}")
        print(f"   ⚠️ Channels missing links: {len(missing_links)}")
        
        if not missing_links:
            print("   ✅ All channels already have invite links!")
            return
            
    except Exception as e:
        print(f"   ❌ Error getting channels: {e}")
        return
    
    # Step 2: Generate links for each channel
    print(f"\n2️⃣ GENERATING INVITE LINKS")
    success_count = 0
    
    for i, channel in enumerate(missing_links, 1):
        name = channel.get('name', 'Unknown')
        group_id = channel.get('group_id')
        channel_db_id = channel.get('channel_db_id')
        
        print(f"\n   {i}/{len(missing_links)} Generating link for: {name}")
        print(f"      Group ID: {group_id}")
        print(f"      Channel DB ID: {channel_db_id}")
        
        try:
            # Call the generateChannelJoinLink API
            url = f"{BACKEND_URL}/api/groups/{group_id}/channels/{channel_db_id}/generate-link"
            response = requests.post(url, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                invite_link = result.get('inviteLink', 'N/A')
                print(f"      ✅ Generated: {invite_link[:50]}...")
                success_count += 1
            else:
                print(f"      ❌ Failed: HTTP {response.status_code}")
                print(f"      Response: {response.text[:100]}")
                
        except Exception as e:
            print(f"      ❌ Error: {e}")
    
    # Step 3: Verify results
    print(f"\n3️⃣ VERIFICATION")
    print(f"   ✅ Successfully generated: {success_count}/{len(missing_links)} links")
    
    if success_count > 0:
        print(f"\n   🔄 Checking updated channel links...")
        try:
            response = requests.get(f"{BACKEND_URL}/api/groups/active", timeout=10)
            if response.status_code == 200:
                data = response.json()
                updated_channels = data.get('active_channels', [])
                
                print(f"   📊 Updated channels status:")
                for channel in updated_channels:
                    name = channel.get('name', 'Unknown')
                    join_link = channel.get('join_link', 'MISSING')
                    status = "✅ HAS LINK" if join_link and join_link != 'MISSING' else "❌ MISSING"
                    print(f"      • {name}: {status}")
                    
        except Exception as e:
            print(f"   ⚠️ Could not verify results: {e}")
    
    print(f"\n🎯 SUMMARY:")
    if success_count == len(missing_links):
        print("   🎉 ALL CHANNEL LINKS GENERATED SUCCESSFULLY!")
        print("   ✅ The 'undefined' issue should now be resolved")
        print("   🔄 Frontend should now show proper channel links")
    elif success_count > 0:
        print(f"   ⚠️ Partial success: {success_count}/{len(missing_links)} links generated")
        print("   🔧 Some channels may still show 'undefined'")
    else:
        print("   ❌ No links were generated successfully")
        print("   🔧 Manual intervention may be required")

if __name__ == "__main__":
    generate_missing_links()
