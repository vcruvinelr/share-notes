# Docker Compose Files Reference

This project includes multiple Docker Compose configurations for different environments.

## Available Configurations

### 1. `docker-compose.local.yml` - Local Development

**Use when:** Developing locally on your machine

**Features:**
- ✅ Hardcoded development credentials (easy to start)
- ✅ Volume mounts for hot-reload (changes reflect immediately)
- ✅ All ports exposed for direct access
- ✅ Development build targets
- ✅ Automatic Keycloak database creation

**Start:**
```bash
docker-compose -f docker-compose.local.yml up -d
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8010
- API Docs: http://localhost:8010/docs
- Keycloak Admin: http://localhost:8090 (admin/admin)
- PostgreSQL: localhost:5432 (syncpad/syncpad_dev_password)
- MongoDB: localhost:27017 (syncpad/syncpad_dev_password)
- Redis: localhost:6379

**Stop:**
```bash
docker-compose -f docker-compose.local.yml down
```

**Fresh start (removes data):**
```bash
docker-compose -f docker-compose.local.yml down -v
```

---

### 2. `docker-compose.coolify.yml` - Production Deployment

**Use when:** Deploying to Coolify or production servers

**Features:**
- ✅ Environment variable based configuration
- ✅ Production build targets
- ✅ Restart policies for high availability
- ✅ **Fixes Keycloak database issue** - automatically creates separate database
- ✅ No exposed ports (reverse proxy handles routing)
- ✅ Optimized health checks

**Configuration:**

1. Copy environment template:
   ```bash
   cp .env.coolify.example .env.production
   ```

2. Edit `.env.production` with your values

3. In Coolify:
   - Set Docker Compose Location: `/docker-compose.coolify.yml`
   - Copy environment variables from `.env.production`

**Required Environment Variables:**
- See `.env.coolify.example` for complete list
- All passwords must be changed from defaults
- URLs must match your domain configuration

---

### 3. `docker-compose.yml` - Legacy (Deprecated)

**Status:** ⚠️ Deprecated - Do not use

This file is kept for backward compatibility but should not be used. Use either:
- `docker-compose.local.yml` for development
- `docker-compose.coolify.yml` for production

---

## Common Commands

### Local Development

```bash
# Start everything
docker-compose -f docker-compose.local.yml up -d

# View logs (all services)
docker-compose -f docker-compose.local.yml logs -f

# View logs (specific service)
docker-compose -f docker-compose.local.yml logs -f backend

# Stop everything
docker-compose -f docker-compose.local.yml down

# Restart a service
docker-compose -f docker-compose.local.yml restart backend

# Rebuild a service
docker-compose -f docker-compose.local.yml up -d --build backend

# Execute command in container
docker-compose -f docker-compose.local.yml exec backend bash

# Fresh start (delete all data)
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d
```

### Production (Coolify handles this automatically)

Coolify manages the docker-compose lifecycle. You don't need to run these commands manually.

---

## Keycloak Database Fix

**Problem:** Keycloak needs its own database separate from the application database.

**Solution:** Both `docker-compose.local.yml` and `docker-compose.coolify.yml` now include:

1. **PostgreSQL init script** (`database/postgres/init-multiple-databases.sh`)
   - Automatically creates `keycloak` database
   - Runs on first container startup

2. **Environment variable:** `POSTGRES_MULTIPLE_DATABASES=keycloak`
   - Triggers database creation

3. **Keycloak connection:** `KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak`
   - Points to the separate database

**This fix ensures:**
- ✅ Keycloak database is created automatically
- ✅ No manual database creation needed
- ✅ Works in both local and production environments

---

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :3000  # or :8010, :5432, etc.

# Kill the process
kill -9 <PID>

# Or use different ports (edit docker-compose.local.yml)
ports:
  - "3001:3000"  # Changed from 3000:3000
```

### Keycloak Not Starting

```bash
# Check if keycloak database exists
docker-compose -f docker-compose.local.yml exec postgres psql -U syncpad -l

# Should show both 'syncpad' and 'keycloak' databases

# If keycloak database missing, recreate containers
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d
```

### Database Connection Errors

```bash
# Check if databases are healthy
docker-compose -f docker-compose.local.yml ps

# All services should show "healthy"

# View database logs
docker-compose -f docker-compose.local.yml logs postgres
docker-compose -f docker-compose.local.yml logs mongodb
```

### Container Won't Start

```bash
# View detailed logs
docker-compose -f docker-compose.local.yml logs <service-name>

# Remove and recreate
docker-compose -f docker-compose.local.yml rm -f <service-name>
docker-compose -f docker-compose.local.yml up -d <service-name>
```

---

## Migration from Old docker-compose.yml

If you were using the old `docker-compose.yml`:

```bash
# Stop old containers
docker-compose down

# Start with new local config
docker-compose -f docker-compose.local.yml up -d

# Update any scripts or documentation to use new filename
```

---

## Best Practices

### Local Development

1. **Use the local file:** Always specify `-f docker-compose.local.yml`
2. **Don't commit credentials:** Development credentials are in the file, don't change them
3. **Fresh starts:** Use `down -v` when you need a clean state
4. **Monitor logs:** Keep logs open during development to catch issues

### Production (Coolify)

1. **Use environment variables:** Never hardcode secrets in docker-compose.coolify.yml
2. **Strong passwords:** Generate random passwords for all services
3. **Test locally first:** Verify changes work with local compose before deploying
4. **Backup data:** Ensure Coolify backups are configured
5. **Monitor health:** Check that all health checks pass

---

## Need Help?

- **Local Development:** See [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Production Deployment:** See [COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md)
- **Architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Quick Start:** See [QUICKSTART.md](./QUICKSTART.md)
