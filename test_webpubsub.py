#!/usr/bin/env python3
"""
Azure Web PubSub Service Test Script
Tests the negotiate endpoint and client connections for your collaborative app.
"""

import os
import sys
import json
import time
import asyncio
import requests
import logging
from typing import Optional, Dict, Any

# Configuration
FUNCTION_URL = os.getenv("FUNCTION_URL", "http://localhost:7071/api/negotiate")
ROOM_ID = os.getenv("ROOM_ID", "test-room")
USERNAME = os.getenv("USERNAME", "test-user")
USER_ROLE = os.getenv("USER_ROLE", "writer")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Setup logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class WebPubSubTester:
    """Test Azure Web PubSub integration."""
    
    def __init__(self, function_url: str, room_id: str, username: str, role: str):
        self.function_url = function_url
        self.room_id = room_id
        self.username = username
        self.role = role
        self.negotiate_response = None
        
    def test_negotiate(self) -> Optional[Dict[str, Any]]:
        """Test negotiate endpoint."""
        logger.info("=" * 60)
        logger.info("Testing Web PubSub Negotiate Endpoint")
        logger.info("=" * 60)
        
        # Build URL with query parameters
        params = {
            "room_id": self.room_id,
            "username": self.username,
            "role": self.role
        }
        
        logger.info(f"Function URL: {self.function_url}")
        logger.info(f"Parameters: {json.dumps(params, indent=2)}")
        
        try:
            # Test with GET (your current implementation)
            logger.info("\n📋 Testing GET request...")
            response = requests.get(self.function_url, params=params, timeout=10)
            
            logger.info(f"Response Status: {response.status_code}")
            logger.info(f"Response Headers: {dict(response.headers)}")
            
            if response.status_code != 200:
                logger.error(f"Negotiate failed with status {response.status_code}")
                try:
                    error_data = response.json()
                    logger.error(f"Error response: {json.dumps(error_data, indent=2)}")
                except:
                    logger.error(f"Raw response: {response.text}")
                return None
            
            # Parse response
            data = response.json()
            logger.info(f"✅ Negotiate successful!")
            logger.info(f"Response data: {json.dumps(data, indent=2)}")
            
            # Validate response
            if self._validate_response(data):
                self.negotiate_response = data
                return data
            
        except requests.exceptions.Timeout:
            logger.error("❌ Request timed out")
            logger.error("Check if Function App is running: func start")
        except requests.exceptions.ConnectionError as e:
            logger.error(f"❌ Connection error: {e}")
            logger.error("Ensure the Function App is accessible")
        except Exception as e:
            logger.error(f"❌ Unexpected error: {type(e).__name__}: {e}")
            
        return None
    
    def _validate_response(self, data: Dict[str, Any]) -> bool:
        """Validate negotiate response structure."""
        required_fields = ["url"]
        missing = [field for field in required_fields if field not in data]
        
        if missing:
            logger.error(f"❌ Response missing required fields: {missing}")
            return False
        
        # Check URL format
        url = data.get("url", "")
        if not url.startswith(("wss://", "ws://")):
            logger.warning(f"⚠️  Unexpected URL format: {url}")
        
        # Log additional info
        logger.info(f"WebSocket URL: {url}")
        logger.info(f"User ID: {data.get('userId', 'N/A')}")
        logger.info(f"Hub: {data.get('hub', 'N/A')}")
        logger.info(f"Room: {data.get('room', 'N/A')}")
        logger.info(f"Roles: {data.get('roles', [])}")
        
        return True
    
    async def test_client_connection(self, negotiate_response: Optional[Dict[str, Any]] = None):
        """Test WebSocket client connection."""
        if not negotiate_response:
            negotiate_response = self.negotiate_response
            
        if not negotiate_response:
            logger.error("No negotiate response available")
            return
        
        logger.info("\n" + "=" * 60)
        logger.info("Testing Web PubSub Client Connection")
        logger.info("=" * 60)
        
        try:
            # Import Web PubSub client
            from azure.messaging.webpubsubclient import WebPubSubClient
            from azure.messaging.webpubsubclient.models import WebPubSubDataType
        except ImportError:
            logger.error("❌ Web PubSub client not installed")
            logger.info("Install with: pip install azure-messaging-webpubsubclient")
            return
        
        url = negotiate_response["url"]
        logger.info(f"Connecting to: {url}")
        
        # Create client
        client = WebPubSubClient(url)
        
        # Event handlers
        connected = False
        messages_received = []
        
        def on_connected():
            nonlocal connected
            connected = True
            logger.info("✅ Connected to Web PubSub!")
            
        def on_disconnected():
            logger.info("📴 Disconnected from Web PubSub")
            
        def on_group_message(msg):
            logger.info(f"📨 Group message: {msg.data}")
            messages_received.append(msg.data)
            
        def on_server_message(msg):
            logger.info(f"📬 Server message: {msg.data}")
            
        # Register handlers
        client.on("connected", on_connected)
        client.on("disconnected", on_disconnected)
        client.on("group-message", on_group_message)
        client.on("server-message", on_server_message)
        
        try:
            # Open connection
            logger.info("Opening connection...")
            await client.open()
            
            # Wait for connection
            timeout = 5
            start = time.time()
            while not connected and time.time() - start < timeout:
                await asyncio.sleep(0.1)
            
            if not connected:
                logger.error("❌ Connection timeout")
                return
            
            # Join group/room
            logger.info(f"Joining room: {self.room_id}")
            await client.join_group(self.room_id)
            
            # Send test messages
            logger.info("\n📤 Sending test messages...")
            
            # Send join announcement
            await client.send_to_group(
                self.room_id,
                {"type": "join", "username": self.username},
                WebPubSubDataType.JSON
            )
            
            # Send test message
            await client.send_to_group(
                self.room_id,
                {"type": "test", "message": f"Hello from {self.username}!"},
                WebPubSubDataType.JSON
            )
            
            # Wait for messages
            logger.info("\n👂 Listening for messages (10 seconds)...")
            await asyncio.sleep(10)
            
            logger.info(f"\n📊 Summary:")
            logger.info(f"Messages received: {len(messages_received)}")
            
        except Exception as e:
            logger.error(f"❌ Client error: {type(e).__name__}: {e}")
        finally:
            logger.info("\n🔌 Closing connection...")
            await client.close()
    
    def run_diagnostics(self):
        """Run diagnostic checks."""
        logger.info("\n" + "=" * 60)
        logger.info("Running Diagnostics")
        logger.info("=" * 60)
        
        # Check if function app is accessible
        try:
            base_url = self.function_url.replace("/api/negotiate", "")
            response = requests.get(base_url, timeout=5)
            logger.info(f"✅ Function App base URL is accessible: {base_url}")
        except:
            logger.warning(f"⚠️  Cannot reach Function App base URL")
        
        # Check environment
        conn_str = os.getenv("AZURE_WEB_PUBSUB_CONNECTION_STRING", "")
        if conn_str:
            logger.info("✅ Connection string found in environment")
            # Parse endpoint from connection string
            if "Endpoint=" in conn_str:
                endpoint = conn_str.split("Endpoint=")[1].split(";")[0]
                logger.info(f"Web PubSub endpoint: {endpoint}")
        else:
            logger.warning("⚠️  No connection string in environment")
        
        # Display test URLs
        logger.info("\n📝 Test URLs:")
        logger.info(f"Negotiate: {self.function_url}?room_id={self.room_id}&username={self.username}&role={self.role}")
        
        # Show curl commands
        logger.info("\n🔧 Test with curl:")
        logger.info(f"curl '{self.function_url}?room_id={self.room_id}&username={self.username}&role={self.role}'")


