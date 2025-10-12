import React, { useState, useEffect } from 'react';
// Replace Excalidraw with custom Whiteboard
import Whiteboard from './components/Whiteboard.jsx';
import { useCollaboration } from './hooks/useCollaboration';
import RoomControls from './components/RoomControls';
import CollaborationStatus from './components/CollaborationStatus';
import Notification from './components/Notification';

function App() {
  const [roomId, setRoomId] = useState('');
  const [showRoomControls, setShowRoomControls] = useState(true);
  const [notification, setNotification] = useState(null);
  
  const {
    isConnected,
    username,
    isMaster,
    remoteUsers,
    status,
    joinRoom,
    createRoom,
    copyRoomLink,
    showNotification,
    sendWhiteboardSync,
    excalidrawRef
  } = useCollaboration();

  // Handle URL parameters for room joining
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      setRoomId(roomFromUrl);
      joinRoom(roomFromUrl);
    }
  }, [joinRoom]);

  // Hide room controls when connected
  useEffect(() => {
    setShowRoomControls(!isConnected);
  }, [isConnected]);

  const handleJoinRoom = async () => {
    if (roomId.trim()) {
      const success = await joinRoom(roomId.trim());
      if (success) {
        setShowRoomControls(false);
        setNotification({ message: `Joined room: ${roomId}`, type: 'success' });
      } else {
        setNotification({ message: 'Failed to join room', type: 'error' });
      }
    }
  };

  const handleCreateRoom = () => {
    const newRoomId = createRoom();
    setRoomId(newRoomId);
    joinRoom(newRoomId);
    setShowRoomControls(false);
    setNotification({ message: `Created room: ${newRoomId}`, type: 'success' });
  };

  const handleCopyLink = () => {
    copyRoomLink();
  };

  const handleWhiteboardChange = (event) => {
    const now = Date.now();
    if (now - (handleWhiteboardChange.lastSyncTime || 0) < 50) return;
    handleWhiteboardChange.lastSyncTime = now;
    sendWhiteboardSync(event);
  };

  return (
    <div className="app">
      {showRoomControls && (
        <RoomControls
          roomId={roomId}
          setRoomId={setRoomId}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          onCopyLink={handleCopyLink}
        />
      )}
      
      <CollaborationStatus
        status={status}
        isConnected={isConnected}
        isMaster={isMaster}
        roomId={roomId}
        remoteUsers={remoteUsers}
        username={username}
      />
      
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      
      <div className="excalidraw-container">
        <Whiteboard onChange={handleWhiteboardChange} />
      </div>
    </div>
  );
}

export default App;
