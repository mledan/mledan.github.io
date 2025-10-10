#!/usr/bin/env python3
"""
Azure SignalR Service Test Script
Tests the negotiate endpoint and optionally connects as a client to verify pub/sub functionality.
"""

import os
import sys
import json
import time
import requests
import logging
from typing import Optional, Dict, Any

# Configuration (set these via env vars or hardcode for testing)
FUNCTION_URL = os.getenv("FUNCTION_URL", "http://localhost:7071/api/negotiate")
HUB_NAME = os.getenv("HUB_NAME", "chat")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Enable logging for debugging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SignalRTester:
    """Main test class for Azure SignalR Service."""
    
    def __init__(self, function_url: str, hub_name: str):
        self.function_url = function_url
        self.hub_name = hub_name
        self.negotiate_response = None
        
    def test_negotiate(self) -> Optional[Dict[str, Any]]:
        """Test 1: Call negotiate endpoint to get connection info."""
        logger.info(f"Testing negotiate endpoint: {self.function_url}")
        logger.info(f"Hub name: {self.hub_name}")
        
        try:
            # Make POST request to negotiate endpoint
            headers = {"Content-Type": "application/json"}
            response = requests.post(self.function_url, headers=headers, timeout=10)
            
            # Log response details for debugging
            logger.debug(f"Response status code: {response.status_code}")
            logger.debug(f"Response headers: {dict(response.headers)}")
            
            # Check for errors
            if response.status_code != 200:
                self._handle_negotiate_error(response)
                return None
            
            # Parse JSON response
            negotiate_response = response.json()
            logger.info("Negotiate successful!")
            logger.info(f"Response: {json.dumps(negotiate_response, indent=2)}")
            
            # Validate required fields
            if not self._validate_negotiate_response(negotiate_response):
                return None
            
            self.negotiate_response = negotiate_response
            return negotiate_response
            
        except requests.exceptions.Timeout:
            logger.error("Request timed out. Check if the Function App is running and accessible.")
            return None
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error: {e}")
            logger.error("Check if the Function URL is correct and the service is running.")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Raw response: {response.text}")
            return None
    
    def _handle_negotiate_error(self, response: requests.Response):
        """Handle specific HTTP error responses with debugging hints."""
        error_handlers = {
            404: "Function not found. Ensure:\n"
                 "  - Function is deployed\n"
                 "  - Route is 'negotiate' (not 'api/negotiate' in function.json)\n"
                 "  - Function App URL is correct",
            401: "Unauthorized. Check:\n"
                 "  - authLevel is set to 'anonymous' for testing\n"
                 "  - Function key if authLevel is 'function'",
            403: "Forbidden. Check:\n"
                 "  - Access keys haven't expired\n"
                 "  - CORS settings if calling from browser",
            500: "Internal server error. Check:\n"
                 "  - AzureSignalRConnectionString format\n"
                 "  - SignalR resource is running in Azure portal\n"
                 "  - Function logs for detailed error",
            503: "Service unavailable. SignalR service might be:\n"
                 "  - Starting up\n"
                 "  - Under maintenance\n"
                 "  - Experiencing issues"
        }
        
        error_msg = error_handlers.get(response.status_code, f"HTTP {response.status_code} error")
        logger.error(f"Negotiate failed: {error_msg}")
        
        # Try to get error details from response
        try:
            error_details = response.json()
            logger.error(f"Error details: {json.dumps(error_details, indent=2)}")
        except:
            logger.error(f"Raw error response: {response.text[:500]}")
    
    def _validate_negotiate_response(self, response: Dict[str, Any]) -> bool:
        """Validate that negotiate response contains required fields."""
        required_fields = ["url", "accessToken"]
        missing_fields = [field for field in required_fields if field not in response]
        
        if missing_fields:
            logger.error(f"Invalid negotiate response: Missing fields {missing_fields}")
            logger.error("Check Function binding configuration:")
            logger.error("  - signalRConnectionInfo binding is configured")
            logger.error("  - connectionStringSetting points to correct app setting")
            logger.error("  - Connection string is valid")
            return False
        
        # Additional validation
        url = response.get("url", "")
        if not url.startswith(("https://", "http://", "wss://", "ws://")):
            logger.warning(f"Unexpected URL format: {url}")
        
        # Log additional info if present
        if "availableTransports" in response:
            transports = response["availableTransports"]
            logger.info(f"Available transports: {[t.get('transport') for t in transports]}")
        
        return True
    
    def test_client_connection(self, negotiate_response: Optional[Dict[str, Any]] = None):
        """Test 2: Connect as client to receive pub/sub messages."""
        if not negotiate_response:
            negotiate_response = self.negotiate_response
        
        if not negotiate_response:
            logger.error("No negotiate response available. Run test_negotiate() first.")
            return
        
        try:
            # Import SignalR client (optional dependency)
            from signalrcore.hub_connection_builder import HubConnectionBuilder
        except ImportError:
            logger.error("SignalR client not installed. Install with: pip install signalrcore")
            logger.info("Skipping client connection test.")
            return
        
        # Convert HTTP URL to WebSocket URL
        url = negotiate_response["url"]
        if url.startswith("https://"):
            url = url.replace("https://", "wss://", 1)
        elif url.startswith("http://"):
            url = url.replace("http://", "ws://", 1)
        
        access_token = negotiate_response["accessToken"]
        
        logger.info(f"Building SignalR client connection to: {url}")
        
        # Build hub connection
        builder = HubConnectionBuilder() \
            .with_url(url, options={
                "access_token_factory": lambda: access_token,
                "skip_negotiation": True,  # We already negotiated
                "transport": "webSockets"
            }) \
            .configure_logging(logging.DEBUG if logger.level <= logging.DEBUG else logging.INFO)
        
        hub_connection = builder.build()
        
        # Connection event handlers
        connection_opened = False
        
        def on_open():
            nonlocal connection_opened
            connection_opened = True
            logger.info("✅ Connected to SignalR hub!")
            logger.info(f"Hub: {self.hub_name}")
            logger.info("Waiting for pub/sub messages...")
            logger.info("(Press Ctrl+C to stop)")
        
        def on_close():
            logger.info("Connection closed.")
        
        def on_error(error):
            logger.error(f"Connection error: {error}")
        
        # Message handlers (adjust based on your broadcaster)
        def on_new_message(args):
            logger.info(f"📨 Received message: {args}")
        
        def on_broadcast(args):
            logger.info(f"📢 Broadcast: {args}")
        
        # Register handlers
        hub_connection.on_open(on_open)
        hub_connection.on_close(on_close)
        hub_connection.on_error(on_error)
        
        # Common message targets (adjust based on your setup)
        hub_connection.on("newMessage", on_new_message)
        hub_connection.on("broadcast", on_broadcast)
        hub_connection.on("notify", lambda args: logger.info(f"🔔 Notification: {args}"))
        
        try:
            logger.info("Starting connection...")
            hub_connection.start()
            
            # Wait for connection to establish
            timeout = 10
            start_time = time.time()
            while not connection_opened and time.time() - start_time < timeout:
                time.sleep(0.1)
            
            if not connection_opened:
                logger.error("Connection timeout. Possible issues:")
                logger.error("  - Token expired (default 1 hour)")
                logger.error("  - Hub name mismatch")
                logger.error("  - Network/firewall blocking WebSocket")
                return
            
            # Keep connection alive
            logger.info("\nConnection established. Listening for messages...")
            logger.info("To test pub/sub:")
            logger.info("  1. Run a broadcaster Function")
            logger.info("  2. Send messages from Azure portal")
            logger.info("  3. Use another client to publish")
            
            while True:
                time.sleep(1)
                
        except KeyboardInterrupt:
            logger.info("\nStopping client...")
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            logger.error("Debugging tips:")
            logger.error("  - Check hub name matches between server and client")
            logger.error("  - Verify SignalR service is in 'Serverless' mode")
            logger.error("  - Check Azure portal > SignalR > Metrics for connections")
        finally:
            hub_connection.stop()
            logger.info("Client disconnected.")
    
    def run_diagnostics(self):
        """Run additional diagnostics to help troubleshoot issues."""
        logger.info("\n=== Running Diagnostics ===")
        
        # Check if URL is reachable
        try:
            base_url = self.function_url.rsplit('/api/', 1)[0]
            response = requests.get(base_url, timeout=5)
            logger.info(f"✅ Function App is reachable: {base_url}")
        except:
            logger.warning(f"⚠️  Cannot reach Function App base URL")
        
        # Parse and validate connection string format (if provided via env)
        conn_string = os.getenv("AzureSignalRConnectionString", "")
        if conn_string:
            self._validate_connection_string(conn_string)
        
        # Check for common misconfigurations
        if "azurewebsites.net" in self.function_url and "http://" in self.function_url:
            logger.warning("⚠️  Using HTTP with Azure-hosted function. Consider HTTPS.")
        
        if self.hub_name in ["hub", "default", "test"]:
            logger.info(f"ℹ️  Using common hub name '{self.hub_name}'. Ensure it matches your Function config.")
    
    def _validate_connection_string(self, conn_string: str):
        """Validate connection string format."""
        required_parts = ["Endpoint=", "AccessKey="]
        missing = [part for part in required_parts if part not in conn_string]
        
        if missing:
            logger.error(f"❌ Invalid connection string format. Missing: {missing}")
            logger.info("Expected format: Endpoint=https://<name>.service.signalr.net;AccessKey=<key>;Version=1.0;")
        else:
            logger.info("✅ Connection string format appears valid")
            
            # Extract endpoint
            try:
                endpoint = conn_string.split("Endpoint=")[1].split(";")[0]
                logger.info(f"SignalR endpoint: {endpoint}")
            except:
                pass


