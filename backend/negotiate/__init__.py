import logging
import azure.functions as func
import json


def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Negotiate endpoint called')

    # Basic hello world response
    response_data = {
        "message": "Hello World from negotiate endpoint!",
        "status": "success",
        "endpoint": "negotiate",
        "description": "This is a placeholder for Azure PubSub negotiation"
    }

    return func.HttpResponse(
        json.dumps(response_data),
        status_code=200,
        headers={
            "Content-Type": "application/json"
        }
    )