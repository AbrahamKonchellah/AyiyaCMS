// src/store/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface AuthUser {
  id:       string;
  fullName: string;
  email:    string;
  role:     string;
}

interface LoginResult {
  mfaRequired:        boolean;
  mustChangePassword: boolean;
  passwordExpired:    boolean;
}

interface AuthContextType {
  user:      AuthUser | null;
  isLoading: boolean;
  login:     (email: string, password: string) => Promise<LoginResult>;
  verifyMfa: (email: string, code: string)     => Promise<LoginResult>;
  logout:    () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Helper: decode fullName / email / role from a JWT ──
function decodeUser(token: string): AuthUser {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return {
    id:       payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']  ?? '',
    fullName: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']         ?? '',
    email:    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ?? '',
    role:     payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']       ?? '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── On app load — restore user from stored token ──
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payload   = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        if (!isExpired) {
          setUser(decodeUser(token));
        } else {
          localStorage.removeItem('accessToken');
        }
      } catch {
        localStorage.removeItem('accessToken');
      }
    }
    setIsLoading(false);
  }, []);

  // ── Login ──
  const login = async (email: string, password: string): Promise<LoginResult> => {
    const { data } = await api.post('/auth/login', { email, password });

    if (data.mfaRequired) {
      return { mfaRequired: true, mustChangePassword: false, passwordExpired: false };
    }

    if (data.passwordExpired) {
      return { mfaRequired: false, mustChangePassword: false, passwordExpired: true };
    }

    localStorage.setItem('accessToken', data.accessToken);
    setUser(decodeUser(data.accessToken));

    return {
      mfaRequired:        false,
      mustChangePassword: data.mustChangePassword ?? false,
      passwordExpired:    false,
    };
  };

  // ── MFA verify ──
  const verifyMfa = async (email: string, code: string): Promise<LoginResult> => {
    const { data } = await api.post('/auth/verify-mfa', { email, code });
    localStorage.setItem('accessToken', data.accessToken);
    setUser(decodeUser(data.accessToken));

    return {
      mfaRequired:        false,
      mustChangePassword: data.mustChangePassword ?? false,
      passwordExpired:    false,
    };
  };

  // ── Logout ──
  const logout = async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, verifyMfa, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}