import logging
import azure.functions as func
import json
import os

def main(req: func.HttpRequest) -> func.HttpResponse:
    """
    A super-resilient health check that verifies environment variables.
    This function has minimal dependencies to avoid crashing on startup.
    """
    logging.info('Super-resilient health check (healthz) called')

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
    hub_name = os.environ.get("WEB_PUBSUB_HUB_NAME", "Not Set")

    if conn_str:
        report["webpubsub_diagnostics"]["connection_string_found"] = True
        report["webpubsub_diagnostics"]["connection_string_length"] = len(conn_str)
        report["webpubsub_diagnostics"]["connection_string_preview"] = conn_str[:20] + "..."
    else:
        report["webpubsub_diagnostics"]["connection_string_found"] = False

    if hub_name != "Not Set":
        report["webpubsub_diagnostics"]["hub_name_found"] = True
        report["webpubsub_diagnostics"]["hub_name"] = hub_name
    else:
        report["webpubsub_diagnostics"]["hub_name_found"] = False

    # 3. Conclusion
    if conn_str:
        report["status"] = "✅ Healthy (Found Connection String)"
        report["conclusion"] = "The required AZURE_WEB_PUBSUB_CONNECTION_STRING is set. The 500 error is likely due to an invalid value or a service-side issue."
    else:
        report["status"] = "❌ Unhealthy (Missing Connection String)"
        report["conclusion"] = "The AZURE_WEB_PUBSUB_CONNECTION_STRING is NOT set in this environment. Please add it in Azure Portal -> Function App -> Configuration -> Application settings and then SAVE your changes."

    return func.HttpResponse(
        json.dumps(report, indent=2),
        status_code=200,  # Always return 200 so we can see the report
        headers=headers
    )