/**
 * Simple WebPubSub Client using standard WebSocket
 * Based on Azure Web PubSub documentation
 */

class SimpleWebPubSubClient {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.connected = false;
        this.eventHandlers = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }

    // Event handling
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    // Connect to WebPubSub service
    async start() {
        return new Promise((resolve, reject) => {
            try {
                console.log('[SimpleWebPubSub] Connecting to:', this.url.substring(0, 50) + '...');
                
                this.ws = new WebSocket(this.url, 'json.webpubsub.azure.v1');
                
                this.ws.onopen = () => {
                    console.log('[SimpleWebPubSub] Connected successfully');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    this.emit('connected', { connectionId: 'websocket-' + Date.now() });
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        console.log('[SimpleWebPubSub] Received message:', message);
                        
                        // Handle different message types
                        if (message.type === 'system') {
                            this.handleSystemMessage(message);
                        } else if (message.type === 'message' && message.from === 'group') {
                            this.emit('group-message', { 
                                message: { 
                                    group: message.group,
                                    data: message.data 
                                }
                            });
                        } else {
                            this.emit('server-message', { message });
                        }
                    } catch (error) {
                        console.error('[SimpleWebPubSub] Error parsing message:', error);
                        // Try to emit raw message
                        this.emit('message', { data: event.data });
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('[SimpleWebPubSub] WebSocket error:', error);
                    this.emit('error', error);
                };

                this.ws.onclose = (event) => {
                    console.log('[SimpleWebPubSub] Connection closed:', event.code, event.reason);
                    this.connected = false;
                    this.emit('disconnected', { 
                        code: event.code, 
                        reason: event.reason 
                    });
                    
                    // Auto-reconnect if not a normal closure
                    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.attemptReconnect();
                    }
                };

                // Set a timeout for connection
                setTimeout(() => {
                    if (!this.connected) {
                        this.ws.close();
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);

            } catch (error) {
                console.error('[SimpleWebPubSub] Failed to create WebSocket:', error);
                reject(error);
            }
        });
    }

    // Handle system messages
    handleSystemMessage(message) {
        if (message.event === 'connected') {
            console.log('[SimpleWebPubSub] System: Connected with ID:', message.connectionId);
            this.connectionId = message.connectionId;
        }
    }

    // Reconnection logic
    attemptReconnect() {
        this.reconnectAttempts++;
        console.log(`[SimpleWebPubSub] Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(() => {
            this.start().catch(error => {
                console.error('[SimpleWebPubSub] Reconnection failed:', error);
            });
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    // Send message to a group
    async sendToGroup(groupName, data) {
        if (!this.connected || !this.ws) {
            throw new Error('Not connected');
        }

        const message = {
            type: 'sendToGroup',
            group: groupName,
            dataType: 'json',
            data: data
        };

        console.log('[SimpleWebPubSub] Sending to group:', groupName, data);
        this.ws.send(JSON.stringify(message));
    }

    // Join a group
    async joinGroup(groupName) {
        if (!this.connected || !this.ws) {
            throw new Error('Not connected');
        }

        const message = {
            type: 'joinGroup',
            group: groupName
        };

        console.log('[SimpleWebPubSub] Joining group:', groupName);
        this.ws.send(JSON.stringify(message));
    }

    // Leave a group
    async leaveGroup(groupName) {
        if (!this.connected || !this.ws) {
            throw new Error('Not connected');
        }

        const message = {
            type: 'leaveGroup',
            group: groupName
        };

        console.log('[SimpleWebPubSub] Leaving group:', groupName);
        this.ws.send(JSON.stringify(message));
    }

    // Stop the connection
    stop() {
        if (this.ws) {
            console.log('[SimpleWebPubSub] Closing connection...');
            this.connected = false;
            this.ws.close(1000, 'Client closing');
            this.ws = null;
            this.emit('stopped');
        }
    }

    // Check if connected
    isConnected() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

// Make it available globally with same interface as Azure client
window.WebPubSubClient = SimpleWebPubSubClient;

// For compatibility
window.azure = window.azure || {};
window.azure.webPubSubClient = window.azure.webPubSubClient || {};
window.azure.webPubSubClient.WebPubSubClient = SimpleWebPubSubClient;

console.log('[SimpleWebPubSub] Client loaded and available as window.WebPubSubClient');

// Dispatch event to signal readiness
window.dispatchEvent(new Event('webpubsub-ready'));