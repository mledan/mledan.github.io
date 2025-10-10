import logging
import azure.functions as func
import json
import os
import uuid
from datetime import timedelta
from azure.messaging.webpubsubservice import WebPubSubServiceClient

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Negotiate endpoint called')
    
    # CORS headers for cross-origin requests
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    }
    
    # Handle preflight OPTIONS request
    if req.method == "OPTIONS":
        return func.HttpResponse(
            "",
            status_code=200,
            headers=cors_headers
        )

    # Get room_id from query params (client sends room_id, not group)
    room_id = req.params.get('room_id')
    if not room_id:
        return func.HttpResponse(
            json.dumps({"error": "Missing 'room_id' query param"}),
            status_code=400,
            headers=cors_headers
        )

    # Get username and role from query params
    username = req.params.get('username')
    role = req.params.get('role')
    
    logging.info(f"Negotiate request for room: {room_id}, user: {username}, role: {role}")

    # Use username as user_id, or generate UUID if not provided
    user_id = username if username else str(uuid.uuid4())
    conn_str = os.environ.get("AZURE_WEB_PUBSUB_CONNECTION_STRING")
    if not conn_str:
        logging.error("AZURE_WEB_PUBSUB_CONNECTION_STRING environment variable is not set")
        return func.HttpResponse(
            json.dumps({"error": "Missing connection string"}),
            status_code=500,
            headers=cors_headers
        )

    try:
        service = WebPubSubServiceClient.from_connection_string(conn_str, hub="ViewerHub")
        token = service.get_client_access_token(
            user_id=user_id,
            roles=[
                f"webpubsub.joinGroup.{room_id}",
                f"webpubsub.sendToGroup.{room_id}"
            ],
            expiration_delta=timedelta(hours=1)
        )
        return func.HttpResponse(
            json.dumps({"url": token["url"]}),
            status_code=200,
            headers=cors_headers
        )
    except Exception as e:
        logging.error(f"Token generation failed: {str(e)}")
        logging.error(f"Exception type: {type(e).__name__}")
        error_message = f"Failed to generate token: {str(e)}"
        return func.HttpResponse(
            json.dumps({"error": error_message}),
            status_code=500,
            headers=cors_headers
        )