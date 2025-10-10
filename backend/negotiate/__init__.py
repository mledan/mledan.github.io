import logging
import azure.functions as func
import json
import os
import uuid
from datetime import timedelta
from azure.messaging.webpubsubservice import WebPubSubServiceClient

def main(req: func.HttpRequest) -> func.HttpResponse:
    """
    Negotiate endpoint for Azure Web PubSub Service.
    Returns connection URL and token for WebSocket clients.
    
    Query Parameters:
    - room_id: Required. The room/group to join
    - username: Optional. User identifier (defaults to UUID)
    - role: Optional. 'writer' or 'reader' (defaults to 'reader')
    - password: Optional. For future room access control
    """
    logging.info('Negotiate endpoint called')
    
    # Log request details for debugging
    logging.info(f"Method: {req.method}")
    logging.info(f"URL: {req.url}")
    logging.info(f"Params: {dict(req.params)}")
    logging.info(f"Headers: {dict(req.headers)}")

    # Support both GET and POST methods
    if req.method not in ['GET', 'POST']:
        return func.HttpResponse(
            json.dumps({"error": f"Method {req.method} not allowed. Use GET or POST."}),
            status_code=405,
            headers={"Content-Type": "application/json"}
        )

    # Get room_id (required)
    room_id = req.params.get('room_id')
    logging.info(f'Room ID: {room_id}')
    
    if not room_id:
        logging.warning("Missing room_id parameter")
        return func.HttpResponse(
            json.dumps({
                "error": "Missing 'room_id' query parameter",
                "example": "/api/negotiate?room_id=myroom&username=john&role=writer"
            }),
            status_code=400,
            headers=headers
        )

    # Get or generate user_id
    user_id = req.params.get('username', req.params.get('user_id'))
    if not user_id:
        user_id = str(uuid.uuid4())
        logging.info(f"Generated user_id: {user_id}")
    else:
        logging.info(f"Using provided user_id: {user_id}")

    # Determine user role and permissions
    role = req.params.get('role', 'reader').lower()
    if role not in ['writer', 'reader', 'admin']:
        role = 'reader'
    
    # Build Web PubSub roles/permissions
    roles = [
        f"webpubsub.joinLeaveGroup.{room_id}",
        f"webpubsub.sendToGroup"  # Allow sending to current group
    ]
    
    if role in ['writer', 'admin']:
        roles.extend([
            f"webpubsub.sendToGroup.{room_id}",
            "webpubsub.sendToGroup"  # Broader send permissions
        ])
    
    logging.info(f"User {user_id} requesting access to room '{room_id}' with role '{role}'")
    logging.info(f"Assigned roles: {roles}")

    # Optional: Password validation placeholder
    password = req.params.get('password')
    if password:
        logging.info(f"Password provided for room {room_id}")
        # TODO: Implement room access control

    # Get connection string from environment
    conn_str = os.environ.get("AZURE_WEB_PUBSUB_CONNECTION_STRING")
    logging.info(f'Connection string exists: {bool(conn_str)}')
    if conn_str:
        logging.info(f'Connection string length: {len(conn_str)}')
    if not conn_str:
        logging.error("AZURE_WEB_PUBSUB_CONNECTION_STRING not found in environment")
        return func.HttpResponse(
            json.dumps({
                "error": "Service not configured",
                "details": "Missing AZURE_WEB_PUBSUB_CONNECTION_STRING in application settings"
            }),
            status_code=500,
            headers=headers
        )

    # Get hub name from environment or use default
    hub_name = os.environ.get("WEB_PUBSUB_HUB_NAME", "ViewerHub")
    logging.info(f"Using hub: {hub_name}")

    try:
        # Create Web PubSub service client
        service = WebPubSubServiceClient.from_connection_string(
            connection_string=conn_str,
            hub=hub_name
        )
        
        # Generate client access token
        token_response = service.get_client_access_token(
            user_id=user_id,
            roles=roles,
            minutes_to_expire=60  # 1 hour expiry
        )
        
        # Build response
        response_data = {
            "url": token_response["url"],
            "userId": user_id,
            "roles": roles,
            "hub": hub_name,
            "room": room_id,
            "expiresIn": 3600  # seconds
        }
        
        # Add access token separately if needed for debugging
        if os.environ.get("INCLUDE_ACCESS_TOKEN", "false").lower() == "true":
            response_data["accessToken"] = token_response.get("token", "")
        
        logging.info(f"Successfully generated token for user {user_id}")
        
        return func.HttpResponse(
            json.dumps(response_data),
            status_code=200,
            headers={
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",  # CORS for browser clients
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
            }
        )
        
    except Exception as e:
        logging.error(f"Token generation failed: {type(e).__name__}: {str(e)}")
        
        # Provide helpful error messages
        error_details = {
            "error": "Failed to generate access token",
            "type": type(e).__name__,
            "message": str(e)
        }
        
        # Add debugging hints based on common errors
        if "connection_string" in str(e).lower():
            error_details["hint"] = "Check AZURE_WEB_PUBSUB_CONNECTION_STRING format"
        elif "not found" in str(e).lower():
            error_details["hint"] = f"Ensure hub '{hub_name}' exists in your Web PubSub resource"
        
        return func.HttpResponse(
            json.dumps(error_details),
            status_code=500,
            headers=headers
        )
