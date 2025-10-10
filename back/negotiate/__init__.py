import json
import logging
import os
from urllib.parse import urlparse

import azure.functions as func
from azure.messaging.webpubsubservice import WebPubSubServiceClient
try:
    from azure.core.exceptions import HttpResponseError  # type: ignore
except Exception:  # Fallback if dependency resolution differs locally
    HttpResponseError = Exception  # type: ignore


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
    # Basic request diagnostics (no secrets)
    logging.info(
        "Negotiate start: room_id=%s username=%s role=%s hub=%s hostname=%s",
        room_id,
        username,
        role,
        hub,
        os.environ.get("WEBSITE_HOSTNAME", "unknown")
    )

    # Safely log Web PubSub endpoint from connection string, not the key
    try:
        endpoint = next(
            (part.split("=", 1)[1] for part in connection_string.split(";") if part.strip().lower().startswith("endpoint=")),
            None,
        )
    except Exception:
        endpoint = None
    logging.info("Web PubSub endpoint detected: %s", endpoint or "unavailable")

    try:
        client = WebPubSubServiceClient.from_connection_string(connection_string, hub=hub)

        # Scope permissions to this specific room (group)
        roles = ["webpubsub.joinLeaveGroup"]
        if role == "writer":
            roles.append("webpubsub.sendToGroup")
        logging.info("Requesting client token for user=%s roles=%s groups=%s", username, roles, [room_id])

        token = client.get_client_access_token(user_id=username, roles=roles, groups=[room_id])
        url = token.get("url") or token.get("baseUrl")
        if not url:
            logging.error("Token did not include a 'url' field")
            return _respond({"error": "Failed to create access URL"}, 500)
        try:
            parsed = urlparse(url)
            sanitized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        except Exception:
            sanitized = "<unable to parse ws url>"
        logging.info("Negotiation succeeded. WS target: %s", sanitized)

        return _respond({"url": url})
    except HttpResponseError as http_exc:  # type: ignore
        # Include status code and message but not secrets
        status_code = getattr(http_exc, "status_code", None)
        logging.exception("Negotiation HTTP error (status=%s): %s", status_code, http_exc)
        return _respond({
            "error": "Negotiation failed (HTTP)",
            "status": status_code,
            "details": str(http_exc)
        }, 500)
    except Exception as exc:
        logging.exception("Negotiation failed: %s", exc)
        return _respond({
            "error": "Negotiation failed",
            "details": str(exc)
        }, 500)
