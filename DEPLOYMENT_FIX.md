# Azure Function Deployment Fix

## Issue
The Azure Function deployment is failing with a "sync trigger" error, indicating that the function app content may be malformed.

## Changes Made

1. **Fixed GitHub Workflow** (`/.github/workflows/master_slidebord.yml`):
   - Fixed corrupted YAML syntax
   - Added exclusion for `__pycache__` and `.pyc` files in the zip command
   - Added validation step to check function structure before deployment

2. **Updated `.funcignore`** (`/back/.funcignore`):
   - Added more Python-specific exclusions to prevent deployment of unnecessary files
   - Added `*.pyc`, `__pycache__/`, and other Python build artifacts

3. **Removed cached files**:
   - Deleted `__pycache__` directory from the negotiate function

4. **Added validation script** (`/validate_function.py`):
   - Script to validate Azure Function structure before deployment
   - Checks for required files: host.json, requirements.txt, function.json, __init__.py

## Potential Issues to Check

1. **Azure App Settings**:
   Make sure the following app settings are configured in your Azure Function App:
   - `WEB_PUBSUB_CONNECTION_STRING`: Your Azure Web PubSub connection string
   - `WEB_PUBSUB_HUB`: The hub name (default: "default")
   - `WEBSITE_RUN_FROM_PACKAGE`: Should be set to "1" for zip deployment

2. **Python Version**:
   The workflow uses Python 3.12. Ensure your Azure Function App is configured for Python 3.12.

3. **Function App Platform**:
   Ensure the Function App is configured for:
   - Linux (not Windows)
   - Python 3.12
   - Consumption plan (as detected in your logs)

## Manual Troubleshooting Steps

If the deployment still fails:

1. **Check Function App logs in Azure Portal**:
   ```
   Function App > Functions > Monitor > Logs
   ```

2. **Manually restart the Function App**:
   ```
   az functionapp restart --name slidebord --resource-group <your-resource-group>
   ```

3. **Check the deployed package**:
   ```
   az functionapp deployment source config-zip --resource-group <your-resource-group> --name slidebord --src release.zip
   ```

4. **Validate app settings**:
   ```
   az functionapp config appsettings list --name slidebord --resource-group <your-resource-group>
   ```

## Next Steps

1. Commit and push these changes to trigger a new deployment
2. Monitor the GitHub Actions workflow for any errors
3. If deployment succeeds but function doesn't work, check the Function App logs in Azure Portal