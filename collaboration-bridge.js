/**
 * Collaboration Bridge for WebPubSub Integration
 * Handles real-time collaboration without breaking existing functionality
 */

// Simple serialization functions for stroke data
function serialize(strokes) {
    return JSON.stringify(strokes);
}

function deserialize(data) {
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error('Failed to deserialize stroke data:', e);
        return [];
    }
}

class CollaborationBridge {
    constructor() {
        this.client = null;
        this.roomId = null;
        this.userId = null;
        this.username = null;
        this.isConnected = false;
        this.isEnabled = true; // Can be toggled to disable collaboration
        this.pendingUpdates = [];
        this.remoteUsers = new Map();
        this.drawingQueue = [];
        this.drawingBatchTimer = null;
        this.syncInterval = null;
        
        this.isMaster = false; // Is this client the master?
        this.masterId = null;   // The userId of the current master
        this.electionInProgress = false;
        this.electionTimeout = null;

        // Throttle timers for different update types
        this.updateTimers = {
            drawing: null,
            text: null,
            position: null
        };
        
        // Throttle delays (ms)
        this.throttleDelays = {
            drawing: 50,    // Send drawing updates every 50ms max
            text: 500,      // Send text updates every 500ms max
            position: 100   // Send position updates every 100ms max
        };

        // Bind methods
        this.handleGroupMessage = this.handleGroupMessage.bind(this);
        this.handleConnectionEstablished = this.handleConnectionEstablished.bind(this);
        this.handleConnectionLost = this.handleConnectionLost.bind(this);
    }

    /**
     * Initialize collaboration with room details
     */
    async initialize(roomId, username = null) {
        if (!this.isEnabled) return false;
        
        this.roomId = roomId || this.generateRoomId();
        this.userId = this.generateUserId();
        this.username = username || `User_${this.userId.substring(0, 6)}`;
        
        console.log(`[Collaboration] Initializing for room: ${this.roomId}, user: ${this.username}`);
        
        try {
            await this.connect();
            this.setupEventListeners();
            this.startPeriodicSync();
            this.updateUIStatus('connected');
            return true;
        } catch (error) {
            console.error('[Collaboration] Failed to initialize:', error);
            this.updateUIStatus('error');
            return false;
        }
    }

