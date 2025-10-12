import React, { useState } from 'react';

const CollaborationStatus = ({ status, isConnected, isMaster, roomId, remoteUsers, username }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'connected';
      case 'connecting': return 'connecting';
      case 'disconnected': return 'disconnected';
      default: return 'disconnected';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return '● Connected';
      case 'connecting': return '● Connecting...';
      case 'disconnected': return '● Disconnected';
      default: return '● Disconnected';
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'connected': return 'Collaboration active';
      case 'connecting': return 'Establishing connection';
      case 'disconnected': return 'Working offline';
      default: return 'Working offline';
    }
  };

  return (
    <>
      <div 
        className={`collab-status ${getStatusColor()}`}
        onClick={() => setShowDetails(!showDetails)}
        title={getStatusTitle()}
      >
        <span>{getStatusText()}</span>
        {isConnected && roomId && (
          <span style={{ fontSize: '10px', opacity: 0.7 }}>
            Room: {roomId.substring(0, 8)}
          </span>
        )}
        {isMaster && (
          <span style={{ 
            fontSize: '10px', 
            background: '#f59e0b', 
            padding: '2px 6px', 
            borderRadius: '4px',
            marginLeft: '8px'
          }}>
            MASTER
          </span>
        )}
      </div>

      {showDetails && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.95)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          zIndex: 10002,
          minWidth: '300px',
          maxWidth: '500px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#fff' }}>Collaboration Info</h3>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Room:</strong> {roomId || 'None'}
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Your name:</strong> {username || 'Unknown'}
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Role:</strong> {isMaster ? 'Master' : 'Follower'}
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Users in room:</strong> {remoteUsers.size + 1}
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Active Users:</strong>
            <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
              <li>You ({username || 'Unknown'})</li>
              {Array.from(remoteUsers.values()).map((user, index) => (
                <li key={index}>{user.username}</li>
              ))}
            </ul>
          </div>
          
          <button 
            onClick={() => setShowDetails(false)}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Close
          </button>
        </div>
      )}
    </>
  );
};

export default CollaborationStatus;
