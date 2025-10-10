import azure.functions as func
import json
import logging

def main(req: func.HttpRequest, signalRMessages: func.Out[str]) -> func.HttpResponse:
    """
    HTTP-triggered function to send messages to SignalR clients.
    POST /api/messages with JSON body: {"message": "Hello", "userId": "optional"}
    """
    logging.info('Send message function processed a request.')
    
    try:
        # Parse request body
        req_body = req.get_json()
        message_text = req_body.get('message', 'Hello from Azure Functions!')
        user_id = req_body.get('userId')  # Optional: send to specific user
        
    except ValueError:
        return func.HttpResponse(
            "Invalid JSON in request body",
            status_code=400
        )
    
    # Create SignalR message
    message = {
        'target': 'newMessage',  # Method name that clients listen to
        'arguments': [{
            'type': 'user-message',
            'message': message_text,
            'timestamp': func.datetime.utcnow().isoformat()
        }]
    }
    
    # Add userId to send to specific user (optional)
    if user_id:
        message['userId'] = user_id
        logging.info(f'Sending message to user: {user_id}')
    else:
        logging.info('Broadcasting message to all users')
    
    # Send message
    signalRMessages.set(json.dumps(message))
    
    return func.HttpResponse(
        json.dumps({
            'status': 'Message sent',
            'message': message_text,
            'userId': user_id
        }),
        status_code=200,
        headers={
            'Content-Type': 'application/json'
        }
    )