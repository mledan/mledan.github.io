# Azure Web PubSub + Azure Functions Integration Issue

## Problem Summary
Our Azure Functions negotiate endpoint is returning a 500 Internal Server Error when attempting to connect to Azure Web PubSub service. The function executes but fails immediately without providing detailed error information.

**Error Details:**
- Endpoint: `https://slidebord-erhgcyd4gvckdrc3.centralus-01.azurewebsites.net/api/negotiate`
- Status: 500 Internal Server Error
- Function execution duration: 9ms (fails very quickly)
- CORS is working correctly

## Project Overview

### What We've Built
This is a collaborative whiteboard application called "Slidebord" that allows multiple users to:
- Create and manipulate text panels and drawing boards in real-time
- Share a virtual workspace with role-based permissions (writer/reader)
- Synchronize state across multiple clients using Azure Web PubSub

### Architecture

**Frontend (Static Site):**
- Hosted at: https://mledan.github.io/
- Single-page application (`index.html`) with vanilla JavaScript
- Uses Azure Web PubSub JavaScript SDK for real-time communication
- Features: Text panels, drawing boards, drag-and-drop, real-time sync

**Backend (Azure Functions - Python):**
- Hosted at: https://slidebord-erhgcyd4gvckdrc3.centralus-01.azurewebsites.net
- Single function: `/api/negotiate` - handles Web PubSub token negotiation
- Runtime: Python with Azure Functions v2
- Dependencies: `azure-functions`, `azure-messaging-webpubsubservice`

**Azure Web PubSub:**
- Used for real-time bidirectional communication
- Clients connect via WebSocket after obtaining access tokens from the negotiate endpoint

### Code Structure

```
/workspace/
├── index.html          # Main application UI
├── back/              # Azure Functions backend
│   ├── host.json      # Functions host configuration
│   ├── requirements.txt # Python dependencies
│   └── negotiate/     # Negotiate function
│       ├── function.json # Function bindings
│       └── __init__.py   # Function implementation
```

### The Negotiate Function

The negotiate function (`back/negotiate/__init__.py`):
1. Accepts query parameters: `room_id`, `username`, `role` (writer/reader)
2. Validates parameters
3. Retrieves Web PubSub connection string from environment variable
4. Creates a WebPubSubServiceClient
5. Generates a client access token with appropriate permissions
6. Returns the WebSocket URL for the client to connect

### Current Configuration

**Function Bindings (`function.json`):**
- HTTP trigger with anonymous auth
- Supports GET, POST, OPTIONS methods
- Route: `/api/negotiate`

**Host Configuration (`host.json`):**
- Uses Extension Bundle v3-4 for managed dependencies

**Environment Variables Expected:**
- `WEB_PUBSUB_CONNECTION_STRING`: The connection string from Azure Web PubSub resource
- `WEB_PUBSUB_HUB`: Hub name (defaults to "default")

## What's Been Verified

1. **CORS is working** - The OPTIONS preflight succeeds
2. **Function is deployed and accessible** - We get a response
3. **Function executes** - Azure logs show it starts but fails quickly (9ms)
4. **Client-side code is correct** - Properly constructs the negotiate URL with parameters

## Suspected Issues

Given the function fails in 9ms, it's likely failing at one of these points:
1. **Missing environment variable**: `WEB_PUBSUB_CONNECTION_STRING` not set in Azure
2. **Invalid connection string format**
3. **Python package issues** in the Azure environment
4. **Permissions/authentication** between Function App and Web PubSub resource

## Azure Configuration Checklist

Please verify the following in your Azure setup:

### 1. Web PubSub Resource
- [ ] Web PubSub resource is created and in "Running" state
- [ ] Hub named "default" exists (or update the hub name in code)
- [ ] Connection string has been copied from Azure Portal:
  - Navigate to: Web PubSub resource → Keys → Connection string

### 2. Function App Configuration
- [ ] Application Settings includes:
  - `WEB_PUBSUB_CONNECTION_STRING` = [your Web PubSub connection string]
  - `WEB_PUBSUB_HUB` = "default" (optional if using default)
- [ ] Python version is 3.8+ (check in Configuration → General settings)
- [ ] Function runtime version is ~4

### 3. Networking
- [ ] Function App can reach Web PubSub service (no VNet/firewall blocking)
- [ ] Web PubSub allows connections from Function App

### 4. Function App Diagnostics
To get more detailed error information:
1. Go to Function App → Functions → negotiate → Monitor
2. Check "Invocation Details" for the failed executions
3. Enable Application Insights if not already enabled
4. Check Function App → Log stream for real-time logs

## How to Debug

1. **Check Function Logs:**
   ```bash
   # In Azure Portal
   Function App → Functions → negotiate → Monitor → Invocation Details
   ```

2. **Verify Environment Variables:**
   ```bash
   # In Azure Portal
   Function App → Configuration → Application settings
   ```

3. **Test Connection String Locally:**
   ```python
   from azure.messaging.webpubsubservice import WebPubSubServiceClient
   
   connection_string = "your-connection-string-here"
   client = WebPubSubServiceClient.from_connection_string(connection_string, hub="default")
   token = client.get_client_access_token(user_id="test")
   print(token)
   ```

4. **Enable Detailed Logging:**
   Add to Application Settings:
   - `PYTHON_ENABLE_DEBUG_LOGGING` = "1"
   - `FUNCTIONS_WORKER_PROCESS_COUNT` = "1"

## Questions for Debugging

1. Is the `WEB_PUBSUB_CONNECTION_STRING` environment variable set in the Function App's Application Settings?
2. What's the exact format of your connection string? (Don't share the actual values, just confirm it matches: `Endpoint=https://[name].webpubsub.azure.com;AccessKey=[key];Version=1.0;`)
3. Can you access the Function App logs to see the specific error message?
4. Is Application Insights enabled for the Function App?
5. Are there any networking restrictions (VNet, firewall rules) on either the Function App or Web PubSub resource?

## Next Steps

Based on the answers above, we can:
1. Add more detailed error logging to the function
2. Test the connection string format
3. Verify the Python packages are correctly installed
4. Check for any Azure-specific configuration issues

The most likely issue is a missing or incorrectly formatted `WEB_PUBSUB_CONNECTION_STRING` in the Function App's Application Settings.