    /**
     * Connect to WebPubSub service
     */
    async connect() {
        // Determine backend URL based on environment
        const isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
        const backendUrl = isLocalhost ? 'http://localhost:7071' : 'https://shmorgasbord.azurewebsites.net';
        
        // Get connection URL from backend
        const negotiateUrl = `${backendUrl}/api/negotiate?room_id=${this.roomId}&username=${this.username}&role=writer`;
        
        try {
            const response = await fetch(negotiateUrl);
            if (!response.ok) {
                throw new Error(`Negotiate failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Use the simple WebPubSub client
            if (typeof WebPubSubClient === 'undefined') {
                throw new Error('WebPubSubClient not loaded');
            }
            
            this.client = new WebPubSubClient(data.url);
            
            // Set up event handlers
            this.client.on('connected', this.handleConnectionEstablished);
            this.client.on('disconnected', this.handleConnectionLost);
            this.client.on('group-message', this.handleGroupMessage);
            
            // Connect
            await this.client.start();
            
            // Join the room group
            await this.client.joinGroup(this.roomId);
            
            this.isConnected = true;
            console.log('[Collaboration] Connected successfully');
            
            // Announce our presence
            this.sendMessage('user_join', {
                username: this.username,
                timestamp: Date.now()
            });
            
            // Request current state from other users
            this.sendMessage('request_state', {});
            
        } catch (error) {
            console.error('[Collaboration] Connection failed:', error);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Handle connection established
     */
    handleConnectionEstablished(e) {
        console.log('[Collaboration] Connection established:', e);
        this.isConnected = true;
        this.processPendingUpdates();
        
        // Start master election
        this.startMasterElection();
    }

    /**
     * Handle connection lost
     */
    handleConnectionLost(e) {
        console.log('[Collaboration] Connection lost:', e);
        this.isConnected = false;
        this.updateUIStatus('disconnected');
        
        // Try to reconnect after a delay
        setTimeout(() => {
            if (!this.isConnected) {
                this.reconnect();
            }
        }, 5000);
    }

    /**
     * Reconnect to service
     */
    async reconnect() {
        console.log('[Collaboration] Attempting to reconnect...');
        try {
            await this.connect();
            this.updateUIStatus('connected');
        } catch (error) {
            console.error('[Collaboration] Reconnection failed:', error);
            // Will retry again after another delay
        }
    }

    /**
     * Master Election Logic
     */
    startMasterElection() {
        if (this.electionInProgress) return;
        
        console.log('[Collaboration] Starting master election...');
        this.electionInProgress = true;
        this.masterId = null; // Unset current master
        
        // Send a request to become master
        this.sendMessage('request_master', { proposedMasterId: this.userId }, true);
        
        // After a timeout, if no one else has claimed master, we become master
        this.electionTimeout = setTimeout(() => {
            if (!this.masterId) {
                console.log('[Collaboration] Election timeout, claiming master');
                this.claimMaster();
            }
        }, 2000 + Math.random() * 1000); // Random delay to prevent race conditions
    }

    claimMaster() {
        this.isMaster = true;
        this.masterId = this.userId;
        this.electionInProgress = false;
        clearTimeout(this.electionTimeout);
        
        console.log('[Collaboration] I am now the master');
        this.sendMessage('announce_master', { masterId: this.userId }, true);
        this.updateUIRole();
        this.toggleFollowerUI(false); // Enable controls for master
    }

    handleMasterRequest(message) {
        // If we think we are master, re-assert our claim
        if (this.isMaster) {
            this.sendMessage('announce_master', { masterId: this.userId }, true);
        } else if (!this.masterId) {
            // If there is no master, and this new user has a lower ID, let them be master
            if (message.data.proposedMasterId < this.userId) {
                // Defer to the other user
                console.log(`[Collaboration] Deferring master to ${message.username}`);
            } else {
                // Our ID is lower, so we should be master
                if (!this.electionInProgress) {
                    this.startMasterElection();
                }
            }
        }
    }

    handleMasterAnnouncement(message) {
        console.log(`[Collaboration] Master announced: ${message.username}`);
        this.masterId = message.data.masterId;
        this.isMaster = this.userId === this.masterId;
        this.electionInProgress = false;
        clearTimeout(this.electionTimeout);
        
        this.updateUIRole();
        this.toggleFollowerUI(!this.isMaster);

        // If we are master, send a full state sync
        if (this.isMaster) {
            this.sendFullState(true);
        }
    }

    handleActivityUpdate(message) {
        const { activity, username } = message.data;
        this.showNotification(`${username} is ${activity}...`, 'activity');
    }

    /**
     * Send message to group
     */
    sendMessage(type, data, immediate = false) {
        if (!this.isEnabled) return;
        
        const message = {
            type,
            userId: this.userId,
            username: this.username,
            roomId: this.roomId,
            timestamp: Date.now(),
            data
        };
        
        if (this.isConnected && !immediate) {
            // Send immediately if connected
            this.client.sendToGroup(this.roomId, message);
        } else if (immediate && this.isConnected) {
            // Send immediately without throttling
            this.client.sendToGroup(this.roomId, message);
        } else {
            // Queue for later if not connected
            this.pendingUpdates.push(message);
        }
    }

    /**
     * Send throttled update
     */
    sendThrottledUpdate(type, data, category) {
        if (!this.isEnabled || !this.isConnected) return;
        
        // Clear existing timer for this category
        if (this.updateTimers[category]) {
            clearTimeout(this.updateTimers[category]);
        }
        
        // Set new timer
        this.updateTimers[category] = setTimeout(() => {
            this.sendMessage(type, data);
            this.updateTimers[category] = null;
        }, this.throttleDelays[category]);
    }

    /**
     * Handle incoming group messages
     */
    handleGroupMessage(e) {
        const message = e.message.data;
        
        // Ignore our own messages
        if (message.userId === this.userId) return;
        
        // The master only sends; it does not process incoming state changes
        if (this.isMaster && message.type.includes('_sync')) return;

        console.log('[Collaboration] Received message:', message.type, message);
        
        switch (message.type) {
            case 'user_join':
                this.handleUserJoin(message);
                break;
            case 'user_leave':
                this.handleUserLeave(message);
                break;
            case 'request_master':
                this.handleMasterRequest(message);
                break;
            case 'announce_master':
                this.handleMasterAnnouncement(message);
                break;
            case 'activity_update':
                this.handleActivityUpdate(message);
                break;
            case 'request_state':
                this.handleStateRequest(message);
                break;
            case 'full_state_sync':
                this.handleStateSync(message.data.panels);
                break;
            case 'draw_stroke':
                this.handleRemoteDrawing(message);
                break;
            case 'cursor_position':
                this.handleRemoteCursor(message);
                break;
        }
    }

    /**
     * Handle user join
     */
    handleUserJoin(message) {
        this.remoteUsers.set(message.userId, {
            username: message.username,
            joinTime: message.timestamp,
            cursor: null
        });
        
        console.log(`[Collaboration] ${message.username} joined the room`);
        this.showNotification(`${message.username} joined`, 'info');
        
        // Send our current state to the new user
        if (window.allTextPanels && window.allTextPanels.length > 0) {
            const state = this.getCurrentState();
            this.sendMessage('state_sync', { state }, true);
        }
    }

    /**
     * Handle user leave
     */
    handleUserLeave(message) {
        const user = this.remoteUsers.get(message.userId);
        if (user) {
            this.remoteUsers.delete(message.userId);
            console.log(`[Collaboration] ${user.username} left the room`);
            this.showNotification(`${user.username} left`, 'info');
            
            // Remove any locks held by this user
            for (const [panelId, lockUserId] of this.remoteLocks.entries()) {
                if (lockUserId === message.userId) {
                    this.remoteLocks.delete(panelId);
                    this.updatePanelLockIndicator(panelId, false);
                }
            }
            
            // If the master left, start a new election
            if (message.userId === this.masterId) {
                console.log('[Collaboration] Master has left. Starting new election.');
                this.showNotification('The master user has left. Electing a new master...', 'warning');
                this.startMasterElection();
            }
        }
    }

    /**
     * Send full state to group
     */
    sendFullState(immediate = false) {
        if (!this.isMaster) return;
        
        const state = this.getComprehensiveState();
        this.sendMessage('full_state_sync', { state }, immediate);
    }

    /**
     * Get comprehensive state of the application
     */
    getComprehensiveState() {
        const cameraState = {
            position: window.camera.position.toArray(),
            rotation: window.camera.rotation.toArray(),
            zoom: window.camera.zoom
        };
        
        const controlState = {
            isAutorotating: window.isAutorotating || false,
            isAutoSliding: window.isAutoSliding || false
        };
        
        // Get panel states from localStorage as a base
        const panelState = JSON.parse(localStorage.getItem('textPanelState') || '[]');
        
        // Ensure drawings are up-to-date
        panelState.forEach((item, index) => {
            if (item.type === 'draw' && window.allTextPanels[index] && window.allTextPanels[index].controlCanvas) {
                item.drawingData = window.allTextPanels[index].controlCanvas.toDataURL();
            }
        });
        
        return {
            camera: cameraState,
            controls: controlState,
            panels: panelState
        };
    }

    /**
     * Apply comprehensive state from master
     */
    applyComprehensiveState(state) {
        if (this.isMaster) return; // Master does not accept state

        // Follower camera is independent, so we do not apply camera/control state from master.

        // Apply panel state (drawings, text, etc.)
        if (state.panels && typeof window.loadState === 'function') {
            window.loadState(JSON.stringify(state.panels));
            this.lastSyncTime = Date.now(); // Record that we have received a state update
        }
    }

    /**
     * Toggle UI for follower mode
     */
    toggleFollowerUI(isFollower) {
        // Elements to disable for followers (anything that changes state)
        const elementsToDisable = [
            ...document.querySelectorAll('#brush-toolbar, #controls')
        ];

        elementsToDisable.forEach(el => {
            el.style.display = isFollower ? 'none' : '';
        });

        if (isFollower) {
            // Turn off autoslide for followers
            if (window.controls) window.controls.enabled = true;
            window.isAutoSliding = false;
            if (window.updateModeIndicator) window.updateModeIndicator();
            this.showNotification('You are in Follower Mode. Drawing state is synced, but your camera is independent.', 'info');
        } else {
            // Restore full UI for master
            const toolbar = document.getElementById('brush-toolbar');
            if (toolbar) toolbar.style.display = '';
        }

        // Remove the old overlay logic
        let overlay = document.getElementById('follower-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Update UI with current role (Master/Follower)
     */
    updateUIRole() {
        let statusEl = document.getElementById('collab-status');
        if (!statusEl) return;
        
        let roleEl = document.getElementById('collab-role');
        if (!roleEl) {
            roleEl = document.createElement('span');
            roleEl.id = 'collab-role';
            roleEl.style.cssText = `
                font-weight: bold;
                margin-left: 10px;
                padding: 2px 6px;
                border-radius: 4px;
            `;
            statusEl.appendChild(roleEl);
        }
        
        if (this.isMaster) {
            roleEl.textContent = 'MASTER';
            roleEl.style.background = '#f59e0b';
        } else {
            roleEl.textContent = 'FOLLOWER';
            roleEl.style.background = '#3b82f6';
        }
    }

    /**
     * Handle state request
     */
    handleStateRequest(message) {
        // Send our current state
        if (window.allTextPanels && window.allTextPanels.length > 0) {
            const state = this.getCurrentState();
            this.sendMessage('state_sync', { state }, true);
        }
    }

    /**
     * Handle state sync
     */
    handleStateSync(message) {
        const { state } = message.data;
        if (state && typeof window.applyStateUpdate === 'function') {
            console.log('[Collaboration] Applying state update from master');
            window.applyStateUpdate(state);
            this.lastSyncTime = Date.now();
        } else if (state && typeof window.loadState === 'function') {
            // Fallback for initial load or panel count mismatch
            console.log('[Collaboration] Performing full state load');
            window.loadState(JSON.stringify(state));
        }
    }

    /**
     * Handle remote drawing
     */
    handleRemoteDrawing(message) {
        const { drawData } = message.data;
        const { userId } = message;
        if (Array.isArray(drawData)) {
            drawData.forEach(action => {
                if (action.data) {
                    const strokes = deserialize(action.data);
                    strokes.forEach(stroke => {
                        action.points = stroke.points;
                        action.color = stroke.properties.color;
                        action.lineWidth = stroke.properties.lineWidth;
                        if (window.drawingApp) {
                            window.drawingApp.handleRemoteDrawing(action, userId);
                        }
                    });
                } else {
                    if (window.drawingApp) {
                        window.drawingApp.handleRemoteDrawing(action, userId);
                    }
                }
            });
        } else {
            if (drawData.data) {
                const strokes = deserialize(drawData.data);
                strokes.forEach(stroke => {
                    drawData.points = stroke.points;
                    drawData.color = stroke.properties.color;
                    drawData.lineWidth = stroke.properties.lineWidth;
                    if (window.drawingApp) {
                        window.drawingApp.handleRemoteDrawing(drawData, userId);
                    }
                });
            } else {
                if (window.drawingApp) {
                    window.drawingApp.handleRemoteDrawing(drawData, userId);
                }
            }
        }
    }



    /**
     * Handle remote cursor position
     */
    handleRemoteCursor(message) {
        const user = this.remoteUsers.get(message.userId);
        if (user) {
            user.cursor = message.data;
            this.updateRemoteCursor(message.userId, message.username, message.data);
        }
    }

    /**
     * Setup event listeners for local changes
     */
    setupEventListeners() {
        // Override saveState to broadcast changes
        const originalSaveState = window.saveState;
        window.saveState = () => {
            originalSaveState();
            
            // Broadcast state change if connected
            if (this.isConnected) {
                const state = this.getCurrentState();
                this.sendThrottledUpdate('state_sync', { state }, 'position');
            }
        };

        // Listen for drawing events (will be hooked in separately)
        window.collaborationBridge = this;
    }

    /**
     * Hook into drawing start
     */
    onDrawStart(x, y, color, lineWidth) {
        if (!this.isEnabled || !this.isConnected) return;
        
        this.drawingQueue.push({ action: 'start', x, y, color, lineWidth });
        this.startBatchTimer();
    }

    /**
     * Hook into drawing move
     */
    onDrawMove(x, y) {
        if (!this.isEnabled || !this.isConnected) return;
        
        this.drawingQueue.push({ action: 'move', x, y });
        this.startBatchTimer();
    }

    /**
     * Hook into drawing end
     */
    onDrawEnd(points) {
        if (!this.isEnabled || !this.isConnected) return;

        const binaryData = serialize([{ points: points, properties: { color: '#000000', lineWidth: 2 } }]);

        this.drawingQueue.push({ action: 'end', data: binaryData });
        this.startBatchTimer();
    }

    startBatchTimer() {
        if (!this.drawingBatchTimer) {
            this.drawingBatchTimer = setTimeout(() => {
                if (this.drawingQueue.length > 0) {
                    this.sendMessage('draw_stroke', { drawData: this.drawingQueue });
                    this.drawingQueue = [];
                }
                this.drawingBatchTimer = null;
            }, 100);
        }
    }


    /**
     * Get current state
     */
    getCurrentState() {
        // Get state from localStorage (already saved by saveState)
        const stateStr = localStorage.getItem('textPanelState');
        return stateStr ? JSON.parse(stateStr) : [];
    }

    /**
     * Capture local drawings for merge
     */
    captureLocalDrawings() {
        const drawings = new Map();
        
        if (window.allTextPanels) {
            window.allTextPanels.forEach((item, index) => {
                if (item.type === 'draw' && item.controlCanvas) {
                    drawings.set(index, item.controlCanvas.toDataURL());
                }
            });
        }
        
        return drawings;
    }

    /**
     * Merge local drawings after state sync
     */
    mergeLocalDrawings(localDrawings) {
        // This would implement a more sophisticated merge strategy if needed
        // For now, remote state takes precedence
    }

    /**
     * Process pending updates
     */
    processPendingUpdates() {
        if (this.pendingUpdates.length > 0) {
            console.log(`[Collaboration] Processing ${this.pendingUpdates.length} pending updates`);
            
            this.pendingUpdates.forEach(message => {
                this.client.sendToGroup(this.roomId, message);
            });
            
            this.pendingUpdates = [];
        }
    }

    /**
     * Start periodic state sync
     */
    startPeriodicSync() {
        // Sync every 2 seconds for master, 30 seconds for followers
        const syncInterval = this.isMaster ? 2000 : 30000;
        
        this.syncInterval = setInterval(() => {
            if (this.isConnected) {
                if (this.isMaster) {
                    this.sendFullState();
                } else {
                    // Followers can request a state sync if they haven't received one
                    if (Date.now() - this.lastSyncTime > 60000) {
                        this.sendMessage('request_state', {});
                    }
                }
            }
        }, syncInterval);
    }

    /**
     * Update UI status indicator
     */
    updateUIStatus(status) {
        // Create or update status indicator
        let statusEl = document.getElementById('collab-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'collab-status';
            statusEl.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                cursor: pointer;
            `;
            document.body.appendChild(statusEl);
            
            // Click to show collaboration info
            statusEl.addEventListener('click', () => this.showCollaborationInfo());
        }
        
        const indicators = {
            connected: { color: '#4ade80', text: '● Connected', title: 'Collaboration active' },
            disconnected: { color: '#f87171', text: '● Disconnected', title: 'Working offline' },
            connecting: { color: '#fbbf24', text: '● Connecting...', title: 'Establishing connection' },
            error: { color: '#f87171', text: '● Error', title: 'Connection failed' }
        };
        
        const indicator = indicators[status] || indicators.disconnected;
        statusEl.innerHTML = `<span style="color: ${indicator.color};">${indicator.text}</span>`;
        statusEl.title = indicator.title;
        
        // Add room info if connected
        if (status === 'connected' && this.roomId) {
            statusEl.innerHTML += `<span style="font-size: 10px; opacity: 0.7;">Room: ${this.roomId.substring(0, 8)}</span>`;
        }
    }

    /**
     * Update panel lock indicator
     */
    updatePanelLockIndicator(panelIndex, isLocked, username = null) {
        // This would add visual indicators on locked panels
        // For now, just log it
        if (isLocked) {
            console.log(`[Collaboration] Panel ${panelIndex} locked by ${username}`);
        } else {
            console.log(`[Collaboration] Panel ${panelIndex} unlocked`);
        }
    }

    /**
     * Update remote cursor display
     */
    updateRemoteCursor(userId, username, cursorData) {
        // This would show remote user cursors
        // Implementation depends on UI requirements
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            animation: slideIn 0.3s ease;
            z-index: 10001;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Show collaboration info modal
     */
    showCollaborationInfo() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 10002;
            min-width: 300px;
        `;
        
        const users = Array.from(this.remoteUsers.values());
        modal.innerHTML = `
            <h3>Collaboration Info</h3>
            <p>Room: ${this.roomId}</p>
            <p>Your name: ${this.username}</p>
            <p>Status: ${this.isConnected ? 'Connected' : 'Disconnected'}</p>
            <p>Users in room: ${users.length + 1}</p>
            <ul>
                <li>You (${this.username})</li>
                ${users.map(u => `<li>${u.username}</li>`).join('')}
            </ul>
            <button onclick="this.parentElement.remove()" style="
                background: #3b82f6;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 10px;
            ">Close</button>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Generate room ID
     */
    generateRoomId() {
        // Extract from URL or generate new
        const urlParams = new URLSearchParams(window.location.search);
        const roomFromUrl = urlParams.get('room');
        
        if (roomFromUrl) {
            return roomFromUrl;
        }
        
        // Generate random room ID
        return 'room-' + Math.random().toString(36).substring(2, 10);
    }

    /**
     * Generate user ID
     */
    generateUserId() {
        // Try to get from localStorage for persistence
        let userId = localStorage.getItem('collab-user-id');
        if (!userId) {
            userId = 'user-' + Math.random().toString(36).substring(2, 10);
            localStorage.setItem('collab-user-id', userId);
        }
        return userId;
    }

    /**
     * Cleanup on disconnect
     */
    disconnect() {
        if (this.client) {
            this.sendMessage('user_leave', {});
            this.client.stop();
            this.client = null;
        }
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        this.isConnected = false;
        this.updateUIStatus('disconnected');
    }

    /**
     * Toggle collaboration on/off
     */
    toggle() {
        this.isEnabled = !this.isEnabled;
        
        if (this.isEnabled) {
            this.initialize(this.roomId, this.username);
        } else {
            this.disconnect();
        }
        
        return this.isEnabled;
    }
}

// Create global instance
window.collaborationBridge = new CollaborationBridge();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('[Collaboration Bridge] Module loaded. Use window.collaborationBridge.initialize(roomId, username) to start.');