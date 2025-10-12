/**
 * Excalidraw Integration with WebPubSub Collaboration
 * Replaces the custom Three.js drawing system while preserving all collaboration features
 */

class ExcalidrawCollaborationBridge {
    constructor() {
        this.excalidrawAPI = null;
        this.collaborationBridge = null;
        this.roomId = null;
        this.isInitialized = false;
        this.lastSyncTime = 0;
        this.syncThrottle = 100; // ms
    }

    async initialize() {
        try {
            // Wait for Excalidraw to be available
            if (typeof Excalidraw === 'undefined') {
                console.error('Excalidraw not loaded');
                return false;
            }

            // Initialize Excalidraw
            const container = document.getElementById('excalidraw-container');
            if (!container) {
                console.error('Excalidraw container not found');
                return false;
            }

            // Create Excalidraw instance
            const { Excalidraw } = window;
            this.excalidrawAPI = Excalidraw.Excalidraw;
            
            // Initialize with collaboration support
            const excalidrawElement = document.createElement('div');
            excalidrawElement.style.width = '100%';
            excalidrawElement.style.height = '100%';
            container.appendChild(excalidrawElement);

            // Initialize Excalidraw with proper API
            const { Excalidraw } = window;
            this.excalidrawAPI = Excalidraw.Excalidraw;
            
            // Create the Excalidraw component
            const excalidrawComponent = new Excalidraw.Excalidraw({
                target: excalidrawElement,
                props: {
                    onChange: this.handleExcalidrawChange.bind(this),
                    isCollaborating: true,
                    UIOptions: {
                        canvasActions: {
                            loadScene: false,
                            saveToActiveFile: false,
                            export: true,
                            toggleTheme: true
                        }
                    }
                }
            });

            // Store the component for API access
            this.excalidrawComponent = excalidrawComponent;

            // Initialize collaboration bridge
            this.collaborationBridge = window.collaborationBridge;
            if (this.collaborationBridge) {
                this.setupCollaborationHooks();
            }

            // Setup room controls
            this.setupRoomControls();

            this.isInitialized = true;
            console.log('[Excalidraw] Initialized successfully');
            return true;

        } catch (error) {
            console.error('[Excalidraw] Initialization failed:', error);
            return false;
        }
    }

    setupCollaborationHooks() {
        // Hook into the existing collaboration bridge
        const originalSendMessage = this.collaborationBridge.sendMessage.bind(this.collaborationBridge);
        
        // Override to handle Excalidraw-specific messages
        this.collaborationBridge.sendMessage = (type, data, immediate = false) => {
            if (type === 'excalidraw_sync') {
                // Handle Excalidraw sync messages
                this.handleExcalidrawSync(data);
            } else {
                // Pass through other messages
                originalSendMessage(type, data, immediate);
            }
        };

        // Hook into the message handler
        const originalHandleGroupMessage = this.collaborationBridge.handleGroupMessage.bind(this.collaborationBridge);
        this.collaborationBridge.handleGroupMessage = (e) => {
            const message = e.message.data;
            
            if (message.type === 'excalidraw_sync') {
                this.handleRemoteExcalidrawSync(message);
            } else {
                // Pass through other messages
                originalHandleGroupMessage(e);
            }
        };
    }

    handleExcalidrawChange(elements, appState) {
        if (!this.collaborationBridge || !this.collaborationBridge.isConnected) {
            return;
        }

        // Throttle sync messages
        const now = Date.now();
        if (now - this.lastSyncTime < this.syncThrottle) {
            return;
        }
        this.lastSyncTime = now;

        // Send sync message to other collaborators
        this.collaborationBridge.sendMessage('excalidraw_sync', {
            elements: elements,
            appState: appState,
            timestamp: now
        });
    }

    handleCollaborationChange(pointer, button, pointersMap) {
        // Handle cursor/pointer collaboration
        if (this.collaborationBridge && this.collaborationBridge.isConnected) {
            this.collaborationBridge.sendMessage('cursor_position', {
                pointer: pointer,
                button: button,
                pointersMap: pointersMap
            });
        }
    }

