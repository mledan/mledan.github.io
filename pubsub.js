// Globals for Web PubSub (exposed as needed via window)
let pubsubClient;
let roomId;
let username;
let userRole;
let isWriter = false;

// Parse URL for room_id (supports SPA fallback via ?room=)
function parseRoomId() {
    const path = window.location.pathname.substring(1).toLowerCase();
    if (path && path !== 'index.html' && path !== '404.html') {
        return path;
    }
    const params = new URLSearchParams(window.location.search);
    const qp = (params.get('room') || params.get('r') || params.get('p') || '').toLowerCase();
    return qp || 'default';
}

// Load username/role from localStorage or prompt
function loadUserInfo() {
    username = localStorage.getItem('username');
    userRole = localStorage.getItem('role');
    if (!username || !userRole) {
        username = prompt('Enter your username:');
        userRole = prompt('Enter role (writer or reader):').toLowerCase();
        if (username && (userRole === 'writer' || userRole === 'reader')) {
            localStorage.setItem('username', username);
            localStorage.setItem('role', userRole);
        } else {
            alert('Invalid input. Refresh to try again.');
            return false;
        }
    }
    isWriter = userRole === 'writer';
    // Disable editing if reader
    if (!isWriter) {
        document.querySelectorAll('canvas[id^="draw-"], textarea[id^="text-"], button[id^="add-"], button[id^="draw3d-"]').forEach(el => el.disabled = true);
    }
    return true;
}

// Connect to Web PubSub
async function connectPubSub() {
    // Check if we're in local development mode
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('.local');
    
    // Use localhost for testing if running locally, otherwise use Azure
    const NEGOTIATE_BASE = window.NEGOTIATE_BASE_URL || 
                          (isLocalhost ? 'http://localhost:7071' : 'https://shmorgasbord.azurewebsites.net');
    
    console.log(`Using negotiate base: ${NEGOTIATE_BASE}`);
    const negotiateUrl = `${NEGOTIATE_BASE}/api/negotiate?room_id=${roomId}&username=${username}&role=${userRole}`;
    let url;
    const response = await fetch(negotiateUrl, { method: 'GET' });
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Negotiate failed: ${response.status} ${response.statusText} ${text}`);
    }
    try {
        const data = await response.json();
        url = data.url;
    } catch (e) {
        const text = await response.text().catch(() => '');
        throw new Error(`Negotiate returned non-JSON: ${text}`);
    }
    if (!url) {
        throw new Error('Negotiate response missing url');
    }

    // The stable version uses window.WebPubSubClient from the global scope
    pubsubClient = new window.WebPubSubClient(url);
    await pubsubClient.start();

    // Join room group
    await pubsubClient.joinGroup(roomId);

    // Handle incoming messages
    pubsubClient.on("group-message", (e) => {
        if (e.message.data.type === 'join') {
            console.log(`${e.message.data.username} joined`);
            // Send current state if writer
            if (isWriter) sendFullState();
        } else if (e.message.data.type === 'request_state') {
            if (isWriter) sendFullState();
        } else if (e.message.data.type === 'full_state') {
            applyFullState(e.message.data.state);
        } else if (e.message.data.type === 'draw_line') {
            applyDrawLine(e.message.data);
        } else if (e.message.data.type === 'text_update') {
            applyTextUpdate(e.message.data);
        } // Add more for positions, etc.
    });

    // Announce join and request state
    pubsubClient.sendToGroup(roomId, { type: 'join', username });
    pubsubClient.sendToGroup(roomId, { type: 'request_state' });
}

// Send full state (on request)
function sendFullState() {
    const stateStr = localStorage.getItem('textPanelState');
    if (!stateStr) {
        console.log('No state to send');
        return;
    }
    const state = JSON.parse(stateStr);  // From your saveState()
    pubsubClient.sendToGroup(roomId, { type: 'full_state', state });
}

// Apply full state from message
function applyFullState(state) {
    if (!state || !Array.isArray(state)) {
        console.log('Invalid or empty state received');
        return;
    }
    
    // Check if loadState function is available
    if (typeof window.loadState !== 'function') {
        console.log('loadState function not available yet');
        // Try again after a delay
        setTimeout(() => {
            if (typeof window.loadState === 'function') {
                window.loadState(JSON.stringify(state));
            }
        }, 1000);
        return;
    }
    
    // loadState expects a JSON string
    window.loadState(JSON.stringify(state));  // Your existing loadState()
}

// Apply draw line from message
function applyDrawLine(data) {
    // Find panel by data.panelIndex
    const textItem = window.allTextPanels[data.panelIndex];
    const ctx = textItem.panel.userData.textureData.ctx;  // Or controlCanvas
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;
    ctx.beginPath();
    ctx.moveTo(data.x1, data.y1);
    ctx.lineTo(data.x2, data.y2);
    ctx.stroke();
    textItem.panel.material.map.needsUpdate = true;
    // Update control canvas if needed
}

// Apply text update from message
function applyTextUpdate(data) {
    const textItem = window.allTextPanels[data.panelIndex];
    if (!textItem) return;
    textItem.text = data.text;
    textItem.panel.userData.messageFunc = () => textItem.text;
    updateTextPanel(textItem);
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
    roomId = parseRoomId();
    if (loadUserInfo()) {
        connectPubSub().catch(err => {
            console.error('Failed to connect to PubSub:', err);
            // Show user-friendly error message
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#ff6b6b;color:white;padding:10px 20px;border-radius:5px;z-index:10000';
            errorDiv.textContent = 'Connection failed. Working in offline mode.';
            document.body.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        });
    }
});

// Expose functions for the main script to use (e.g., for sending updates)
window.isWriter = function() {
    return isWriter;
};

window.sendFullState = function() {
    if (isWriter && pubsubClient) {
        sendFullState();
    }
};

window.sendDrawLine = function(panelIndex, x1, y1, x2, y2, color, lineWidth) {
    if (isWriter && pubsubClient) {
        pubsubClient.sendToGroup(roomId, { type: 'draw_line', panelIndex, x1, y1, x2, y2, color, lineWidth });
    }
};

window.sendTextUpdate = function(panelIndex, text) {
    if (isWriter && pubsubClient) {
        pubsubClient.sendToGroup(roomId, { type: 'text_update', panelIndex, text });
    }
};