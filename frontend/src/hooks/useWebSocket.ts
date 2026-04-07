import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Constants from 'expo-constants';

// Get the backend URL
const getBackendUrl = () => {
  const backendUrl = Constants.expoConfig?.extra?.backendUrl 
    || process.env.EXPO_PUBLIC_BACKEND_URL 
    || 'https://matching-engine-live.preview.emergentagent.com';
  // Remove /api suffix if present
  return backendUrl.replace(/\/api$/, '');
};

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

interface UseWebSocketOptions {
  onNotification?: (notification: Notification) => void;
  onBookingUpdate?: (data: { bookingId: string; status: string }) => void;
  onQuoteUpdate?: (data: { quoteId: string; responsesCount: number }) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<Notification | null>(null);

  const connect = useCallback(() => {
    if (!user?._id || socketRef.current?.connected) return;

    const baseUrl = getBackendUrl();
    const wsUrl = `${baseUrl}/notifications`;

    console.log('[WebSocket] Connecting to:', wsUrl);

    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
      
      // Join user's room
      socket.emit('join', user._id);
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
    });

    socket.on('notification', (notification: Notification) => {
      console.log('[WebSocket] Notification received:', notification);
      setLastNotification(notification);
      
      // Call the callback if provided
      options.onNotification?.(notification);

      // Handle specific notification types
      if (notification.type?.includes('BOOKING')) {
        options.onBookingUpdate?.({
          bookingId: notification.data?.bookingId,
          status: notification.data?.status,
        });
      }

      if (notification.type?.includes('QUOTE')) {
        options.onQuoteUpdate?.({
          quoteId: notification.data?.quoteId,
          responsesCount: notification.data?.responsesCount,
        });
      }
    });

    socket.on('connect_error', (error) => {
      console.log('[WebSocket] Connection error:', error.message);
    });

    socketRef.current = socket;
  }, [user?._id, options]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      if (user?._id) {
        socketRef.current.emit('leave', user._id);
      }
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (user?._id) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user?._id, connect, disconnect]);

  return {
    isConnected,
    lastNotification,
    reconnect: connect,
  };
}

// Simple hook to trigger refresh when booking updates received
export function useBookingRefresh(bookingId?: string) {
  const [refreshKey, setRefreshKey] = useState(0);

  useWebSocket({
    onBookingUpdate: (data) => {
      if (!bookingId || data.bookingId === bookingId) {
        setRefreshKey((k) => k + 1);
      }
    },
  });

  return refreshKey;
}

// Hook to get realtime notification count
export function useNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  useWebSocket({
    onNotification: () => {
      setUnreadCount((c) => c + 1);
    },
  });

  const resetCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return { unreadCount, resetCount };
}
