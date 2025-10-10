import azure.functions as func
import logging

def main(req: func.HttpRequest, connectionInfo) -> func.HttpResponse:
    """
    Negotiate function that returns SignalR connection information.
    This is required for clients to connect to Azure SignalR Service.
    """
    logging.info('Negotiate function processed a request.')
    
    # The connectionInfo binding automatically generates the connection info
    # including URL and access token based on the SignalR connection string
    return func.HttpResponse(
        body=connectionInfo,
        status_code=200,
        headers={
            'Content-Type': 'application/json'
        }
    )