async def main():
    """Main entry point."""
    print("🚀 Azure Web PubSub Test Script")
    print("=" * 60)
    
    # Display configuration
    print(f"Function URL: {FUNCTION_URL}")
    print(f"Room ID: {ROOM_ID}")
    print(f"Username: {USERNAME}")
    print(f"Role: {USER_ROLE}")
    print("=" * 60)
    
    # Create tester
    tester = WebPubSubTester(FUNCTION_URL, ROOM_ID, USERNAME, USER_ROLE)
    
    # Run diagnostics if requested
    if "--diagnose" in sys.argv:
        tester.run_diagnostics()
        print()
    
    # Test negotiate
    print("\n📋 Step 1: Testing Negotiate Endpoint")
    negotiate_response = tester.test_negotiate()
    
    if not negotiate_response:
        print("\n❌ Negotiate test failed!")
        print("\n🔍 Troubleshooting steps:")
        print("1. Ensure Azure Function is running: cd backend && func start")
        print("2. Check AZURE_WEB_PUBSUB_CONNECTION_STRING is set in local.settings.json")
        print("3. Verify Web PubSub resource exists and is running in Azure")
        print("4. Run with --diagnose flag for more information")
        return 1
    
    print("\n✅ Negotiate test passed!")
    
    # Test client connection
    if "--no-client" not in sys.argv:
        print("\n📋 Step 2: Testing Client Connection")
        
        try:
            import azure.messaging.webpubsubclient
            user_input = input("\nTest client connection? (y/n): ").lower().strip()
            if user_input.startswith('y'):
                await tester.test_client_connection(negotiate_response)
        except ImportError:
            print("\n⚠️  Web PubSub client library not installed")
            print("To test client connections, run:")
            print("pip install azure-messaging-webpubsubclient")
    
    print("\n✅ All tests completed!")
    return 0


if __name__ == "__main__":
    # Use asyncio.run() for Python 3.7+
    exit_code = asyncio.run(main())
    sys.exit(exit_code)