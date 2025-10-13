# Excalidraw Collaboration App

A React-based infinite canvas drawing app with real-time collaboration powered by Azure WebPubSub/SignalR.

## Features

- 🎨 **Infinite Canvas Drawing** - Powered by Excalidraw
- 🤝 **Real-time Collaboration** - Multiple users can draw together
- 🏠 **Room-based Sessions** - Join or create drawing rooms
- 👥 **User Presence** - See who's in your room
- 🎯 **Master/Follower System** - Coordinated collaboration
- 📱 **Responsive Design** - Works on desktop and mobile

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

## How to Use

1. **Create or Join a Room**
   - Click "Create Room" to generate a new room ID
   - Or enter an existing room ID and click "Join Room"

2. **Start Drawing**
   - Use Excalidraw's tools to draw, add shapes, text, etc.
   - Changes sync in real-time with other users

3. **Collaborate**
   - Share room links with others
   - See who's currently in the room
   - Master user controls the drawing state

## Architecture

- **Frontend**: React + Vite with custom Canvas-based whiteboard
- **Line Drawing**: Custom implementation of [Krzysztof Zabłocki's smooth line drawing algorithm](https://www.merowing.info/drawing-smooth-lines-with-cocos2d-ios-inspired-by-paper/)
- **Collaboration**: Azure WebPubSub/SignalR with real-time stroke synchronization
- **Backend**: Azure Functions (existing)

## Smooth Line Drawing Algorithm

This app implements a sophisticated line drawing algorithm that creates smooth, natural-looking strokes:

- **Quadratic Bezier Smoothing**: Raw input points are smoothed using quadratic Bezier curves with midpoints
- **Speed-Based Width Variation**: Line thickness dynamically adjusts based on drawing velocity for a natural feel
- **Anti-Aliasing**: Custom overdraw with gradient fading for professional-looking edges
- **Circular End Caps**: Smooth rounded stroke endings

See [SMOOTH_DRAWING_IMPLEMENTATION.md](./SMOOTH_DRAWING_IMPLEMENTATION.md) for detailed technical documentation.

## Files Structure

```
src/
├── components/          # React components
│   ├── RoomControls.jsx
│   ├── CollaborationStatus.jsx
│   └── Notification.jsx
├── hooks/              # Custom React hooks
│   └── useCollaboration.js
├── App.jsx             # Main app component
├── main.jsx            # React entry point
└── index.css           # Global styles
```

## Development

The app uses your existing collaboration infrastructure:
- `webpubsub-simple.js` - WebPubSub client
- `collaboration-bridge.js` - Collaboration logic
- Azure Functions backend for SignalR negotiation

All collaboration features are preserved and enhanced with React's reactive UI updates.