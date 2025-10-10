import json
import logging
import os

import azure.functions as func
from azure.messaging.webpubsubservice import WebPubSubServiceClient


def _respond(body: dict, status_code: int = 200) -> func.HttpResponse:
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }
    return func.HttpResponse(body=json.dumps(body), status_code=status_code, headers=headers)


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return _respond({}, 204)

    # Support both query params and optional JSON body
    try:
        body = req.get_json()
    except Exception:
        body = {}

    room_id = req.params.get("room_id") or body.get("room_id")
    username = req.params.get("username") or body.get("username")
    role = ((req.params.get("role") or body.get("role") or "")).lower()

    if not room_id or not username or role not in ("writer", "reader"):
        return _respond({"error": "Missing or invalid parameters"}, 400)

    connection_string = os.environ.get("WEB_PUBSUB_CONNECTION_STRING")
    if not connection_string:
        logging.error("WEB_PUBSUB_CONNECTION_STRING is not configured")
        return _respond({
            "error": "Connection string not configured",
            "hint": "Set app setting WEB_PUBSUB_CONNECTION_STRING to the resource connection string from the Azure portal"
        }, 500)

    hub = os.environ.get("WEB_PUBSUB_HUB", "default")

    try:
        client = WebPubSubServiceClient.from_connection_string(connection_string, hub=hub)

        # Scope permissions to this specific room (group)
        roles = ["webpubsub.joinLeaveGroup"]
        if role == "writer":
            roles.append("webpubsub.sendToGroup")

        token = client.get_client_access_token(user_id=username, roles=roles, groups=[room_id])
        url = token.get("url") or token.get("baseUrl")
        if not url:
            logging.error("Token did not include a 'url' field")
            return _respond({"error": "Failed to create access URL"}, 500)

        return _respond({"url": url})
    except Exception as exc:
        logging.exception("Negotiation failed: %s", exc)
        return _respond({
            "error": "Negotiation failed",
            "details": str(exc)
        }, 500)
