import os
import sys
import json
import logging
from typing import Optional

import requests
import base64
import hashlib
import hmac
import time
import urllib.parse
import asyncio
import websockets

# Configuration (set via env vars or leave defaults for local testing)
FUNCTION_URL = os.getenv("FUNCTION_URL", "http://localhost:7071/api/negotiate")
HUB_NAME = os.getenv("HUB_NAME", "ViewerHub")  # Web PubSub hub used by backend
REQUEST_TIMEOUT_SECONDS = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "10"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger = logging.getLogger("signalr_test")


def test_negotiate() -> Optional[dict]:
    """Test 1: Call negotiate endpoint to get connection info."""
    logger.info("Testing negotiate endpoint: %s", FUNCTION_URL)
    try:
        # Web PubSub negotiate implemented as GET in this app
        response = requests.get(FUNCTION_URL, timeout=REQUEST_TIMEOUT_SECONDS, params={
            "room_id": os.getenv("ROOM_ID", "default"),
            "username": os.getenv("USERNAME", "tester"),
            "role": os.getenv("ROLE", "writer"),
        })
        response.raise_for_status()
        negotiate_response = response.json()

        url = negotiate_response.get("url")
        if not url:
            logger.error(
                "Invalid negotiate response: missing 'url' -> %s",
                json.dumps(negotiate_response, indent=2),
            )
            return None

        logger.info("Negotiate successful.")
        logger.debug("Negotiate payload: %s", json.dumps(negotiate_response, indent=2))
        logger.info("WebSocket URL: %s", url)
        return negotiate_response

    except requests.exceptions.HTTPError as http_err:
        status_code = http_err.response.status_code if http_err.response is not None else "unknown"
        logger.error("HTTP error from negotiate (%s): %s", status_code, http_err)
        if status_code == 404:
            logger.error("404: Ensure Function is deployed and route is '/api/negotiate'.")
        elif status_code == 500:
            logger.error(
                "500: Check AzureSignalRConnectionString and SignalR resource status in the Azure portal."
            )
        return None
    except requests.exceptions.RequestException as req_err:
        logger.error("Negotiate request failed: %s", req_err)
        logger.error("Check if the Function host is running and FUNCTION_URL is reachable.")
        return None


async def test_client_connection_ws(negotiate_response: dict) -> None:
    """Connect to Azure Web PubSub using the negotiated client URL."""
    if not negotiate_response:
        return

    ws_url = negotiate_response["url"]
    # Web PubSub expects subprotocol 'json.webpubsub.azure.v1'
    subprotocols = ["json.webpubsub.azure.v1"]

    async def receiver(websocket):
        async for message in websocket:
            try:
                data = json.loads(message)
            except Exception:
                logger.debug("Non-JSON message: %s", message)
                continue
            logger.info("Received: %s", json.dumps(data))

    try:
        async with websockets.connect(ws_url, subprotocols=subprotocols, ping_interval=20, ping_timeout=20) as ws:
            logger.info("Connected to Web PubSub. Listening for messages...")
            # Join group according to our app logic
            room_id = os.getenv("ROOM_ID", "default")
            username = os.getenv("USERNAME", "tester")
            join_envelope = {
                "type": "joinGroup",
                "group": room_id
            }
            await ws.send(json.dumps(join_envelope))
            # Announce join (matches frontend schema)
            await ws.send(json.dumps({
                "type": "sendToGroup",
                "group": room_id,
                "dataType": "json",
                "data": {"type": "join", "username": username, "sender": username}
            }))

            # Receive loop or until Enter pressed
            loop = asyncio.get_event_loop()
            if sys.stdin.isatty():
                logger.info("Press Enter to stop...")
                receiver_task = asyncio.create_task(receiver(ws))
                await loop.run_in_executor(None, sys.stdin.readline)
                receiver_task.cancel()
            else:
                await asyncio.wait_for(receiver(ws), timeout=10)
    except Exception as e:
        logger.error("WebSocket connection failed: %s", e)


if __name__ == "__main__":
    negotiate_resp = test_negotiate()
    if not negotiate_resp:
        sys.exit(1)

    # Optional interactive prompt or env var control
    connect_env = os.getenv("CONNECT", "").strip().lower()
    if connect_env in ("y", "yes", "true", "1"):
        asyncio.run(test_client_connection_ws(negotiate_resp))
    else:
        try:
            choice = input("Test client connection? (y/n): ").strip().lower()
        except EOFError:
            choice = "n"
        if choice.startswith("y"):
            asyncio.run(test_client_connection_ws(negotiate_resp))
