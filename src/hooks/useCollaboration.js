import { useState, useEffect, useCallback, useRef } from 'react';

// Import the existing collaboration bridge
import '../../webpubsub-simple.js';
import '../../collaboration-bridge.js';

export const useCollaboration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [username, setUsername] = useState(null);
  const [isMaster, setIsMaster] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState(new Map());
  const [status, setStatus] = useState('disconnected');
  
  const collaborationBridgeRef = useRef(null);
  const excalidrawRef = useRef(null);

  // Initialize collaboration bridge
  useEffect(() => {
    if (typeof window !== 'undefined' && window.collaborationBridge) {
      collaborationBridgeRef.current = window.collaborationBridge;
      
      // Set up event listeners
      const bridge = collaborationBridgeRef.current;
      
      // Override the original methods to update React state
      const originalInitialize = bridge.initialize.bind(bridge);
      bridge.initialize = async (roomId, username) => {
        const result = await originalInitialize(roomId, username);
        if (result) {
          setRoomId(roomId);
          setUsername(username);
          setIsConnected(true);
          setStatus('connected');
        }
        return result;
      };

      const originalUpdateUIStatus = bridge.updateUIStatus.bind(bridge);
      bridge.updateUIStatus = (newStatus) => {
        originalUpdateUIStatus(newStatus);
        setStatus(newStatus);
        setIsConnected(newStatus === 'connected');
      };

      const originalUpdateUIRole = bridge.updateUIRole.bind(bridge);
      bridge.updateUIRole = () => {
        originalUpdateUIRole();
        setIsMaster(bridge.isMaster);
      };

      const originalHandleUserJoin = bridge.handleUserJoin.bind(bridge);
      bridge.handleUserJoin = (message) => {
        originalHandleUserJoin(message);
        setRemoteUsers(prev => {
          const newUsers = new Map(prev);
          newUsers.set(message.userId, {
            username: message.username,
            joinTime: message.timestamp,
            cursor: null
          });
          return newUsers;
        });
      };

      const originalHandleUserLeave = bridge.handleUserLeave.bind(bridge);
      bridge.handleUserLeave = (message) => {
        originalHandleUserLeave(message);
        setRemoteUsers(prev => {
          const newUsers = new Map(prev);
          newUsers.delete(message.userId);
          return newUsers;
        });
      };
    }
  }, []);

  const joinRoom = useCallback(async (roomId, username = null) => {
    if (collaborationBridgeRef.current) {
      setStatus('connecting');
      const success = await collaborationBridgeRef.current.initialize(roomId, username);
      return success;
    }
    return false;
  }, []);

  const createRoom = useCallback(() => {
    const newRoomId = 'room-' + Math.random().toString(36).substring(2, 10);
    return newRoomId;
  }, []);

  const copyRoomLink = useCallback(() => {
    if (roomId) {
      const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
      navigator.clipboard.writeText(url).then(() => {
        showNotification('Room link copied!', 'success');
      }).catch(err => {
        console.error('Failed to copy room link:', err);
        showNotification('Failed to copy room link', 'error');
      });
    }
  }, [roomId]);

  const showNotification = useCallback((message, type = 'info') => {
    if (collaborationBridgeRef.current) {
      collaborationBridgeRef.current.showNotification(message, type);
    }
  }, []);

  const sendExcalidrawSync = useCallback((elements, appState) => {
    if (collaborationBridgeRef.current && isConnected) {
      collaborationBridgeRef.current.sendMessage('excalidraw_sync', {
        elements: elements,
        appState: appState,
        timestamp: Date.now()
      });
    }
  }, [isConnected]);

  const handleRemoteExcalidrawSync = useCallback((message) => {
    if (excalidrawRef.current && message.userId !== collaborationBridgeRef.current?.userId) {
      try {
        excalidrawRef.current.updateScene({
          elements: message.data.elements,
          appState: message.data.appState
        });
      } catch (error) {
        console.error('Failed to sync remote changes:', error);
      }
    }
  }, []);

  // Set up Excalidraw sync handler
  useEffect(() => {
    if (collaborationBridgeRef.current) {
      const originalHandleGroupMessage = collaborationBridgeRef.current.handleGroupMessage.bind(collaborationBridgeRef.current);
      collaborationBridgeRef.current.handleGroupMessage = (e) => {
        const message = e.message.data;
        
        if (message.type === 'excalidraw_sync') {
          handleRemoteExcalidrawSync(message);
        } else {
          // Pass through other messages
          originalHandleGroupMessage(e);
        }
      };
    }
  }, [handleRemoteExcalidrawSync]);

  return {
    // State
    isConnected,
    roomId,
    username,
    isMaster,
    remoteUsers,
    status,
    
    // Actions
    joinRoom,
    createRoom,
    copyRoomLink,
    showNotification,
    sendExcalidrawSync,
    
    // Refs
    excalidrawRef,
    collaborationBridge: collaborationBridgeRef.current
  };
};
