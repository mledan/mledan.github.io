#!/usr/bin/env python3
"""Test the negotiate endpoint and capture detailed error information."""

import requests
import json

# Test the negotiate endpoint
url = "https://slidebord-erhgcyd4gvckdrc3.centralus-01.azurewebsites.net/api/negotiate"
params = {
    "room_id": "test_room",
    "username": "test_user",
    "role": "writer"
}

print(f"Testing negotiate endpoint: {url}")
print(f"Parameters: {params}")
print("-" * 60)

try:
    # Make the request
    response = requests.get(url, params=params)
    
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print("-" * 60)
    
    # Try to parse JSON response
    try:
        json_response = response.json()
        print("JSON Response:")
        print(json.dumps(json_response, indent=2))
    except:
        print("Raw Response:")
        print(response.text)
    
    print("-" * 60)
    
    # Test with curl command for comparison
    import subprocess
    print("\nTesting with curl for comparison:")
    curl_cmd = f'curl -v "{url}?room_id={params["room_id"]}&username={params["username"]}&role={params["role"]}"'
    print(f"Command: {curl_cmd}")
    
except Exception as e:
    print(f"Error occurred: {e}")