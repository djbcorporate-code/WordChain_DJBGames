import { AuthenticatedUser, LoginInput, RegisterInput, VerifyEmailInput } from '@wordchain/shared';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';

interface AuthContextType {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  register: (input: RegisterInput) => Promise<{ verificationToken?: string }>;
  logout: () => Promise<void>;
  verifyEmail: (input: VerifyEmailInput) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const { user: fetchedUser } = await api.auth.getMe();
      setUser(fetchedUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (input: LoginInput) => {
    const res = await api.auth.login(input);
    setUser(res.user);
  };

  const loginAsGuest = async () => {
    const res = await api.auth.guestLogin();
    setUser(res.user);
  };

  const register = async (input: RegisterInput) => {
    const res = await api.auth.register(input);
    setUser(res.user);
    return { verificationToken: res.verificationToken };
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  const verifyEmail = async (input: VerifyEmailInput) => {
    await api.auth.verifyEmail(input);
    await refreshUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginAsGuest,
        register,
        logout,
        verifyEmail,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
