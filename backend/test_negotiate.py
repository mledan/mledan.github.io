#!/usr/bin/env python3
"""
Test script to verify the negotiate function works
This will help identify if the issue is with the function logic or the runtime
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set a test connection string (you'll need to replace this with your real one)
os.environ["AZURE_WEB_PUBSUB_CONNECTION_STRING"] = input("Enter your Azure Web PubSub connection string: ")

try:
    from negotiate import main
    import azure.functions as func
    
    # Create a mock HTTP request
    class MockHttpRequest:
        def __init__(self, params):
            self.params = params
            self.method = 'GET'
            self.url = 'http://localhost:7071/api/negotiate'
            self.headers = {}
    
    # Test the function
    print("\n" + "="*50)
    print("Testing negotiate function")
    print("="*50)
    
    test_params = {
        'room_id': 'test-room',
        'username': 'test-user',
        'role': 'writer'
    }
    
    print(f"Parameters: {test_params}")
    
    mock_request = MockHttpRequest(test_params)
    response = main(mock_request)
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response headers: {response.headers}")
    print(f"Response body: {response.get_body().decode('utf-8')}")
    
    if response.status_code == 200:
        import json
        data = json.loads(response.get_body().decode('utf-8'))
        if 'url' in data:
            print("\n✅ SUCCESS! Got WebPubSub URL")
            print(f"URL starts with: {data['url'][:50]}...")
        else:
            print("\n❌ ERROR: Response missing 'url' field")
    else:
        print(f"\n❌ ERROR: Got status {response.status_code}")
        
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you've installed the dependencies:")
    print("  pip install -r requirements.txt")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()