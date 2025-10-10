import logging
import azure.functions as func
import json
import os
import uuid
from datetime import timedelta
from azure.messaging.webpubsubservice import WebPubSubServiceClient

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Negotiate endpoint called')

    group = req.params.get('group')
    if not group:
        return func.HttpResponse(
            json.dumps({"error": "Missing 'group' query param"}),
            status_code=400,
            headers={"Content-Type": "application/json"}
        )

    # Optional: Placeholder for password validation (e.g., check DB for paid rooms)
    password = req.params.get('password')
    if password:  # Ignore for now; later: validate if room is locked
        logging.info(f"Password provided for group {group}: {password}")

    user_id = req.params.get('userId', str(uuid.uuid4()))
    conn_str = os.environ.get("AZURE_WEB_PUBSUB_CONNECTION_STRING")
    if not conn_str:
        return func.HttpResponse(
            json.dumps({"error": "Missing connection string"}),
            status_code=500,
            headers={"Content-Type": "application/json"}
        )

    try:
        service = WebPubSubServiceClient.from_connection_string(conn_str, hub="ViewerHub")
        token = service.get_client_access_token(
            user_id=user_id,
            roles=[
                f"webpubsub.joinGroup.group={group}",
                f"webpubsub.sendToGroup.group={group}"
            ],
            expiration_delta=timedelta(hours=1)
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