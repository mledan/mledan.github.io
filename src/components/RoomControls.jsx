import React from 'react';

const RoomControls = ({ roomId, setRoomId, onJoinRoom, onCreateRoom, onCopyLink }) => {
  return (
    <div className="room-controls">
      <h2>🎨 Join Collaboration</h2>
      <input
        type="text"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="Enter Room ID or create new..."
        onKeyPress={(e) => e.key === 'Enter' && roomId.trim() && onJoinRoom()}
      />
      <div className="room-controls-buttons">
        <button onClick={onJoinRoom} disabled={!roomId.trim()}>
          🚀 Join
        </button>
        <button onClick={onCreateRoom}>
          ✨ Create
        </button>
      </div>
      <button 
        onClick={onCopyLink} 
        disabled={!roomId.trim()}
        style={{ 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          marginTop: '5px'
        }}
      >
        📋 Copy Invitation Link
      </button>
    </div>
  );
};

export default RoomControls;