def main():
    """Main entry point."""
    print("🚀 Azure SignalR Service Test Script")
    print("=" * 50)
    
    # Display configuration
    print(f"Function URL: {FUNCTION_URL}")
    print(f"Hub Name: {HUB_NAME}")
    print(f"Log Level: {LOG_LEVEL}")
    print("=" * 50)
    
    # Create tester instance
    tester = SignalRTester(FUNCTION_URL, HUB_NAME)
    
    # Run diagnostics first
    if "--diagnose" in sys.argv:
        tester.run_diagnostics()
        print()
    
    # Test 1: Negotiate
    print("\n📋 Test 1: Negotiate Endpoint")
    print("-" * 30)
    negotiate_response = tester.test_negotiate()
    
    if not negotiate_response:
        print("\n❌ Negotiate test failed. Please check the errors above.")
        print("\nCommon fixes:")
        print("  1. Ensure Function is running (locally: func start)")
        print("  2. Check FUNCTION_URL environment variable")
        print("  3. Verify AzureSignalRConnectionString is set")
        print("  4. Run with --diagnose flag for more info")
        return 1
    
    print("\n✅ Negotiate test passed!")
    
    # Test 2: Client Connection (optional)
    if "--no-client" not in sys.argv:
        print("\n📋 Test 2: Client Connection")
        print("-" * 30)
        
        try:
            import signalrcore
            user_input = input("Test client connection? (y/n): ").lower().strip()
            if user_input.startswith('y'):
                tester.test_client_connection(negotiate_response)
        except ImportError:
            print("\n⚠️  SignalR client library not installed.")
            print("To test client connections, run: pip install signalrcore")
            print("Skipping client test.")
    
    print("\n✅ All tests completed!")
    return 0


if __name__ == "__main__":
    sys.exit(main())