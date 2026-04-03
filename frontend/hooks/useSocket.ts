import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { user, token } = useAuth();

  const connect = useCallback(() => {
    if (!token || !user) return;

    if (socketRef.current?.connected) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current.on('connect', () => {
      console.log('[Socket] Connected');
      // Join user-specific room for alerts
      socketRef.current?.emit('join', `user:${user.id}`);
    });

    socketRef.current.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token, user]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const subscribe = useCallback(
    (event: string, callback: (data: any) => void) => {
      if (!socketRef.current) return;
      socketRef.current.on(event, callback);
      return () => {
        socketRef.current?.off(event, callback);
      };
    },
    []
  );

  return {
    socket: socketRef.current,
    subscribe,
    isConnected: socketRef.current?.connected || false,
  };
};