    handleRemoteExcalidrawSync(message) {
        if (!this.excalidrawComponent || message.userId === this.collaborationBridge.userId) {
            return; // Ignore our own messages
        }

        try {
            // Update Excalidraw with remote changes
            this.excalidrawComponent.$set({
                elements: message.data.elements,
                appState: message.data.appState
            });
        } catch (error) {
            console.error('[Excalidraw] Failed to sync remote changes:', error);
        }
    }

    setupRoomControls() {
        const roomIdInput = document.getElementById('room-id');
        const joinRoomBtn = document.getElementById('join-room');
        const createRoomBtn = document.getElementById('create-room');
        const copyLinkBtn = document.getElementById('copy-link');

        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', () => {
                const roomId = roomIdInput.value.trim();
                if (roomId) {
                    this.joinRoom(roomId);
                }
            });
        }

        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => {
                const roomId = this.generateRoomId();
                roomIdInput.value = roomId;
                this.joinRoom(roomId);
            });
        }

        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => {
                this.copyRoomLink();
            });
        }
    }

    async joinRoom(roomId) {
        this.roomId = roomId;
        
        if (this.collaborationBridge) {
            const success = await this.collaborationBridge.initialize(roomId);
            if (success) {
                console.log(`[Excalidraw] Joined room: ${roomId}`);
                this.updateRoomUI(true);
            } else {
                console.error(`[Excalidraw] Failed to join room: ${roomId}`);
            }
        }
    }

    generateRoomId() {
        return 'room-' + Math.random().toString(36).substring(2, 10);
    }

    copyRoomLink() {
        if (this.roomId) {
            const url = `${window.location.origin}${window.location.pathname}?room=${this.roomId}`;
            navigator.clipboard.writeText(url).then(() => {
                console.log('[Excalidraw] Room link copied to clipboard');
                // Show notification
                if (this.collaborationBridge) {
                    this.collaborationBridge.showNotification('Room link copied!', 'info');
                }
            }).catch(err => {
                console.error('[Excalidraw] Failed to copy room link:', err);
            });
        }
    }

    updateRoomUI(isConnected) {
        const roomControls = document.getElementById('room-controls');
        if (roomControls) {
            roomControls.style.display = isConnected ? 'none' : 'block';
        }
    }

    // Export current drawing
    exportDrawing() {
        if (this.excalidrawComponent) {
            const elements = this.excalidrawComponent.elements || [];
            const appState = this.excalidrawComponent.appState || {};
            
            return {
                elements: elements,
                appState: appState,
                timestamp: Date.now()
            };
        }
        return null;
    }

    // Import drawing
    importDrawing(drawingData) {
        if (this.excalidrawComponent && drawingData) {
            this.excalidrawComponent.$set({
                elements: drawingData.elements || [],
                appState: drawingData.appState || {}
            });
        }
    }

    // Clear canvas
    clearCanvas() {
        if (this.excalidrawComponent) {
            this.excalidrawComponent.$set({
                elements: [],
                appState: this.excalidrawComponent.appState || {}
            });
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Excalidraw to load
    const checkExcalidraw = setInterval(() => {
        if (typeof Excalidraw !== 'undefined') {
            clearInterval(checkExcalidraw);
            
            // Initialize the integration
            window.excalidrawBridge = new ExcalidrawCollaborationBridge();
            const success = await window.excalidrawBridge.initialize();
            
            if (success) {
                console.log('[Excalidraw] Integration ready');
            } else {
                console.error('[Excalidraw] Integration failed');
            }
        }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
        clearInterval(checkExcalidraw);
        if (typeof Excalidraw === 'undefined') {
            console.error('[Excalidraw] Failed to load Excalidraw library');
        }
    }, 10000);
});

// Global functions for compatibility with existing code
window.exportDrawing = () => {
    if (window.excalidrawBridge) {
        return window.excalidrawBridge.exportDrawing();
    }
    return null;
};

window.importDrawing = (drawingData) => {
    if (window.excalidrawBridge) {
        window.excalidrawBridge.importDrawing(drawingData);
    }
};

window.clearCanvas = () => {
    if (window.excalidrawBridge) {
        window.excalidrawBridge.clearCanvas();
    }
};

console.log('[Excalidraw Integration] Script loaded');
