import { useState, useEffect, ReactNode, useMemo } from 'react';
import Keycloak from 'keycloak-js';
import config from '../config';
import type { User } from '../types';
import { AuthContext, AuthContextType } from './AuthContextDefinition';

console.log('Keycloak config:', {
  url: config.keycloak.url,
  realm: config.keycloak.realm,
  clientId: config.keycloak.clientId,
});
const keycloak = new Keycloak({
  url: config.keycloak.url,
  realm: config.keycloak.realm,
  clientId: config.keycloak.clientId,
});

interface AuthProviderProps {
  children: ReactNode;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const AuthProvider = ({ children, isDarkMode, toggleTheme }: AuthProviderProps) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  console.log('user', user);
  useEffect(() => {
    initKeycloak();
  }, []);

  const initKeycloak = async () => {
    try {
      console.log('[Auth] Initializing Keycloak with config:', {
        url: config.keycloak.url,
        realm: config.keycloak.realm,
        clientId: config.keycloak.clientId,
        silentCheckSsoRedirectUri: globalThis.location.origin + '/silent-check-sso.html',
      });

      const authenticated = await keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: globalThis.location.origin + '/silent-check-sso.html',
        pkceMethod: 'S256',
        checkLoginIframe: false, // Disable iframe check for development
      });

      console.log('[Auth] Keycloak initialized successfully. Authenticated:', authenticated);
      setAuthenticated(authenticated);

      if (authenticated && keycloak.tokenParsed) {
        // Store token FIRST before clearing anonymous data
        if (keycloak.token) {
          localStorage.setItem('token', keycloak.token);
        }

        // Clear anonymous user data when logging in
        localStorage.removeItem('anonymousUserId');

        // Use token claims directly instead of loading profile to avoid CORS issues
        const profile = {
          id: keycloak.subject,
          username: keycloak.tokenParsed.preferred_username,
          email: keycloak.tokenParsed.email,
          firstName: keycloak.tokenParsed.given_name,
          lastName: keycloak.tokenParsed.family_name,
        };
        console.log('[Auth] Using token claims for profile:', profile);

        // Fetch actual user data from backend (including the real user ID)
        // The backend creates a user with a proper UUID based on email when sub is missing
        let isPremium = false;
        let backendUserId = '';
        try {
          const token = keycloak.token;

          console.log('[Auth] Fetching user ID from backend...');
          // Get the actual user ID from backend
          const userResponse = await fetch(`${config.apiUrl}/api/notes/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          console.log('[Auth] User response status:', userResponse.status, userResponse.ok);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            backendUserId = userData.id;
            console.log('[Auth] Got user ID from backend:', backendUserId);
          } else {
            console.error('[Auth] Failed to fetch user from backend, status:', userResponse.status);
            const errorText = await userResponse.text();
            console.error('[Auth] Error response:', errorText);
          }

          // Fetch premium status
          const response = await fetch(`${config.apiUrl}/api/subscription/note-limit`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            isPremium = data.is_premium || false;
          }
        } catch (error) {
          console.error('[Auth] Failed to fetch user data from backend:', error);
        }

        console.log('[Auth] Setting user with ID:', backendUserId);
        setUser({
          id: backendUserId || keycloak.subject || '',
          email: profile.email,
          username: profile.username,
          firstName: profile.firstName,
          lastName: profile.lastName,
          is_premium: isPremium,
        });

        // Only set loading to false AFTER user data is complete
        setLoading(false);
      } else {
        // User is anonymous - ensure we have a consistent anonymous ID (UUID format)
        if (!localStorage.getItem('anonymousUserId')) {
          // Generate a proper UUID for consistency with backend
          const anonId = crypto.randomUUID();
          localStorage.setItem('anonymousUserId', anonId);
        }
        setLoading(false);
      }

      // Token refresh
      setInterval(() => {
        keycloak
          .updateToken(70)
          .then((refreshed) => {
            if (refreshed && keycloak.token) {
              // Update token in localStorage when refreshed
              localStorage.setItem('token', keycloak.token);
              console.log('[Auth] Token refreshed');
            }
          })
          .catch((error) => {
            console.error('[Auth] Failed to refresh token:', error);
          });
      }, 60000);
    } catch (error) {
      console.error('[Auth] Failed to initialize Keycloak:', error);
      if (error instanceof Error) {
        console.error('[Auth] Error message:', error.message);
        console.error('[Auth] Error stack:', error.stack);
      }
      console.error('[Auth] Error details:', error);
      console.error('[Auth] Error type:', typeof error);
      console.error('[Auth] Keycloak config:', {
        url: config.keycloak.url,
        realm: config.keycloak.realm,
        clientId: config.keycloak.clientId,
      });
      // Continue as anonymous user even if Keycloak fails
      setAuthenticated(false);
      setLoading(false);
    }
  };

  const login = () => {
    keycloak.login();
  };

  const logout = () => {
    // Clear token and anonymous ID on logout
    localStorage.removeItem('token');
    localStorage.removeItem('anonymousUserId');
    // Generate a new anonymous ID for the logged-out state
    const newAnonId = crypto.randomUUID();
    localStorage.setItem('anonymousUserId', newAnonId);
    keycloak.logout();
  };

  const getToken = () => {
    return keycloak.token;
  };

  const value: AuthContextType = useMemo(
    () => ({
      authenticated,
      user,
      loading,
      isDarkMode,
      login,
      logout,
      toggleTheme,
      getToken,
    }),
    [authenticated, user, loading, isDarkMode, toggleTheme]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
