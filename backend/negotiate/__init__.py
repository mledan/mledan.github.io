import logging
import azure.functions as func
import json
import os
import uuid
from datetime import timedelta
from azure.messaging.webpubsubservice import WebPubSubServiceClient

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Negotiate endpoint called')

    room_id = req.params.get('room_id')
    if not room_id:
        return func.HttpResponse(
            json.dumps({"error": "Missing 'room_id' query param"}),
            status_code=400,
            headers={"Content-Type": "application/json"}
        )

    # Optional: Use role to assign permissions
    role = req.params.get('role', 'reader').lower()
    roles = [f"webpubsub.joinLeaveGroup.{room_id}"]
    if role == 'writer':
        roles.append(f"webpubsub.sendToGroup.{room_id}")

    # Optional: Placeholder for password validation
    password = req.params.get('password')
    if password:  # Later: validate if room is locked
        logging.info(f"Password provided for room {room_id}: {password}")

    user_id = req.params.get('username', str(uuid.uuid4()))
    conn_str = os.environ.get("AZURE_WEB_PUBSUB_CONNECTION_STRING")
    if not conn_str:
        return func.HttpResponse(
            json.dumps({"error": "Missing connection string"}),
            status_code=500,
            headers={"Content-Type": "application/json"}
        )

    try:
        service = WebPubSubServiceClient.from_connection_string(conn_str, hub="ViewerHub")  # Confirm hub name matches your Web PubSub config
        token = service.get_client_access_token(
            user_id=user_id,
            roles=roles,
            minutes_to_expire=60  # Equivalent to 1 hour
)
        return func.HttpResponse(
            json.dumps({"url": token["url"]}),
            status_code=200,
            headers={"Content-Type": "application/json"}
        )
    except Exception as e:
        logging.error(f"Token generation failed: {e}")
        return func.HttpResponse(
            json.dumps({"error": "Failed to generate token"}),
            status_code=500,
            headers={"Content-Type": "application/json"}
        )