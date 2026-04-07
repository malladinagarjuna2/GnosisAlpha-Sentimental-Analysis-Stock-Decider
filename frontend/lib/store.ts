import { create } from 'zustand';
import { User } from './types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  /** true once localStorage has been read on the client */
  hydrated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => void;
  /** Reads token from localStorage and marks the store as hydrated */
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  hydrated: false,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
    set({ token });
  },
  setIsLoading: (loading) => set({ isLoading: loading }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    set({ user: null, token: null });
  },
  hydrate: () => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('auth_token')
        : null;
    set({ token: token ?? null, hydrated: true });
  },
}));
