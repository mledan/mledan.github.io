import azure.functions as func
import datetime
import json
import logging

def main(myTimer: func.TimerRequest, signalRMessages: func.Out[str]) -> None:
    """
    Timer-triggered function that broadcasts messages every 5 seconds.
    Useful for testing pub/sub functionality.
    """
    current_time = datetime.datetime.utcnow().isoformat()
    
    logging.info(f'Broadcast function executed at {current_time}')
    
    # Create message to broadcast
    message = {
        'target': 'newMessage',  # Method name that clients listen to
        'arguments': [{
            'type': 'broadcast',
            'message': f'Server time: {current_time}',
            'timestamp': current_time
        }]
    }
    
    # Send to all connected clients
    signalRMessages.set(json.dumps(message))
    
    logging.info(f'Broadcasted message to all clients')