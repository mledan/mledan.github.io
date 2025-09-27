const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files from the current directory
app.use(express.static(__dirname));

// In-memory message storage
let messages = [];

io.on('connection', (socket) => {
    console.log('User connected');

    // Send existing messages to new clients
    socket.emit('initMessages', messages);

    // Handle new message
    socket.on('updateMessage', (message) => {
        const existingIndex = messages.findIndex(m => m.id === message.id);
        if (existingIndex !== -1) {
            // Update existing message
            messages[existingIndex] = message;
        } else {
            // Add new message
            messages.push(message);
        }
        // Broadcast to all clients
        io.emit('messageUpdated', message);
    });

    // Handle message deletion
    socket.on('deleteMessage', (messageId) => {
        messages = messages.filter(m => m.id !== messageId);
        io.emit('messageDeleted', messageId);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
