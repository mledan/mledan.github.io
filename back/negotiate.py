import azure.functions as func
import logging
from azure.messaging.webpubsubservice import WebPubSubServiceClient
import osapp = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)@app
.route(route="negotiate")
def negotiate(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Python HTTP trigger function processed a request.')# Parse query params (from frontend fetch)
room_id = req.params.get('room_id')
username = req.params.get('username')
role = req.params.get('role')  # 'writer' or 'reader'

if not room_id or not username or not role:
    return func.HttpResponse("Missing parameters", status_code=400)

# Your Web PubSub connection string (store in app settings/env var)
connection_string = os.environ.get('WEB_PUBSUB_CONNECTION_STRING')  # Set this in Azure Function App settings

if not connection_string:
    return func.HttpResponse("Connection string not configured", status_code=500)

client = WebPubSubServiceClient.from_connection_string(connection_string, hub='default')  # Use a hub name

# Generate client access URL with user ID and roles (writer can send, reader can only receive)
roles = ['webpubsub.joinLeaveGroup', 'webpubsub.sendToGroup'] if role == 'writer' else ['webpubsub.joinLeaveGroup']
token = client.get_client_access_token(user_id=username, roles=roles)

return func.HttpResponse(token['url'], status_code=200)

