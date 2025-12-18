import { createContext } from 'react';
import type { User } from '../types';

export interface AuthContextType {
  authenticated: boolean;
  user: User | null;
  loading: boolean;
  isDarkMode: boolean;
  login: () => void;
  logout: () => void;
  toggleTheme: () => void;
  getToken: () => string | undefined;
}

export const AuthContext = createContext<AuthContextType | null>(null);
