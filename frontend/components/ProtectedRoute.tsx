'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { token, user, hydrated, hydrate, setUser, logout } = useAuthStore();
  const [initializing, setInitializing] = useState(true);

  // Step 1: hydrate token from localStorage (runs once on mount)
  useEffect(() => {
    hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 2: once hydrated, either fetch the user or redirect
  useEffect(() => {
    if (!hydrated) return;

    if (!token) {
      // No token at all → go to login
      router.replace('/auth/login');
      setInitializing(false);
      return;
    }

    if (user) {
      // User already loaded (e.g. just logged in without a refresh)
      setInitializing(false);
      return;
    }

    // Token exists but user was lost on refresh → restore it
    authAPI
      .getMe()
      .then((res) => {
        setUser(res.data);
        setInitializing(false);
      })
      .catch(() => {
        // Token is invalid/expired
        logout();
        router.replace('/auth/login');
        setInitializing(false);
      });
  }, [hydrated, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show a full-screen spinner while we resolve auth state
  if (!hydrated || initializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return <>{children}</>;
};
