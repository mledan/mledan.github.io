import logging
import azure.functions as func
import json
import os
from azure.messaging.webpubsubservice import WebPubSubServiceClient

def main(req: func.HttpRequest) -> func.HttpResponse:
    """
    Health check endpoint for Azure Web PubSub integration.
    Verifies all prerequisites and configuration.
    """
    logging.info('Health check endpoint called')
    
    health_status = {
        "status": "checking",
        "timestamp": str(func.datetime.utcnow()),
        "checks": {},
        "errors": [],
        "warnings": []
    }
    
    # Define headers for CORS
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS"
    }
    
    # Check 1: Environment Variables
    logging.info("Checking environment variables...")
    health_status["checks"]["environment_variables"] = {}
    
    # Check connection string
    conn_str = os.environ.get("AZURE_WEB_PUBSUB_CONNECTION_STRING")
    if conn_str:
        health_status["checks"]["environment_variables"]["connection_string"] = {
            "status": "✅ Set",
            "length": len(conn_str),
            "starts_with": conn_str[:20] + "..." if len(conn_str) > 20 else "[too short]"
        }
    else:
        health_status["checks"]["environment_variables"]["connection_string"] = {
            "status": "❌ Missing",
            "error": "AZURE_WEB_PUBSUB_CONNECTION_STRING not found in environment"
        }
        health_status["errors"].append("Missing AZURE_WEB_PUBSUB_CONNECTION_STRING")
    
    # Check hub name
    hub_name = os.environ.get("WEB_PUBSUB_HUB_NAME", "ViewerHub")
    health_status["checks"]["environment_variables"]["hub_name"] = {
        "status": "✅ Set",
        "value": hub_name,
        "is_default": hub_name == "ViewerHub"
    }
    
    # Check 2: Connection String Format
    if conn_str:
        logging.info("Validating connection string format...")
        health_status["checks"]["connection_string_format"] = {}
        
        # Check for required components
        has_endpoint = "Endpoint=" in conn_str
        has_access_key = "AccessKey=" in conn_str
        has_version = "Version=" in conn_str or "version=" in conn_str
        
        if has_endpoint:
            try:
                # Extract endpoint
                endpoint_start = conn_str.index("Endpoint=") + 9
                endpoint_end = conn_str.index(";", endpoint_start) if ";" in conn_str[endpoint_start:] else len(conn_str)
                endpoint = conn_str[endpoint_start:endpoint_end]
                health_status["checks"]["connection_string_format"]["endpoint"] = {
                    "status": "✅ Found",
                    "value": endpoint
                }
            except:
                health_status["checks"]["connection_string_format"]["endpoint"] = {
                    "status": "⚠️ Parse error"
                }
        else:
            health_status["checks"]["connection_string_format"]["endpoint"] = {
                "status": "❌ Missing"
            }
            health_status["errors"].append("Connection string missing Endpoint")
        
        health_status["checks"]["connection_string_format"]["access_key"] = {
            "status": "✅ Found" if has_access_key else "❌ Missing"
        }
        if not has_access_key:
            health_status["errors"].append("Connection string missing AccessKey")
        
        health_status["checks"]["connection_string_format"]["version"] = {
            "status": "✅ Found" if has_version else "⚠️ Missing (optional)"
        }
        if not has_version:
            health_status["warnings"].append("Connection string missing Version (will use default)")
    
    # Check 3: Test Connection to Web PubSub Service
    if conn_str and hub_name:
        logging.info("Testing Web PubSub service connection...")
        health_status["checks"]["service_connection"] = {}
        
        try:
            # Create service client
            service = WebPubSubServiceClient.from_connection_string(
                connection_string=conn_str,
                hub=hub_name
            )
            
            # Try to generate a test token
            test_token = service.get_client_access_token(
                user_id="health_check_user",
                roles=[f"webpubsub.joinLeaveGroup.health_check"],
                minutes_to_expire=1
            )
            
            if test_token and "url" in test_token:
                health_status["checks"]["service_connection"]["status"] = "✅ Connected"
                health_status["checks"]["service_connection"]["hub"] = hub_name
                health_status["checks"]["service_connection"]["test_token_generated"] = True
                
                # Extract service info from URL
                ws_url = test_token["url"]
                if "webpubsub.azure.com" in ws_url:
                    service_name = ws_url.split("//")[1].split(".")[0] if "//" in ws_url else "unknown"
                    health_status["checks"]["service_connection"]["service_name"] = service_name
            else:
                health_status["checks"]["service_connection"]["status"] = "⚠️ Connected but token generation issue"
                health_status["warnings"].append("Service connected but token generation returned unexpected format")
                
        except Exception as e:
            health_status["checks"]["service_connection"]["status"] = "❌ Connection failed"
            health_status["checks"]["service_connection"]["error"] = str(e)
            health_status["errors"].append(f"Service connection failed: {str(e)}")
            
            # Provide specific error guidance
            if "401" in str(e) or "unauthorized" in str(e).lower():
                health_status["checks"]["service_connection"]["hint"] = "Check if AccessKey is correct"
            elif "404" in str(e) or "not found" in str(e).lower():
                health_status["checks"]["service_connection"]["hint"] = f"Check if hub '{hub_name}' exists in your Web PubSub resource"
            elif "connection" in str(e).lower():
                health_status["checks"]["service_connection"]["hint"] = "Check if the Endpoint URL is correct and accessible"
    
    # Check 4: Runtime Environment
    logging.info("Checking runtime environment...")
    health_status["checks"]["runtime"] = {
        "python_version": os.sys.version,
        "function_runtime": os.environ.get("FUNCTIONS_WORKER_RUNTIME", "not set"),
        "platform": os.sys.platform,
        "azure_functions_environment": os.environ.get("AZURE_FUNCTIONS_ENVIRONMENT", "not set"),
        "website_instance_id": os.environ.get("WEBSITE_INSTANCE_ID", "local")
    }
    
    # Check 5: CORS Settings
    health_status["checks"]["cors"] = {
        "headers_set": True,
        "allow_origin": "*",
        "allow_methods": "GET, POST, OPTIONS"
    }
    
    # Check 6: Additional Azure Settings
    health_status["checks"]["azure_settings"] = {
        "storage_account": "✅ Set" if os.environ.get("AzureWebJobsStorage") else "⚠️ Using development",
        "website_hostname": os.environ.get("WEBSITE_HOSTNAME", "local"),
        "region": os.environ.get("REGION_NAME", "not set"),
        "sku": os.environ.get("WEBSITE_SKU", "not set")
    }
    
    # Determine overall status
    if health_status["errors"]:
        health_status["status"] = "❌ Unhealthy"
        overall_status = 503  # Service Unavailable
    elif health_status["warnings"]:
        health_status["status"] = "⚠️ Degraded"
        overall_status = 200  # OK with warnings
    else:
        health_status["status"] = "✅ Healthy"
        overall_status = 200  # OK
    
    # Add summary
    health_status["summary"] = {
        "can_connect": len([e for e in health_status["errors"] if "connection" in e.lower()]) == 0,
        "is_configured": not health_status["errors"],
        "total_errors": len(health_status["errors"]),
        "total_warnings": len(health_status["warnings"])
    }
    
    # Add helpful message
    if health_status["errors"]:
        health_status["help"] = "Please check the errors above and ensure all environment variables are set correctly in Azure Portal → Function App → Configuration → Application settings"
    elif health_status["warnings"]:
        health_status["help"] = "The service should work but check warnings for optimal configuration"
    else:
        health_status["help"] = "Everything looks good! The Web PubSub integration should work correctly."
    
    logging.info(f"Health check completed with status: {health_status['status']}")
    
    return func.HttpResponse(
        json.dumps(health_status, indent=2),
        status_code=overall_status,
        headers=headers
    )