# Azure Web PubSub Test Script

This repository contains test scripts and utilities for Azure Web PubSub Service integration, focusing on real-time collaborative features.

## Overview

The test script (`test_webpubsub.py`) helps debug and verify:
- Negotiate endpoint functionality
- WebSocket connection establishment
- Real-time message publishing and subscription
- Room/group joining and messaging

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Set these environment variables or use defaults:
```bash
export FUNCTION_URL="http://localhost:7071/api/negotiate"  # Your negotiate endpoint
export ROOM_ID="test-room"                                 # Room to join
export USERNAME="test-user"                                # Your username
export USER_ROLE="writer"                                  # Role: writer or reader
```

### 3. Run Tests

```bash
# Basic test
python test_webpubsub.py

# With diagnostics
python test_webpubsub.py --diagnose

# Skip client connection test
python test_webpubsub.py --no-client
```

## Project Structure

```
.
├── test_webpubsub.py      # Main test script for Web PubSub
├── requirements.txt       # Python dependencies
├── backend/              # Azure Functions backend
│   ├── negotiate/        # Negotiate endpoint function
│   ├── host.json        # Function app configuration
│   └── local.settings.json  # Local development settings
└── README.md            # This file
```

## Backend Setup

See [backend/README.md](backend/README.md) for detailed instructions on:
- Creating Azure Web PubSub resources
- Configuring the negotiate function
- Local development setup
- Deployment to Azure

## Testing Flow

1. **Negotiate Test**: Calls the negotiate endpoint to get WebSocket connection info
2. **Connection Test**: Establishes WebSocket connection using the negotiated URL
3. **Messaging Test**: Joins a room and sends/receives messages

## Common Issues

### Connection Refused
- Ensure Azure Functions is running: `cd backend && func start`
- Check if Azurite is running for local storage

### Missing Connection String
- Set `AZURE_WEB_PUBSUB_CONNECTION_STRING` in `backend/local.settings.json`
- Get connection string from Azure Portal

### Hub Not Found
- Create hub "ViewerHub" in your Web PubSub resource
- Or update `WEB_PUBSUB_HUB_NAME` in settings

## Dependencies

- `requests`: HTTP client for negotiate endpoint
- `azure-messaging-webpubsubclient`: Official Web PubSub client library
- `azure-functions`: Required for backend development

## License

MIT