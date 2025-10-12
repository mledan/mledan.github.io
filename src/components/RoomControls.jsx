import React from 'react';

const RoomControls = ({ roomId, setRoomId, onJoinRoom, onCreateRoom, onCopyLink }) => {
  return (
    <div className="room-controls">
      <input
        type="text"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="Enter Room ID"
        onKeyPress={(e) => e.key === 'Enter' && onJoinRoom()}
      />
      <button onClick={onJoinRoom} disabled={!roomId.trim()}>
        Join Room
      </button>
      <button onClick={onCreateRoom}>
        Create Room
      </button>
      <button onClick={onCopyLink} disabled={!roomId.trim()}>
        Copy Link
      </button>
    </div>
  );
};

export default RoomControls;
