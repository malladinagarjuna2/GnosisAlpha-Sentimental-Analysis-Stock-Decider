'use client';

import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  const { subscribe } = useSocket();
  const { toast } = useToast();

  useEffect(() => {
    if (!token) return;

    // Listen for new post alerts
    const unsubNewPost = subscribe('new-post', (data) => {
      console.log('[Socket] New post:', data);
    });

    // Listen for sentiment analysis updates
    const unsubNewSentiment = subscribe('new-sentiment', (data) => {
      console.log('[Socket] New sentiment:', data);
    });

    // Listen for user-specific alerts
    const unsubNewAlert = subscribe('new-alert', (data) => {
      toast({
        title: 'New Alert',
        description: data.message || 'You have a new market alert',
      });
    });

    // Listen for broadcast alerts
    const unsubBroadcast = subscribe('new-alert-broadcast', (data) => {
      console.log('[Socket] Broadcast alert:', data);
    });

    return () => {
      unsubNewPost?.();
      unsubNewSentiment?.();
      unsubNewAlert?.();
      unsubBroadcast?.();
    };
  }, [token, subscribe, toast]);

  return <>{children}</>;
};
