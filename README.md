# Azure SignalR Service Test Script

This Python script tests Azure SignalR Service integration by verifying the negotiate endpoint and optionally connecting as a client to test pub/sub functionality.

## Prerequisites

### Azure Resources
1. **Azure SignalR Service**
   - Create a SignalR Service resource in Azure Portal
   - Use **Free tier** for testing
   - Set mode to **Serverless**
   - Copy the **Connection String** from Keys tab

2. **Azure Function App** (Python 3.9+)
   - Create Function App with Python runtime
   - Deploy the negotiate function (see examples below)
   - Set `AzureSignalRConnectionString` in Application Settings

### Local Development Tools
- Python 3.8+
- Azure Functions Core Tools v4+ (`npm install -g azure-functions-core-tools@4`)
- Azurite (for local storage emulation): `npm install -g azurite`

## Installation

```bash
# Clone or download this repository
git clone <repository-url>
cd azure-signalr-test

# Install dependencies
pip install -r requirements.txt

# Optional: Install SignalR client for full testing
pip install signalrcore
```

## Configuration

Set environment variables or edit the script directly:

```bash
# For local testing
export FUNCTION_URL="http://localhost:7071/api/negotiate"
export HUB_NAME="chat"
export LOG_LEVEL="DEBUG"  # Optional: DEBUG, INFO, WARNING, ERROR

# For deployed function
export FUNCTION_URL="https://your-function-app.azurewebsites.net/api/negotiate"

# Optional: For local function development
export AzureSignalRConnectionString="Endpoint=https://your-signalr.service.signalr.net;AccessKey=...;Version=1.0;"
```

## Usage

### Basic Test (Negotiate Only)
```bash
python test_signalr.py
```

### Skip Client Connection Test
```bash
python test_signalr.py --no-client
```

### Run with Diagnostics
```bash
python test_signalr.py --diagnose
```

### Full Test with Debug Logging
```bash
LOG_LEVEL=DEBUG python test_signalr.py
```

## Expected Output

### Successful Negotiate Test
```json
{
  "url": "wss://your-signalr.service.signalr.net/client/?hub=chat",
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "availableTransports": [
    {"transport": "WebSockets", "transferFormats": ["Text", "Binary"]},
    {"transport": "ServerSentEvents", "transferFormats": ["Text"]},
    {"transport": "LongPolling", "transferFormats": ["Text", "Binary"]}
  ]
}
```

### Client Connection
- Connects to SignalR hub via WebSocket
- Listens for pub/sub messages
- Displays received broadcasts in real-time

## Common Issues and Solutions

### 404 Not Found
- **Cause**: Function not deployed or wrong route
- **Fix**: 
  - Ensure function is deployed: `func azure functionapp publish <app-name>`
  - Check route in function.json is "negotiate" (not "api/negotiate")
  - Verify FUNCTION_URL includes `/api/negotiate`

### 500 Internal Server Error
- **Cause**: Invalid connection string or binding configuration
- **Fix**:
  - Check connection string format: `Endpoint=https://...;AccessKey=...;Version=1.0;`
  - Verify `AzureSignalRConnectionString` is set in Function App settings
  - Check Function logs: `func azure functionapp logstream <app-name>`

### 403 Forbidden
- **Cause**: Authentication required or expired keys
- **Fix**:
  - Set `authLevel: "anonymous"` in function.json for testing
  - Regenerate SignalR access keys in Azure Portal
  - Check CORS settings if calling from browser

### Connection Timeout
- **Cause**: Token expired, hub name mismatch, or network issues
- **Fix**:
  - Tokens expire after 1 hour by default
  - Ensure hub name matches between Function and client
  - Check firewall allows WebSocket connections (ports 80/443)

### Local Development Issues
- **Storage Emulator**: Start Azurite before running functions
  ```bash
  azurite --silent --location . --debug .
  ```
- **Connection String**: Add to `local.settings.json`:
  ```json
  {
    "IsEncrypted": false,
    "Values": {
      "AzureWebJobsStorage": "UseDevelopmentStorage=true",
      "FUNCTIONS_WORKER_RUNTIME": "python",
      "AzureSignalRConnectionString": "Endpoint=...;AccessKey=...;"
    }
  }
  ```

## Function Examples

See the `examples/` directory for sample Azure Functions:
- `negotiate/` - Basic negotiate function
- `broadcast/` - Timer-triggered broadcaster
- `send-message/` - HTTP-triggered message sender

## Security Notes

- **Never hardcode connection strings** in production code
- Use Azure Key Vault or environment variables
- Rotate access keys periodically
- Use managed identities when possible
- Enable HTTPS for production deployments

## Additional Resources

- [Azure SignalR Service Documentation](https://docs.microsoft.com/azure/azure-signalr/)
- [Serverless Quickstart (Python)](https://docs.microsoft.com/azure/azure-signalr/signalr-quickstart-azure-functions-python)
- [SignalR Concepts](https://docs.microsoft.com/azure/azure-signalr/signalr-concept-internals)
- [Troubleshooting Guide](https://docs.microsoft.com/azure/azure-signalr/signalr-howto-troubleshoot-guide)