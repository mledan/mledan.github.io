# Azure Web PubSub Backend

This backend provides real-time collaboration features using Azure Web PubSub Service.

## Architecture

- **Azure Web PubSub**: Managed WebSocket service for real-time messaging
- **Azure Functions**: Serverless compute for the negotiate endpoint
- **Rooms/Groups**: Users join rooms to collaborate in isolated spaces
- **Roles**: Writers can modify content, readers can only view

## Setup Instructions

### 1. Create Azure Resources

#### Azure Web PubSub Service
```bash
# Create resource group
az group create --name myResourceGroup --location eastus

# Create Web PubSub instance
az webpubsub create \
  --name myWebPubSub \
  --resource-group myResourceGroup \
  --location eastus \
  --sku Free_F1

# Get connection string
az webpubsub key show \
  --name myWebPubSub \
  --resource-group myResourceGroup \
  --query primaryConnectionString -o tsv
```

#### Create Hub
```bash
# Create a hub named "ViewerHub"
az webpubsub hub create \
  --name myWebPubSub \
  --resource-group myResourceGroup \
  --hub-name ViewerHub
```

### 2. Local Development Setup

#### Prerequisites
- Python 3.8+
- Azure Functions Core Tools v4+
- Azurite (storage emulator)

#### Install Dependencies
```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Install Azurite
npm install -g azurite

# Create Python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

#### Configure Local Settings
1. Copy the connection string from Azure:
   ```bash
   az webpubsub key show --name myWebPubSub --resource-group myResourceGroup --query primaryConnectionString -o tsv
   ```

2. Update `local.settings.json`:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "python",
       "AZURE_WEB_PUBSUB_CONNECTION_STRING": "Endpoint=https://myWebPubSub.webpubsub.azure.com;AccessKey=...;Version=1.0;",
       "WEB_PUBSUB_HUB_NAME": "ViewerHub",
       "INCLUDE_ACCESS_TOKEN": "false"
     }
   }
   ```

#### Run Locally
```bash
# Terminal 1: Start storage emulator
azurite --silent --location . --debug .

# Terminal 2: Start Functions
cd backend
func start

# You should see:
# Functions:
#   negotiate: [GET,POST] http://localhost:7071/api/negotiate
```

### 3. Testing

#### Test with curl
```bash
# Basic test
curl "http://localhost:7071/api/negotiate?room_id=test&username=alice&role=writer"

# Expected response:
# {
#   "url": "wss://myWebPubSub.webpubsub.azure.com/...",
#   "userId": "alice",
#   "roles": [...],
#   "hub": "ViewerHub",
#   "room": "test",
#   "expiresIn": 3600
# }
```

#### Test with Python script
```bash
# Test negotiate endpoint
python ../test_webpubsub.py

# Test with diagnostics
python ../test_webpubsub.py --diagnose

# Skip client connection test
python ../test_webpubsub.py --no-client
```

### 4. Deployment

#### Deploy to Azure Functions
```bash
# Create Function App
az functionapp create \
  --resource-group myResourceGroup \
  --consumption-plan-location eastus \
  --runtime python \
  --runtime-version 3.9 \
  --functions-version 4 \
  --name myFunctionApp \
  --storage-account mystorageaccount

# Configure app settings
az functionapp config appsettings set \
  --name myFunctionApp \
  --resource-group myResourceGroup \
  --settings AZURE_WEB_PUBSUB_CONNECTION_STRING="your-connection-string"

# Deploy
func azure functionapp publish myFunctionApp
```

## API Reference

### Negotiate Endpoint

**GET/POST** `/api/negotiate`

Returns Web PubSub connection information for WebSocket clients.

#### Query Parameters
- `room_id` (required): The room/group to join
- `username` (optional): User identifier, defaults to UUID
- `role` (optional): User role - "writer" or "reader", defaults to "reader"
- `password` (optional): For future room access control

#### Response
```json
{
  "url": "wss://service.webpubsub.azure.com/client/...",
  "userId": "alice",
  "roles": ["webpubsub.joinLeaveGroup.test", "webpubsub.sendToGroup.test"],
  "hub": "ViewerHub",
  "room": "test",
  "expiresIn": 3600
}
```

#### Error Responses
- `400`: Missing required parameters
- `405`: Invalid HTTP method
- `500`: Server configuration error

## Client Integration

### JavaScript/Browser
```javascript
// Using the Web PubSub client library
import { WebPubSubClient } from '@azure/web-pubsub-client';

// 1. Get connection info from negotiate
const response = await fetch('/api/negotiate?room_id=myroom&username=alice&role=writer');
const { url } = await response.json();

// 2. Create and connect client
const client = new WebPubSubClient(url);
await client.start();

// 3. Join room
await client.joinGroup('myroom');

// 4. Send messages
client.sendToGroup('myroom', { type: 'chat', message: 'Hello!' });

// 5. Receive messages
client.on('group-message', (e) => {
  console.log('Received:', e.message.data);
});
```

### Python
```python
from azure.messaging.webpubsubclient import WebPubSubClient

# Get connection URL from negotiate endpoint
client = WebPubSubClient(url)
await client.open()
await client.join_group('myroom')
await client.send_to_group('myroom', {'type': 'chat', 'message': 'Hello!'})
```

## Troubleshooting

### Common Issues

1. **Connection String Not Found**
   - Ensure `AZURE_WEB_PUBSUB_CONNECTION_STRING` is set in local.settings.json
   - For deployment, set in Function App configuration

2. **Hub Not Found**
   - Create hub in Azure Portal or CLI: `az webpubsub hub create`
   - Default hub name is "ViewerHub"

3. **CORS Issues**
   - Negotiate endpoint includes CORS headers
   - For production, configure specific origins

4. **Token Expiration**
   - Tokens expire after 1 hour by default
   - Clients should handle reconnection

5. **Storage Emulator Issues**
   - Ensure Azurite is running: `azurite --silent`
   - Check port 10000-10002 are available

### Debug Logging

Enable detailed logging:
```bash
# Local development
export AZURE_FUNCTIONS_ENVIRONMENT=Development
func start --verbose

# View logs in Azure
az functionapp logs tail --name myFunctionApp --resource-group myResourceGroup
```

## Security Considerations

1. **Authentication**: Currently using anonymous access for testing. Implement proper auth for production.
2. **Room Access**: Password parameter is placeholder. Implement room access control as needed.
3. **Rate Limiting**: Consider implementing rate limits on negotiate endpoint.
4. **Token Expiry**: Default 1 hour. Adjust based on use case.
5. **Connection Limits**: Free tier has connection limits. Monitor usage.

## Next Steps

1. Implement room access control (password/invite system)
2. Add user presence tracking
3. Implement message history/persistence
4. Add file upload support
5. Create admin functions for room management