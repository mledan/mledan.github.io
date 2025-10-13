import React, { useState } from 'react';

const CollaborationStatus = ({ status, isConnected, roomId, remoteUsers, username }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [followingUserId, setFollowingUserId] = useState(null);

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

  // Match Whiteboard color assignment for viewport boxes
  const colorFor = (uid) => {
    const colors = ['#00d1ff', '#ff7a00', '#1ce1ac', '#ffd166', '#7dd3fc'];
    if (!uid) return colors[0];
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
    return colors[h % colors.length];
  };

  const goToUser = (userId) => {
    window.dispatchEvent(new CustomEvent('whiteboard-go-to-user', { detail: { userId } }));
  };

  const toggleFollowUser = (userId) => {
    const next = followingUserId === userId ? null : userId;
    setFollowingUserId(next);
    window.dispatchEvent(new CustomEvent('whiteboard-follow-user', { detail: { userId: next } }));
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
      </div>

      {showDetails && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(145deg, rgba(30, 30, 60, 0.98), rgba(20, 20, 40, 0.98))',
          color: 'white',
          padding: '30px',
          borderRadius: '20px',
          zIndex: 10002,
          minWidth: '350px',
          maxWidth: '500px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 60px rgba(102, 126, 234, 0.3)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            borderRadius: '20px 20px 0 0'
          }} />
          
          <h3 style={{ 
            margin: '0 0 20px 0', 
            color: '#fff',
            fontSize: '24px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>🌐 Collaboration Info</h3>
          
          <div style={{ 
            marginBottom: '12px',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <strong style={{ color: '#667eea' }}>Room:</strong> <span style={{ color: '#f093fb' }}>{roomId || 'None'}</span>
          </div>
          
          <div style={{ 
            marginBottom: '12px',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <strong style={{ color: '#667eea' }}>Your name:</strong> {username || 'Unknown'}
          </div>
          
          <div style={{ 
            marginBottom: '12px',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <strong style={{ color: '#667eea' }}>Status:</strong> <span style={{ color: isConnected ? '#38ef7d' : '#f45c43' }}>{isConnected ? '✓ Connected' : '✗ Disconnected'}</span>
          </div>
          
          {/* Role removed: all room members are peers */}
          
          <div style={{ 
            marginBottom: '15px',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <strong style={{ color: '#667eea' }}>Users in room:</strong> {remoteUsers.size + 1}
          </div>
          
          <div style={{ 
            marginBottom: '20px',
            padding: '12px',
            background: '#0d1117',
            borderRadius: '8px',
            border: '1px solid #1f2937'
          }}>
            <strong style={{ color: '#e5e7eb', display: 'block', marginBottom: '8px' }}>Active Users</strong>
            <ul style={{ marginTop: '8px', paddingLeft: 0, listStyle: 'none' }}>
              <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, background: '#22c55e', display: 'inline-block' }} />
                <span style={{ color: '#e5e7eb' }}>You ({username || 'Unknown'})</span>
              </li>
              {Array.from(remoteUsers.entries()).map(([userId, user]) => (
                <li key={userId} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, background: colorFor(userId), display: 'inline-block' }} />
                  <span style={{ color: '#e5e7eb', flex: 1 }}>{user.username || userId}</span>
                  <button
                    onClick={() => goToUser(userId)}
                    style={{ padding: '4px 8px', borderRadius: 4, background: '#0a1e28', color: '#e5e7eb', border: '1px solid #00d1ff', cursor: 'pointer' }}
                  >Go To</button>
                  <button
                    onClick={() => toggleFollowUser(userId)}
                    style={{ padding: '4px 8px', borderRadius: 4, background: followingUserId === userId ? '#24160a' : '#0f141b', color: '#e5e7eb', border: followingUserId === userId ? '1px solid #ff7a00' : '1px solid #1f2937', cursor: 'pointer' }}
                  >{followingUserId === userId ? 'Following' : 'Follow'}</button>
                </li>
              ))}
            </ul>
          </div>
          
          <button 
            onClick={() => setShowDetails(false)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              cursor: 'pointer',
              marginTop: '10px',
              width: '100%',
              fontWeight: '600',
              fontSize: '15px',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
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
