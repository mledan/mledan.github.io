#!/bin/bash

echo "Starting Azure Functions locally..."
echo "=================================="

# For testing, we'll use a mock connection string
# In production, you'd use your real connection string
export AZURE_WEB_PUBSUB_CONNECTION_STRING="Endpoint=https://slidebord.webpubsub.azure.com;AccessKey=MOCK_KEY_FOR_TESTING;Version=1.0;"

# Show what we're doing
echo "Environment variables set:"
echo "- AZURE_WEB_PUBSUB_CONNECTION_STRING: [Set but hidden]"
echo ""
echo "Starting Functions runtime on http://localhost:7071"
echo "Press Ctrl+C to stop"
echo ""

# Run the function app locally
func start --verbose