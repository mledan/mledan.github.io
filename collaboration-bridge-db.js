// Collaboration Bridge for DrawingBoard.js
class CollaborationBridge {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.userId = this.generateUserId();
        this.drawingQueue = [];
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.initialized = false;
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    generateRoomId() {
        return 'room_' + Math.random().toString(36).substr(2, 9);
    }

    initialize(roomId) {
        this.roomId = roomId;
        this.connect();
        this.initialized = true;
    }

    connect() {
        // WebSocket connection to your collaboration server
        // For demo purposes, we'll use a mock connection
        console.log(`Connecting to room: ${this.roomId}`);
        
        // Simulate connection
        setTimeout(() => {
            this.isConnected = true;
            this.onConnect();
        }, 500);
    }

    onConnect() {
        console.log('Connected to collaboration server');
        this.reconnectAttempts = 0;
        
        // Process queued drawings
        while (this.drawingQueue.length > 0) {
            const data = this.drawingQueue.shift();
            this.sendDrawingData(data);
        }
    }

    onDisconnect() {
        console.log('Disconnected from collaboration server');
        this.isConnected = false;
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
        }
    }

    sendDrawingData(data) {
        if (!this.isConnected) {
            this.drawingQueue.push(data);
            return;
        }

        // Send drawing data to other users
        const message = {
            type: 'drawing',
            userId: this.userId,
            roomId: this.roomId,
            data: data,
            timestamp: Date.now()
        };

        // In a real implementation, send via WebSocket
        // this.ws.send(JSON.stringify(message));
        console.log('Sending drawing data:', message);
    }

    onDrawStart(x, y, color, lineWidth) {
        this.currentStroke = {
            action: 'start',
            x: x,
            y: y,
            color: color,
            lineWidth: lineWidth,
            points: [{x, y}]
        };
        
        this.sendDrawingData(this.currentStroke);
    }

    onDrawMove(x, y) {
        if (!this.currentStroke) return;
        
        this.currentStroke.points.push({x, y});
        
        // Send updates periodically to reduce network traffic
        if (this.currentStroke.points.length % 5 === 0) {
            this.sendDrawingData({
                ...this.currentStroke,
                action: 'move',
                x: x,
                y: y
            });
        }
    }

    onDrawEnd(points) {
        if (!this.currentStroke) return;
        
        this.currentStroke.action = 'end';
        this.currentStroke.points = points || this.currentStroke.points;
        
        this.sendDrawingData(this.currentStroke);
        this.currentStroke = null;
    }

    // Handle incoming drawing data from other users
    handleIncomingDrawing(message) {
        if (message.userId === this.userId) return; // Ignore own drawings
        
        if (window.handleRemoteDrawing) {
            window.handleRemoteDrawing(message.data, message.userId);
        }
    }

    // Cursor tracking for real-time collaboration feedback
    sendCursorPosition(x, y) {
        if (!this.isConnected) return;
        
        const message = {
            type: 'cursor',
            userId: this.userId,
            roomId: this.roomId,
            x: x,
            y: y,
            timestamp: Date.now()
        };
        
        // Send cursor position
        // this.ws.send(JSON.stringify(message));
    }

    handleIncomingCursor(message) {
        if (message.userId === this.userId) return;
        
        // Update remote cursor position
        this.updateRemoteCursor(message.userId, message.x, message.y);
    }

    updateRemoteCursor(userId, x, y) {
        let cursor = document.getElementById(`cursor-${userId}`);
        
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = `cursor-${userId}`;
            cursor.className = 'remote-cursor';
            cursor.setAttribute('data-user', userId);
            document.body.appendChild(cursor);
        }
        
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
    }

    // State synchronization
    requestCanvasState() {
        if (!this.isConnected) return;
        
        const message = {
            type: 'requestState',
            userId: this.userId,
            roomId: this.roomId,
            timestamp: Date.now()
        };
        
        // Request current canvas state from other users
        // this.ws.send(JSON.stringify(message));
    }

    sendCanvasState(recipientId) {
        if (!this.isConnected) return;
        
        // Get current canvas as base64
        const canvas = document.querySelector('#main-board canvas');
        if (!canvas) return;
        
        const imageData = canvas.toDataURL('image/png');
        
        const message = {
            type: 'canvasState',
            userId: this.userId,
            recipientId: recipientId,
            roomId: this.roomId,
            imageData: imageData,
            timestamp: Date.now()
        };
        
        // Send canvas state
        // this.ws.send(JSON.stringify(message));
    }

    handleIncomingCanvasState(message) {
        const canvas = document.querySelector('#main-board canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            ctx.drawImage(img, 0, 0);
        };
        
        img.src = message.imageData;
    }

    // Clean up
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        this.isConnected = false;
        this.initialized = false;
        
        // Remove all remote cursors
        document.querySelectorAll('.remote-cursor').forEach(cursor => {
            cursor.remove();
        });
    }
}

// Create global instance
window.collaborationBridge = new CollaborationBridge();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollaborationBridge;
}