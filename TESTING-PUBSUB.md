# Testing WebPubSub Connection

## Quick Summary

**You DON'T need a function key!** Your negotiate function is set to `anonymous` authentication, which is correct for browser-based clients.

The issue is that your backend function isn't deployed/accessible. Let's test locally first.

## Step 1: Get Your Real Connection String

You need the actual Azure Web PubSub connection string. Get it from Azure Portal:

1. Go to Azure Portal → Your Web PubSub resource (slidebord)
2. Go to "Keys" section
3. Copy the connection string

## Step 2: Start the Backend Locally

```bash
cd backend

# Edit run-local.sh and replace MOCK_KEY_FOR_TESTING with your real connection string
# Find this line:
# export AZURE_WEB_PUBSUB_CONNECTION_STRING="Endpoint=https://slidebord.webpubsub.azure.com;AccessKey=MOCK_KEY_FOR_TESTING;Version=1.0;"
# Replace with your actual connection string

# Run the backend
./run-local.sh
```

The backend will start on http://localhost:7071

## Step 3: Start the Frontend Test Server

In a new terminal:

```bash
# From the mledan.github.io directory
python3 serve-local.py
```

This will serve your frontend on http://localhost:8080

## Step 4: Test the Connection

1. Open http://localhost:8080/test-pubsub-local.html in your browser
2. Make sure "Local (localhost:7071)" is selected
3. Click "Test Negotiate" - you should see detailed logs
4. If successful, click "Connect to PubSub"
5. Test sending messages

## What the Test Page Shows

- **Step 1**: Tests if the negotiate endpoint is reachable and returns a valid WebPubSub URL
- **Step 2**: Tests actual WebSocket connection to Azure Web PubSub
- **Step 3**: Tests sending/receiving messages

## Common Issues and Solutions

### "Function not found" (404)
- Backend isn't running. Check the terminal running `./run-local.sh`

### "Missing connection string" (500)
- The AZURE_WEB_PUBSUB_CONNECTION_STRING isn't set
- Edit run-local.sh with your real connection string

### CORS Errors
- Already fixed in the code! The backend now sends proper CORS headers

### "Cannot connect to backend"
- Make sure the backend is running on port 7071
- Check if another process is using that port

## Testing with Production (Azure)

Once local testing works:

1. Deploy the backend:
```bash
cd backend
func azure functionapp publish shmorgasbord
```

2. Set the connection string in Azure:
- Go to Function App → Configuration → Application Settings
- Add/Update AZURE_WEB_PUBSUB_CONNECTION_STRING

3. Test using the test page:
- Select "Azure (shmorgasbord)" in the dropdown
- Follow the same test steps

## No Function Keys Needed!

Your setup is correct with `"authLevel": "anonymous"`. This means:
- ✅ No function keys required
- ✅ Browser can call directly
- ✅ CORS headers handle security

Function keys would actually make it LESS secure for browser apps because you'd have to expose the key in JavaScript!

## Architecture Overview

```
Frontend (Browser)
    ↓
[GET /api/negotiate] → Azure Function (anonymous auth)
    ↓
Returns WebPubSub URL with token
    ↓
Frontend connects directly to WebPubSub using token
```

The negotiate function acts as a token generator, not a proxy. Once the frontend has the token, it connects directly to Azure Web PubSub.