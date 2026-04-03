import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';

export const useAuth = () => {
  const { user, token, setUser, setToken, setIsLoading, logout, hydrate } =
    useAuthStore();

  // Hydrate from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(email, password);
      const { accessToken } = response.data;
      setToken(accessToken);
      // Fetch user data
      const userResponse = await authAPI.getMe();
      setUser(userResponse.data);
      return userResponse.data;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    name?: string
  ) => {
    try {
      setIsLoading(true);
      const response = await authAPI.signup(email, password, name);
      const { accessToken, user } = response.data;
      setToken(accessToken);
      if (user) {
        setUser(user);
      }
      return user;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
      return response.data;
    } catch (error) {
      logout();
      throw error;
    }
  };

  return {
    user,
    token,
    isAuthenticated: !!token && !!user,
    login,
    signup,
    logout,
    refreshUser,
  };
};
