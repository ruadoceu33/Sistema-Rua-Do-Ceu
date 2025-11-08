import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient, AuthResponse } from '@/lib/api';

interface Profile {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role: string;
  ativo?: boolean;
}

interface AuthContextType {
  user: Profile | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: (credential: string) => Promise<{ error: any; needsApproval?: boolean }>;
  signOut: () => Promise<void>;
  setAuthUser: (user: Profile) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const userData = await apiClient.getCurrentUser();
          setUser(userData);
          setProfile(userData);
        }
      } catch (error) {
        // Invalid token, clear storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response: AuthResponse = await apiClient.login({ email, password });

      // Store tokens
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Update state
      setUser(response.user);
      setProfile(response.user);

      return { error: null };
    } catch (error: any) {
      const errorData = error.response?.data?.error;
      return {
        error: {
          message: errorData?.message || errorData || 'Erro ao fazer login',
          code: errorData?.code
        }
      };
    }
  };

  const signInWithGoogle = async (credential: string) => {
    try {
      const response = await apiClient.googleAuth({ credential });

      // Se precisa de aprovação, retorna sem armazenar tokens
      if (response.needsApproval) {
        return {
          error: null,
          needsApproval: true
        };
      }

      // Se o login foi bem-sucedido, armazena os tokens
      if (response.access_token && response.refresh_token) {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        localStorage.setItem('user', JSON.stringify(response.user));

        setUser(response.user);
        setProfile(response.user);
      }

      return { error: null, needsApproval: false };
    } catch (error: any) {
      const errorData = error.response?.data?.error;
      return {
        error: {
          message: errorData?.message || errorData || 'Erro ao fazer login com Google',
          code: errorData?.code
        },
        needsApproval: false
      };
    }
  };

  const signOut = async () => {
    try {
      // Clear tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      // Update state
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const setAuthUser = (userData: Profile) => {
    setUser(userData);
    setProfile(userData);
  };

  const isAdmin = user?.role === 'admin';

  const value = {
    user,
    profile,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
    setAuthUser,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}