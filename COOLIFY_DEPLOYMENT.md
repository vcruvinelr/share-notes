# Coolify Deployment Guide

Complete guide to deploy ShareNotes to Hetzner + Coolify with automatic GitHub Actions deployment.

## Important: Docker Compose Files

This project has **two separate docker-compose files**:

- **`docker-compose.coolify.yml`** - For production deployment on Coolify
  - Uses environment variables for configuration
  - Production-optimized settings
  - **Fixes Keycloak database issue** by automatically creating separate Keycloak database
  - Proper restart policies and health checks

- **`docker-compose.local.yml`** - For local development
  - Hardcoded dev credentials
  - Volume mounts for hot-reload
  - Development-optimized settings
  - Port mappings for direct access

**For Coolify deployment, always use `docker-compose.coolify.yml`**

## Prerequisites

- GitHub account with repository access
- Hetzner Cloud account
- Domain name (optional, but recommended)

## Step 1: Create Hetzner Server

1. Go to [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Create new project: `sharenotes-production`
3. Add new server:
   - **Location**: Choose closest to your users (e.g., Nuremberg, Helsinki)
   - **Image**: Ubuntu 24.04
   - **Type**: CAX11 (ARM) - €4.49/month OR CX22 (x86) - €5.83/month
   - **Networking**: Enable IPv4 and IPv6
   - **SSH Keys**: Add your SSH key
   - **Firewall**: Create firewall rule:
     - Allow: 22 (SSH), 80 (HTTP), 443 (HTTPS), 8000 (Coolify Dashboard)
   - **Name**: `coolify-server`
4. Click "Create & Buy now"
5. Note the server IP address

## Step 2: Install Coolify

1. SSH into your server:
   ```bash
   ssh root@<your-server-ip>
   ```

2. Install Coolify (one command):
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```

3. Wait 5-10 minutes for installation to complete

4. Access Coolify dashboard:
   - Open browser: `http://<your-server-ip>:8000`
   - Create admin account (email + password)
   - Complete onboarding wizard

## Step 3: Configure Coolify Project

### 3.1 Create Project

1. In Coolify dashboard → Click "**+ New**" → "**Project**"
2. Name: `ShareNotes`
3. Description: `Real-time collaborative note-taking platform`

### 3.2 Add GitHub Repository

1. Go to Project → "**+ New**" → "**Resource**" → "**Docker Compose**"
2. Select source: "**GitHub**"
3. If first time:
   - Click "**+ Add Source**"
   - Choose "**GitHub App**"
   - Install Coolify GitHub App on your repository
   - Authorize access
4. Select your repository: `your-username/share-notes`
5. Branch: `main`
6. **Docker Compose Location: `/docker-compose.coolify.yml`** ⚠️ Important: Use the Coolify-specific file
7. Click "**Continue**"

### 3.3 Configure Services

Coolify will parse your docker-compose.yml and detect all services:

**For each service, configure:**

1. **PostgreSQL** (postgres)
   - Publicly accessible: ❌ No
   - Persistent storage: ✅ Yes (`/var/lib/postgresql/data`)
   - Environment variables: Auto-detected from docker-compose

2. **MongoDB** (mongodb)
   - Publicly accessible: ❌ No
   - Persistent storage: ✅ Yes (`/data/db`)
   - Environment variables: Auto-detected

3. **Redis** (redis)
   - Publicly accessible: ❌ No
   - Persistent storage: ✅ Yes (optional)
   - Environment variables: Auto-detected

4. **Keycloak** (keycloak)
   - Publicly accessible: ✅ Yes
   - Domain: `auth.yourdomain.com` (or use Coolify subdomain)
   - Port: 8080
   - SSL: ✅ Enable automatic SSL (Let's Encrypt)
   - Health check: `/health` or `/`

5. **Backend** (backend)
   - Publicly accessible: ✅ Yes
   - Domain: `api.yourdomain.com` (or use Coolify subdomain)
   - Port: 8000
   - SSL: ✅ Enable automatic SSL
   - Health check: `/api/health`
   - Environment variables: Update URLs to match your domains

6. **Frontend** (frontend)
   - Publicly accessible: ✅ Yes
   - Domain: `yourdomain.com` or `app.yourdomain.com`
   - Port: 80
   - SSL: ✅ Enable automatic SSL
   - Build arguments:
     ```
     VITE_API_URL=https://api.yourdomain.com
     VITE_KEYCLOAK_URL=https://auth.yourdomain.com
     ```

### 3.4 Update Environment Variables

**IMPORTANT:** The Keycloak database issue is fixed in `docker-compose.coolify.yml` by automatically creating a separate Keycloak database during PostgreSQL initialization.

In Coolify, for each service, set proper environment variables:

**PostgreSQL Environment Variables:**
```env
POSTGRES_USER=syncpad
POSTGRES_PASSWORD=<generate-secure-password>
POSTGRES_DB=syncpad
POSTGRES_MULTIPLE_DATABASES=keycloak
```

**MongoDB Environment Variables:**
```env
MONGO_USER=syncpad
MONGO_PASSWORD=<generate-secure-password>
MONGO_DB=syncpad
```

**Keycloak Environment Variables:**
```env
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=<generate-secure-password>
KEYCLOAK_HOSTNAME=auth.yourdomain.com
KC_DB_USERNAME=syncpad
KC_DB_PASSWORD=<same-as-postgres-password>
```

**Backend Environment Variables:**
```env
DATABASE_URL=postgresql://syncpad:<postgres-password>@postgres:5432/syncpad
MONGODB_URL=mongodb://syncpad:<mongo-password>@mongodb:27017/syncpad?authSource=admin
REDIS_URL=redis://redis:6379
KEYCLOAK_URL=https://auth.yourdomain.com
KEYCLOAK_REALM=syncpad
KEYCLOAK_CLIENT_ID=syncpad-backend
KEYCLOAK_CLIENT_SECRET=<from-keycloak-admin>
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
STRIPE_SECRET_KEY=<your-stripe-key>
STRIPE_PRICE_ID=<your-price-id>
STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
FRONTEND_URL=https://yourdomain.com
```

**Frontend (Build Args):**
```env
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
VITE_KEYCLOAK_URL=https://auth.yourdomain.com
VITE_KEYCLOAK_REALM=syncpad
VITE_KEYCLOAK_CLIENT_ID=syncpad-frontend
```

> 💡 **Tip:** Copy `.env.coolify.example` and fill in your values, then paste into Coolify's environment variables section.

## Step 4: Setup GitHub Actions Auto-Deployment

### 4.1 Get Coolify Webhook URL

1. In Coolify dashboard → Your project → Application
2. Go to "**Webhooks**" tab
3. Enable "**Automatic Deployment**"
4. Copy the webhook URL (format: `https://your-server:8000/api/v1/deploy/webhook/xxxxx`)

### 4.2 Get Coolify API Token (Optional, for authenticated webhooks)

1. Coolify dashboard → Settings → API Tokens
2. Click "**+ Create Token**"
3. Name: `GitHub Actions`
4. Permissions: `read:deployments, write:deployments`
5. Copy the token

### 4.3 Add GitHub Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Add secrets:

   **Secret 1: COOLIFY_WEBHOOK_URL**
   - Name: `COOLIFY_WEBHOOK_URL`
   - Value: `https://your-server-ip:8000/api/v1/deploy/webhook/xxxxx`

   **Secret 2: COOLIFY_TOKEN** (if using authenticated webhooks)
   - Name: `COOLIFY_TOKEN`
   - Value: `<your-api-token>`

### 4.4 Enable Workflow

The GitHub Actions workflow (`.github/workflows/deploy-coolify.yml`) is already created.

It will automatically:
- ✅ Trigger on push to `main` or `develop`
- ✅ Trigger on pull requests
- ✅ Send webhook to Coolify
- ✅ Coolify pulls latest code and rebuilds containers

## Step 5: Configure Domain (Optional but Recommended)

### Using Custom Domain:

1. **Add DNS Records:**
   - A record: `@` → `<your-server-ip>` (for yourdomain.com)
   - A record: `api` → `<your-server-ip>` (for api.yourdomain.com)
   - A record: `auth` → `<your-server-ip>` (for auth.yourdomain.com)
   - A record: `app` → `<your-server-ip>` (for app.yourdomain.com)

2. **Update Coolify domains:**
   - Edit each service in Coolify
   - Set custom domain
   - Coolify will auto-generate SSL certificates

### Using Coolify Subdomains:

Coolify provides free subdomains:
- `your-app-xxxxx.coolify.io`
- Enable in service settings

## Step 6: Initial Deployment

1. **Manual Deploy (First Time):**
   - In Coolify dashboard → Your app → Click "**Deploy**"
   - Watch logs in real-time
   - Wait for all services to be healthy

2. **Verify Deployment:**
   - Frontend: `https://yourdomain.com`
   - Backend: `https://api.yourdomain.com/docs`
   - Keycloak: `https://auth.yourdomain.com`

3. **Import Keycloak Realm:**
   - Access Keycloak admin console
   - Import `keycloak/realm-export.json`
   - Configure redirect URIs to match your domains

## Step 7: Automatic Deployments

Now every time you push to `main` or `develop`:

1. GitHub Actions triggers
2. Sends webhook to Coolify
3. Coolify pulls latest code
4. Rebuilds containers
5. Performs rolling deployment
6. Zero downtime!

## Monitoring & Logs

### View Logs in Coolify:
1. Dashboard → Your application → Logs
2. Select service
3. Real-time streaming logs

### Server Resources:
- Dashboard → Server → Resources
- Monitor CPU, RAM, Disk usage

### Enable Notifications:
1. Settings → Notifications
2. Add webhook/email for deployment notifications

## Backup & Restore

### Automatic Backups:

1. **Database Backups:**
   - Coolify → PostgreSQL service → Backups
   - Enable scheduled backups
   - Retention: 7 days

2. **Manual Backup:**
   ```bash
   # SSH into server
   ssh root@<server-ip>
   
   # Backup PostgreSQL
   docker exec syncpad-postgres pg_dump -U syncpad syncpad > backup.sql
   
   # Backup MongoDB
   docker exec syncpad-mongodb mongodump --username syncpad --password syncpad_dev_password --authenticationDatabase admin
   ```

### Restore:
```bash
# PostgreSQL
docker exec -i syncpad-postgres psql -U syncpad syncpad < backup.sql

# MongoDB
docker exec -i syncpad-mongodb mongorestore --username syncpad --password syncpad_dev_password --authenticationDatabase admin /backup
```

## Troubleshooting

### Deployment Fails:
1. Check Coolify logs
2. Verify environment variables
3. Check service health: `docker ps`
4. View container logs: `docker logs <container-name>`

### Cannot Access Services:
1. Check firewall rules in Hetzner
2. Verify ports are exposed in docker-compose.yml
3. Check Coolify proxy settings
4. Verify DNS records

### SSL Certificate Issues:
1. Verify domain points to server IP
2. Check Let's Encrypt rate limits
3. Regenerate certificate in Coolify

### Out of Memory:
1. Upgrade server plan
2. Add swap space
3. Optimize container resources

## Cost Breakdown

**Hetzner CAX11 (ARM):**
- Server: €4.49/month
- Backup: €0.90/month (optional)
- Total: **€5.39/month (~$5.75/month)**

**OR Hetzner CX22 (x86):**
- Server: €5.83/month
- Backup: €1.17/month (optional)
- Total: **€7/month (~$7.50/month)**

## Security Recommendations

1. **Enable Firewall:**
   - Only allow ports 22, 80, 443, 8000
   - Restrict SSH to specific IPs if possible

2. **Change Default Passwords:**
   - Update all database passwords
   - Use strong, random passwords

3. **Enable 2FA:**
   - On Coolify admin account
   - On Hetzner account

4. **Regular Updates:**
   - Coolify auto-updates itself
   - Keep server OS updated: `apt update && apt upgrade`

5. **Monitoring:**
   - Enable Coolify monitoring
   - Set up uptime monitoring (UptimeRobot, etc.)

## Scaling

When you need more resources:

1. **Vertical Scaling (Easier):**
   - Coolify → Server → Upgrade plan
   - Or in Hetzner console, upgrade server
   - No configuration changes needed

2. **Horizontal Scaling:**
   - Add more Coolify servers
   - Use Coolify's multi-server support
   - Add load balancer

## Support

- **Coolify Docs**: https://coolify.io/docs
- **Coolify Discord**: https://coollabs.io/discord
- **Hetzner Support**: https://docs.hetzner.com/

## Next Steps

1. ✅ Set up monitoring
2. ✅ Configure automated backups
3. ✅ Set up custom domain
4. ✅ Enable HTTPS everywhere
5. ✅ Test automatic deployments
6. Configure production environment variables
7. Set up staging environment (optional)
8. Implement CI/CD testing before deployment
