import logging
import azure.functions as func
import json
import os

def main(req: func.HttpRequest) -> func.HttpResponse:
    """
    A resilient health check endpoint for Azure Web PubSub integration.
    This function verifies all prerequisites and provides clear error messages without crashing.
    """
    logging.info('Health check endpoint called')

    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    }

    report = {
        "status": "",
        "runtime_diagnostics": {},
        "webpubsub_diagnostics": {},
        "conclusion": ""
    }

    # 1. Runtime Diagnostics
    report["runtime_diagnostics"] = {
        "python_version": os.sys.version,
        "platform": os.sys.platform,
        "azure_functions_environment": os.environ.get("AZURE_FUNCTIONS_ENVIRONMENT", "Not Set"),
        "website_instance_id": os.environ.get("WEBSITE_INSTANCE_ID", "Local or Not Set"),
        "website_hostname": os.environ.get("WEBSITE_HOSTNAME", "Not Set")
    }

    # 2. Web PubSub Diagnostics
    conn_str = os.environ.get("AZURE_WEB_PUBSUB_CONNECTION_STRING")
    hub_name = os.environ.get("WEB_PUBSUB_HUB_NAME", "ViewerHub") # Use a default

    # Check for Connection String
    if not conn_str:
        report["status"] = "❌ Unhealthy (Missing Connection String)"
        report["conclusion"] = "The AZURE_WEB_PUBSUB_CONNECTION_STRING is NOT set in this environment. Please add it in Azure Portal -> Function App -> Configuration -> Application settings and then SAVE your changes."
        report["webpubsub_diagnostics"] = {"connection_string_found": False}
        return func.HttpResponse(json.dumps(report, indent=2), status_code=503, headers=headers)
    
    report["webpubsub_diagnostics"] = {
        "connection_string_found": True,
        "connection_string_length": len(conn_str),
        "connection_string_preview": conn_str[:20] + "...",
        "hub_name": hub_name
    }

    # 3. Test Connection (only if connection string exists)
    try:
        from azure.messaging.webpubsubservice import WebPubSubServiceClient
        
        service = WebPubSubServiceClient.from_connection_string(
            connection_string=conn_str,
            hub=hub_name
        )
        
        # Generate a test token
        token = service.get_client_access_token(user_id="health-check")
        
        report["webpubsub_diagnostics"]["connection_status"] = "✅ Successfully connected and generated token."
        report["status"] = "✅ Healthy"
        report["conclusion"] = "The service is configured correctly and can connect to Azure Web PubSub."
        status_code = 200

    except ImportError as e:
        report["status"] = "❌ Unhealthy (Missing Dependencies)"
        report["conclusion"] = f"A required Python package is missing: {e.name}. Please ensure 'azure-messaging-webpubsubservice' is in your requirements.txt."
        report["webpubsub_diagnostics"]["connection_status"] = f"Failed: Missing dependency - {e.name}"
        status_code = 500

    except Exception as e:
        report["status"] = "❌ Unhealthy (Connection Error)"
        report["conclusion"] = f"The connection string was found, but the service failed to connect. Error: {str(e)}"
        report["webpubsub_diagnostics"]["connection_status"] = f"Failed: {str(e)}"
        report["webpubsub_diagnostics"]["hint"] = "Verify the connection string value is correct and that the Web PubSub resource is running."
        status_code = 500

    return func.HttpResponse(
        json.dumps(report, indent=2),
        status_code=status_code,
        headers=headers
    )
