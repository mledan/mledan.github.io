# Azure Troubleshooting Steps

Based on the fact that:
1. Your connection string works locally ✓
2. The function returns 500 with no response body
3. The function fails in ~9ms (very quickly)

The issue is likely one of these:

## 1. Check if Environment Variable is Set

In Azure Portal:
1. Go to your Function App: `slidebord-erhgcyd4gvckdrc3`
2. Navigate to: **Configuration** → **Application settings**
3. Look for `WEB_PUBSUB_CONNECTION_STRING`
4. **If it's missing**: Click "+ New application setting" and add it
5. **If it exists**: Click on it and verify:
   - No extra quotes around the value
   - No spaces at the beginning or end
   - Matches exactly what worked locally
6. After any changes, click **Save** at the top and wait for the restart

## 2. Check Function Logs for Import Errors

The function might be failing during Python imports. Check:

1. **Function Logs**:
   - Go to: Function App → Functions → negotiate → Monitor
   - Click on a failed invocation
   - Look for any Python import errors or module not found errors

2. **Log Stream** (real-time logs):
   - Go to: Function App → Log stream
   - Trigger the endpoint again
   - Watch for any error messages

3. **Application Insights** (if enabled):
   - Go to: Function App → Application Insights
   - Click "Logs" 
   - Run this query:
   ```
   traces 
   | where timestamp > ago(1h)
   | where message contains "negotiate" or message contains "error"
   | order by timestamp desc
   ```

## 3. Verify Python Dependencies

The `azure-messaging-webpubsubservice` package might not be installed properly:

1. **Check Python Version**:
   - Go to: Function App → Configuration → General settings
   - Verify Python version is 3.8 or higher

2. **Force Rebuild**:
   - Make a small change to `requirements.txt` (add a comment)
   - Redeploy the function
   - This forces Azure to reinstall dependencies

## 4. Test with Minimal Function

To isolate if it's an import issue, temporarily replace your function with this minimal version:

```python
import logging
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Minimal negotiate function called')
    return func.HttpResponse(
        body='{"test": "minimal function works"}',
        status_code=200,
        headers={
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }
    )
```

If this works, gradually add back imports and code to find where it fails.

## 5. Check for SDK Version Issues

Add version logging to your function:

```python
import sys
logging.info(f"Python version: {sys.version}")

try:
    import azure.messaging.webpubsubservice
    logging.info(f"WebPubSub SDK version: {azure.messaging.webpubsubservice.__version__}")
except Exception as e:
    logging.error(f"Failed to import WebPubSub SDK: {e}")
```

## 6. Enable Detailed Diagnostics

Add these Application Settings to get more debug info:
- `PYTHON_ENABLE_DEBUG_LOGGING` = `1`
- `FUNCTIONS_WORKER_PROCESS_COUNT` = `1`
- `PYTHON_ISOLATE_WORKER_DEPENDENCIES` = `1`

## Most Likely Issue

Given that the function fails immediately with no response body, the most likely causes are:

1. **Missing WEB_PUBSUB_CONNECTION_STRING** environment variable
2. **Python package installation failure** - the `azure-messaging-webpubsubservice` isn't installed
3. **Python version mismatch** - the SDK requires Python 3.8+

## Quick Test via Kudu Console

You can also check directly on the server:

1. Go to: `https://slidebord-erhgcyd4gvckdrc3.scm.azurewebsites.net/`
2. Navigate to: Debug console → CMD
3. Check if packages are installed:
   ```
   cd D:\home\site\wwwroot
   python -m pip list
   ```
4. Check environment variables:
   ```
   set WEB_PUBSUB_CONNECTION_STRING
   ```

## Next Steps

1. First check if the environment variable is set correctly
2. If yes, check the logs for import errors
3. If no clear errors, try the minimal function test
4. Share any error messages you find in the logs

The updated function code with diagnostic logging should help pinpoint the exact failure point once deployed.