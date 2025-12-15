const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
  keycloak: {
    url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
    realm: import.meta.env.VITE_KEYCLOAK_REALM || 'syncpad',
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'syncpad-frontend',
  },
  features: {
    // Toggle these to enable/disable features easily
    enableAuth: import.meta.env.VITE_ENABLE_AUTH === 'true' || false, // Set to true to enable login
    enableSubscriptions: import.meta.env.VITE_ENABLE_SUBSCRIPTIONS === 'true' || false, // Set to true to enable premium/subscriptions
  },
};

export default config;
