# Azure Function Examples for SignalR Service

This directory contains example Azure Functions that work with Azure SignalR Service in serverless mode.

## Functions Overview

### 1. Negotiate Function (`negotiate/`)
**Required** for all SignalR applications. Returns connection information for clients.
- **Trigger**: HTTP POST
- **Route**: `/api/negotiate`
- **Output**: SignalR connection info (URL and access token)

### 2. Broadcast Function (`broadcast/`)
Timer-triggered function that sends messages every 5 seconds.
- **Trigger**: Timer (every 5 seconds)
- **Output**: SignalR messages to all clients
- **Use case**: Testing pub/sub without manual intervention

### 3. Send Message Function (`send-message/`)
HTTP-triggered function to send messages on demand.
- **Trigger**: HTTP POST
- **Route**: `/api/messages`
- **Input**: JSON with message and optional userId
- **Output**: SignalR message to all or specific user

## Local Development Setup

1. **Install Azure Functions Core Tools**
   ```bash
   npm install -g azure-functions-core-tools@4 --unsafe-perm true
   ```

2. **Create Python Virtual Environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install azure-functions
   ```

4. **Configure Local Settings**
   ```bash
   cp local.settings.json.example local.settings.json
   # Edit local.settings.json with your SignalR connection string
   ```

5. **Start Storage Emulator**
   ```bash
   # Using Azurite
   azurite --silent --location . --debug .
   
   # Or use Azure Storage Emulator on Windows
   ```

6. **Run Functions Locally**
   ```bash
   func start
   ```

## Deployment

### Using Azure Functions Core Tools
```bash
# Login to Azure
az login

# Create Function App (if not exists)
az functionapp create --resource-group myResourceGroup \
  --consumption-plan-location westus \
  --runtime python \
  --runtime-version 3.9 \
  --functions-version 4 \
  --name myFunctionApp \
  --storage-account mystorageaccount

# Configure app settings
az functionapp config appsettings set --name myFunctionApp \
  --resource-group myResourceGroup \
  --settings AzureSignalRConnectionString="your-connection-string"

# Deploy functions
func azure functionapp publish myFunctionApp
```

### Using VS Code
1. Install Azure Functions extension
2. Right-click on function folder → Deploy to Function App
3. Follow prompts to select subscription and Function App

## Testing the Functions

### Test Negotiate Endpoint
```bash
# Local
curl -X POST http://localhost:7071/api/negotiate

# Deployed
curl -X POST https://your-app.azurewebsites.net/api/negotiate
```

### Test Send Message
```bash
# Send to all users
curl -X POST http://localhost:7071/api/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from curl!"}'

# Send to specific user
curl -X POST http://localhost:7071/api/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "Private message", "userId": "user123"}'
```

## Function App Structure

For a complete Function App, create this structure:
```
my-signalr-functions/
├── negotiate/
│   ├── __init__.py
│   └── function.json
├── broadcast/
│   ├── __init__.py
│   └── function.json
├── send-message/
│   ├── __init__.py
│   └── function.json
├── host.json
├── local.settings.json
└── requirements.txt
```

### host.json
```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[3.*, 4.0.0)"
  }
}
```

### requirements.txt
```
azure-functions
```

## V2 Programming Model (Alternative)

For Azure Functions V2 programming model, use a single `function_app.py`:

```python
import azure.functions as func
import json
import datetime

app = func.FunctionApp()

@app.route(route="negotiate", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST"])
@app.signal_r_connection_info_input(
    name="connectionInfo",
    hub_name="chat",
    connection_string_setting="AzureSignalRConnectionString"
)
def negotiate(req: func.HttpRequest, connectionInfo) -> func.HttpResponse:
    return func.HttpResponse(
        body=connectionInfo,
        status_code=200,
        headers={'Content-Type': 'application/json'}
    )

@app.timer_trigger(schedule="*/5 * * * * *", arg_name="myTimer", run_on_startup=False)
@app.signal_r_output(
    name="signalRMessages",
    hub_name="chat",
    connection_string_setting="AzureSignalRConnectionString"
)
def broadcast(myTimer: func.TimerRequest) -> str:
    message = {
        'target': 'newMessage',
        'arguments': [{
            'message': f'Broadcast at {datetime.datetime.utcnow().isoformat()}'
        }]
    }
    return json.dumps(message)
```

## Troubleshooting

1. **Function not found (404)**
   - Check function is deployed
   - Verify route in function.json
   - Ensure Function App is running

2. **Internal server error (500)**
   - Check connection string format
   - Verify SignalR service is running
   - Review Function logs

3. **No messages received**
   - Ensure hub names match
   - Check client is listening to correct target
   - Verify SignalR service mode is "Serverless"

4. **Local development issues**
   - Start storage emulator first
   - Check Python version compatibility
   - Ensure all dependencies installed