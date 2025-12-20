-- Create Keycloak database if it doesn't exist
SELECT 'CREATE DATABASE keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec

-- Note: User 'syncpad' is already created via POSTGRES_USER env var
-- Database 'syncpad' is already created via POSTGRES_DB env var
