import os
import sys
import json
import logging
from typing import Optional

import requests

# Configuration (set via env vars or leave defaults for local testing)
FUNCTION_URL = os.getenv("FUNCTION_URL", "http://localhost:7071/api/negotiate")
HUB_NAME = os.getenv("HUB_NAME", "chat")  # Must match Function binding
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
        response = requests.post(FUNCTION_URL, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        negotiate_response = response.json()

        url = negotiate_response.get("url")
        access_token = negotiate_response.get("accessToken")
        if not url or not access_token:
            logger.error(
                "Invalid negotiate response: missing 'url' or 'accessToken' -> %s",
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


def test_client_connection(negotiate_response: dict) -> None:
    """Test 2: Connect as client to receive pub/sub messages (assumes broadcaster running)."""
    if not negotiate_response:
        return

    # Upgrade to WebSocket scheme
    url = negotiate_response["url"].replace("https://", "wss://").replace("http://", "ws://")
    access_token = negotiate_response["accessToken"]

    try:
        from signalrcore.hub_connection_builder import HubConnectionBuilder  # type: ignore
    except Exception:
        logger.error("signalrcore is not installed. Please run: pip install signalrcore")
        return

    logger.info("Building SignalR client connection...")
    # The negotiate 'url' already points at the Azure SignalR Service client endpoint for this hub
    builder = (
        HubConnectionBuilder()
        .with_url(
            url,
            options={
                "access_token_factory": lambda: access_token,
                "skip_negotiation": True,  # we've already obtained url + token from negotiate
                "transport": "webSockets",  # ensure WebSockets
            },
        )
        .with_automatic_reconnect({
            "type": "raw",
            "keep_alive_interval": 10,
            "reconnect_interval": 5,
            "max_attempts": 5,
        })
        .configure_logging(logging.DEBUG)
    )

    hub_connection = builder.build()

    # Handlers for pub/sub events
    hub_connection.on_open(lambda: logger.info("Connected to SignalR hub! Waiting for messages..."))
    hub_connection.on_close(lambda: logger.info("Connection closed."))

    # Adjust target name as per your broadcaster Function's 'target'
    hub_connection.on("newMessage", lambda data: logger.info("Received pub/sub message: %s", data))

    try:
        hub_connection.start()
        logger.info("Press Enter to stop listening...")
        try:
            input()
        except EOFError:
            # Non-interactive environments
            logger.info("Non-interactive session detected. Listening for 10 seconds...")
            import time

            time.sleep(10)
    except Exception as conn_err:
        logger.error("Connection failed: %s", conn_err)
        logger.error(
            "Check: Mismatched hubName, token expiry, or SignalR upstream/broadcaster issues."
        )
    finally:
        try:
            hub_connection.stop()
        except Exception:
            pass


if __name__ == "__main__":
    negotiate_resp = test_negotiate()
    if not negotiate_resp:
        sys.exit(1)

    # Optional interactive prompt or env var control
    connect_env = os.getenv("CONNECT", "").strip().lower()
    if connect_env in ("y", "yes", "true", "1"):
        test_client_connection(negotiate_resp)
    else:
        try:
            choice = input("Test client connection? (y/n): ").strip().lower()
        except EOFError:
            choice = "n"
        if choice.startswith("y"):
            test_client_connection(negotiate_resp)
