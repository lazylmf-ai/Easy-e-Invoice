'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getAuthToken, setAuthToken, clearAuthToken } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  orgId: string;
  organization?: {
    id: string;
    name: string;
    tin: string;
    industryCode?: string;
    isSstRegistered: boolean;
    currency: string;
  };
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string) => Promise<void>;
  verifyToken: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          await refreshUser();
        } catch (error) {
          console.error('Failed to refresh user:', error);
          clearAuthToken();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string): Promise<void> => {
    try {
      await api.auth.sendMagicLink(email);
      // Magic link sent - user will verify via email
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const verifyToken = async (token: string): Promise<void> => {
    try {
      const response = await api.auth.verifyToken(token);
      
      if (response.token && response.user) {
        setAuthToken(response.token);
        setUser(response.user);
        router.push('/dashboard');
      } else {
        throw new Error('Invalid response from verification');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      clearAuthToken();
      throw error;
    }
  };

  const logout = () => {
    try {
      api.auth.logout().catch(console.error); // Fire and forget
    } finally {
      clearAuthToken();
      setUser(null);
      router.push('/auth/login');
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const orgResponse = await api.organization.get();
      
      if (orgResponse.organization) {
        // Create user object from organization data
        const userData: User = {
          id: orgResponse.organization.id,
          email: 'user@example.com', // TODO: Get from JWT or separate endpoint
          orgId: orgResponse.organization.id,
          organization: orgResponse.organization,
        };
        
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    verifyToken,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}