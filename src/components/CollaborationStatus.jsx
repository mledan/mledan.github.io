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
      {/* Minimal status UI removed to declutter. Details panel can be toggled by your own trigger if desired. */}
      {showDetails && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#0d1117',
          color: '#e5e7eb',
          padding: '24px',
          borderRadius: '8px',
          zIndex: 10002,
          minWidth: '350px',
          maxWidth: '500px',
          border: '1px solid #1f2937',
          boxShadow: '0 0 12px rgba(0,209,255,0.35)'
        }}>
          <h3 style={{ margin: 0, marginBottom: 16, color: '#e5e7eb', fontSize: 20, fontWeight: 700 }}>Collaboration</h3>
          
          <div style={{ 
            marginBottom: '12px',
            padding: '12px',
            background: '#0f141b',
            borderRadius: 6,
            border: '1px solid #1f2937'
          }}>
            <strong style={{ color: '#00d1ff' }}>Room:</strong> <span style={{ color: '#e5e7eb' }}>{roomId || 'None'}</span>
          </div>
          
          <div style={{ 
            marginBottom: '12px',
            padding: '12px',
            background: '#0f141b',
            borderRadius: 6,
            border: '1px solid #1f2937'
          }}>
            <strong style={{ color: '#00d1ff' }}>Your name:</strong> {username || 'Unknown'}
          </div>
          
          <div style={{ 
            marginBottom: '12px',
            padding: '12px',
            background: '#0f141b',
            borderRadius: 6,
            border: '1px solid #1f2937'
          }}>
            <strong style={{ color: '#00d1ff' }}>Status:</strong> <span style={{ color: isConnected ? '#22c55e' : '#f97316' }}>{isConnected ? '✓ Connected' : '✗ Disconnected'}</span>
          </div>
          
          {/* Role removed: all room members are peers */}
          
          <div style={{ 
            marginBottom: '15px',
            padding: '12px',
            background: '#0f141b',
            borderRadius: 6,
            border: '1px solid #1f2937'
          }}>
            <strong style={{ color: '#00d1ff' }}>Users in room:</strong> {remoteUsers.size + 1}
          </div>
          
          <div style={{ 
            marginBottom: '20px',
            padding: '12px',
            background: '#0d1117',
            borderRadius: 6,
            border: '1px solid #1f2937'
          }}>
            <strong style={{ color: '#e5e7eb', display: 'block', marginBottom: 8 }}>Active Users</strong>
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
                    style={{ padding: '4px 8px', borderRadius: 4, background: '#0a1e28', color: '#e5e7eb', border: '1px solid #00d1ff', cursor: 'pointer', boxShadow: '0 0 6px rgba(0,209,255,0.5)' }}
                  >Go To</button>
                  <button
                    onClick={() => toggleFollowUser(userId)}
                    style={{ padding: '4px 8px', borderRadius: 4, background: followingUserId === userId ? '#24160a' : '#0f141b', color: '#e5e7eb', border: followingUserId === userId ? '1px solid #ff7a00' : '1px solid #1f2937', cursor: 'pointer', boxShadow: followingUserId === userId ? '0 0 6px rgba(255,122,0,0.6)' : 'none' }}
                  >{followingUserId === userId ? 'Following' : 'Follow'}</button>
                </li>
              ))}
            </ul>
          </div>
          
          <button 
            onClick={() => setShowDetails(false)}
            style={{ background: '#0a1e28', color: '#e5e7eb', border: '1px solid #00d1ff', padding: '10px 18px', borderRadius: 6, cursor: 'pointer', marginTop: 10, width: '100%', fontWeight: 600, fontSize: 14, boxShadow: '0 0 6px rgba(0,209,255,0.5)' }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
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
