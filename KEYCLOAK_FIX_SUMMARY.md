# Keycloak Database Fix - Summary

## Problem

When deploying to Coolify, Keycloak was failing with a database error:
```
ERROR: database "keycloak" does not exist
```

## Root Cause

Keycloak requires its own separate PostgreSQL database, but the initialization script wasn't reliably creating it in production environments like Coolify.

## Solution

### 1. Created Separate Docker Compose Files

**`docker-compose.local.yml`** - For local development
- Hardcoded development credentials
- Port mappings for direct access
- Volume mounts for hot-reload
- Uses new database initialization script

**`docker-compose.coolify.yml`** - For production/Coolify
- Environment variable based configuration
- Production build targets
- Restart policies
- Uses new database initialization script

### 2. New Database Initialization Script

Created `database/postgres/init-multiple-databases.sh`:
```bash
#!/bin/bash
# Automatically creates multiple databases based on env var
# POSTGRES_MULTIPLE_DATABASES=keycloak
```

This script:
- Runs on first PostgreSQL container startup
- Creates the `keycloak` database automatically
- Works in both local and production environments

### 3. Updated Configuration

Both docker-compose files now include:

```yaml
postgres:
  environment:
    POSTGRES_MULTIPLE_DATABASES: keycloak
  volumes:
    - ./database/postgres/init-multiple-databases.sh:/docker-entrypoint-initdb.d/init-multiple-databases.sh
```

```yaml
keycloak:
  environment:
    KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
  depends_on:
    postgres:
      condition: service_healthy
```

### 4. Environment Template

Created `.env.coolify.example` with all required environment variables for easy configuration.

## How to Use

### Local Development

```bash
# Start all services
docker-compose -f docker-compose.local.yml up -d

# Keycloak database is created automatically
# Access Keycloak at http://localhost:8090
```

### Coolify Deployment

1. In Coolify UI, set Docker Compose Location:
   ```
   /docker-compose.coolify.yml
   ```

2. Copy environment variables from `.env.coolify.example`

3. Update variables with your domain and credentials

4. Deploy - Keycloak database is created automatically

## Files Created/Modified

### New Files
- ✅ `docker-compose.local.yml` - Local development
- ✅ `docker-compose.coolify.yml` - Production deployment
- ✅ `database/postgres/init-multiple-databases.sh` - Database initialization
- ✅ `.env.coolify.example` - Environment template
- ✅ `DOCKER_COMPOSE_REFERENCE.md` - Complete documentation

### Modified Files
- ✅ `COOLIFY_DEPLOYMENT.md` - Updated with new instructions
- ✅ `DEVELOPMENT.md` - Added quick start with new compose file
- ✅ `README.md` - Updated quick start section
- ✅ `docker-compose.yml` - Added deprecation notice

## Verification

To verify the fix works:

```bash
# Start containers
docker-compose -f docker-compose.local.yml up -d

# Wait for services to be healthy
docker-compose -f docker-compose.local.yml ps

# Check databases exist
docker-compose -f docker-compose.local.yml exec postgres psql -U syncpad -l

# Should show:
# - syncpad (application database)
# - keycloak (authentication database)

# Check Keycloak is running
curl http://localhost:8090/health
```

## Benefits

1. ✅ **Keycloak database issue fixed** - automatically created
2. ✅ **Separate configurations** - local vs production
3. ✅ **Better security** - production uses environment variables
4. ✅ **Easier development** - single command to start everything
5. ✅ **Production ready** - optimized for Coolify deployment
6. ✅ **Clear documentation** - separate guides for each use case

## Next Steps

1. Test local deployment with `docker-compose.local.yml`
2. Update Coolify to use `docker-compose.coolify.yml`
3. Configure environment variables in Coolify UI
4. Deploy and verify Keycloak database is created
5. Import Keycloak realm configuration

## Support

If you encounter issues:

1. Check logs: `docker-compose -f docker-compose.local.yml logs -f`
2. Verify databases: `docker-compose exec postgres psql -U syncpad -l`
3. See `DOCKER_COMPOSE_REFERENCE.md` for troubleshooting
4. See `COOLIFY_DEPLOYMENT.md` for deployment help
