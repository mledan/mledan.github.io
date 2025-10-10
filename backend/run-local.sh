#!/bin/bash

echo "Starting Azure Functions locally..."
echo "=================================="

# Check if connection string is already set
if [ -z "$AZURE_WEB_PUBSUB_CONNECTION_STRING" ]; then
    echo ""
    echo "⚠️  AZURE_WEB_PUBSUB_CONNECTION_STRING is not set!"
    echo ""
    echo "To get your connection string:"
    echo "1. Go to Azure Portal → Your Web PubSub resource (slidebord)"
    echo "2. Click 'Keys' in the left sidebar"
    echo "3. Copy the 'Connection string' (primary or secondary)"
    echo ""
    echo "Then either:"
    echo "A) Set it as an environment variable:"
    echo "   export AZURE_WEB_PUBSUB_CONNECTION_STRING='your-connection-string'"
    echo ""
    echo "B) Or enter it now (it won't be saved):"
    read -p "Connection string: " conn_string
    
    if [ -z "$conn_string" ]; then
        echo "No connection string provided. Exiting."
        exit 1
    fi
    
    export AZURE_WEB_PUBSUB_CONNECTION_STRING="$conn_string"
fi

# Show what we're doing
echo "Environment variables set:"
echo "- AZURE_WEB_PUBSUB_CONNECTION_STRING: [Set but hidden]"
echo ""

# Check if virtual environment exists
if [ -d ".venv" ]; then
    echo "Activating Python virtual environment..."
    source .venv/bin/activate
else
    echo "⚠️  No virtual environment found. Creating one..."
    python3 -m venv .venv
    source .venv/bin/activate
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

echo ""
echo "Starting Functions runtime on http://localhost:7071"
echo "Press Ctrl+C to stop"
echo ""

# Run the function app locally
func start --verbose
