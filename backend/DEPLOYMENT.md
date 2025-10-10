# Azure Function App Deployment Instructions

## Environment Variables Required

The negotiate function requires the following environment variable to be set in your Azure Function App:

### AZURE_WEB_PUBSUB_CONNECTION_STRING

This is the connection string for your Azure Web PubSub service. You need to:

1. Go to your Azure Portal
2. Navigate to your Function App (shmorgasbord)
3. Go to Configuration > Application settings
4. Add a new application setting:
   - Name: `AZURE_WEB_PUBSUB_CONNECTION_STRING`
   - Value: Your Web PubSub connection string

The connection string format should be:
```
Endpoint=https://<your-resource-name>.webpubsub.azure.com;AccessKey=<your-access-key>;Version=1.0;
```

## Getting the Web PubSub Connection String

1. In Azure Portal, navigate to your Web PubSub Service
2. Go to "Keys" under Settings
3. Copy the "Connection string" (either primary or secondary)

## Verifying the Deployment

After setting the environment variable:

1. Restart your Function App
2. Test the negotiate endpoint:
   ```bash
   curl "https://shmorgasbord.azurewebsites.net/api/negotiate?room_id=test&username=testuser&role=writer"
   ```

You should receive a JSON response with a WebSocket URL:
```json
{
  "url": "wss://your-resource.webpubsub.azure.com/client/hubs/ViewerHub?access_token=..."
}
```

## Troubleshooting

If you're still getting 500 errors:

1. Check the Function App logs in Azure Portal
2. Ensure the Web PubSub service has a hub named "ViewerHub"
3. Verify the connection string is correctly formatted
4. Make sure the Azure Web PubSub service is running

## Hub Configuration

The negotiate function expects a hub named "ViewerHub" in your Web PubSub service. To create it:

1. Go to your Web PubSub service in Azure Portal
2. Navigate to "Settings" > "Hubs"
3. Add a new hub named "ViewerHub"
4. Configure the hub settings as needed