#!/usr/bin/env python3
import requests
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

backend_url = os.getenv('BACKEND_URL', 'http://localhost:4000')

def test_backend_connection():
    try:
        print("🔗 Testing backend connection...")
        response = requests.get(f'{backend_url}/health', timeout=10)
        if response.status_code == 200:
            print(f"✅ Backend connected successfully!")
            data = response.json()
            print(f"   Status: {data.get('status')}")
            print(f"   DB Status: {data.get('dbStatus')}")
            print(f"   Port: {data.get('port')}")
        else:
            print(f"❌ Backend connection failed: {response.status_code}")
        
        print("\n📺 Testing active channels...")
        response = requests.get(f'{backend_url}/api/groups/active', timeout=10)
        print(f"   Active channels endpoint status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            channels = data.get('active_channels', [])
            print(f"   Active channels found: {len(channels)}")
            
            for i, channel in enumerate(channels, 1):
                print(f"   {i}. {channel.get('name', 'Unknown')} (ID: {channel.get('channel_id', 'N/A')})")
        else:
            print(f"   Failed to get channels: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing backend: {e}")

if __name__ == "__main__":
    test_backend_connection()
