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

      // Avoid legacy full-state calls expecting Excalidraw
      bridge.sendFullState = () => {};

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

  // Whiteboard sync (batched + compact). Packs events every ~16ms.
  const batchRef = useRef([]);
  const frameScheduledRef = useRef(false);

  const packEvent = (evt) => {
    // Compact keys for minimal payload
    // stroke-start -> {t:'s', i, c, o, w, x, y}
    // stroke-append -> {t:'a', i, x, y}
    // stroke-end   -> {t:'e', i}
    // stroke-full  -> {t:'f', i, c, o, w, p:[x1,y1,...]}
    if (!evt || !evt.type) return null;
    if (evt.type === 'stroke-start') {
      return { t: 's', i: evt.stroke.id, c: evt.stroke.color, o: evt.stroke.opacity, w: evt.stroke.width, x: evt.stroke.points[0].x, y: evt.stroke.points[0].y };
    }
    if (evt.type === 'stroke-append') {
      return { t: 'a', i: evt.id, x: evt.point.x, y: evt.point.y };
    }
    if (evt.type === 'stroke-end') {
      return { t: 'e', i: evt.stroke.id };
    }
    if (evt.type === 'stroke-full' && evt.stroke) {
      const s = evt.stroke;
      // Simple compression: quantize to 2 decimals & flatten
      const p = [];
      for (const pt of s.points) {
        p.push(Math.round(pt.x * 100) / 100, Math.round(pt.y * 100) / 100);
      }
      return { t: 'f', i: s.id, c: s.color, o: s.opacity, w: s.width, p };
    }
    return null;
  };

  const flushBatch = () => {
    const packed = batchRef.current;
    batchRef.current = [];
    frameScheduledRef.current = false;
    if (!packed.length) return;
    if (collaborationBridgeRef.current && isConnected) {
      collaborationBridgeRef.current.sendMessage('whiteboard_sync', {
        events: packed,
        ts: Date.now()
      });
    }
  };

  const sendWhiteboardSync = useCallback((event) => {
    const p = packEvent(event);
    if (!p) return;
    batchRef.current.push(p);
    if (!frameScheduledRef.current) {
      frameScheduledRef.current = true;
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        window.requestAnimationFrame(flushBatch);
      } else {
        setTimeout(flushBatch, 16);
      }
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

  // Set up whiteboard sync handler
  useEffect(() => {
    if (collaborationBridgeRef.current) {
      const originalHandleGroupMessage = collaborationBridgeRef.current.handleGroupMessage.bind(collaborationBridgeRef.current);
      collaborationBridgeRef.current.handleGroupMessage = (e) => {
        const message = e.message.data;
        
        if (message.type === 'whiteboard_sync') {
          const payload = message.data || {};
          const evts = payload.events || [];
          window.dispatchEvent(new CustomEvent('whiteboard-remote-batch', { detail: { userId: message.userId, events: evts } }));
        } else if (message.type === 'whiteboard_viewport') {
          const payload = message.data || {};
          window.dispatchEvent(new CustomEvent('whiteboard-viewport-remote', { detail: { userId: message.userId, rect: payload.rect, ts: payload.ts } }));
        } else {
          // Pass through other messages
          originalHandleGroupMessage(e);
        }
      };
    }
  }, []);

  // Send viewport rectangle (world coords)
  const sendWhiteboardViewport = useCallback((rect) => {
    if (collaborationBridgeRef.current && isConnected) {
      collaborationBridgeRef.current.sendMessage('whiteboard_viewport', {
        rect,
        ts: Date.now()
      });
    }
  }, [isConnected]);

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
    sendWhiteboardSync,
    sendWhiteboardViewport,
    
    // Refs
    excalidrawRef,
    collaborationBridge: collaborationBridgeRef.current
  };
};
