# Railway Deployment Guide

This guide explains how to deploy ShareNotes (a monorepo) to Railway using GitHub Actions for automatic deployment on every pull request and push.

## Monorepo Structure

This project is a monorepo with multiple services:
- `/backend` - FastAPI backend
- `/frontend` - React frontend
- `/keycloak` - Keycloak configuration

Each service deploys independently to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code must be in a GitHub repository
3. **Railway CLI** (optional for local testing): `curl -fsSL https://railway.app/install.sh | sh`

## Setup Steps

### 1. Create Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Click "Empty Project"
3. Name it `sharenotes-dev`

### 2. Add Services to Railway

Add each service separately in Railway:

#### PostgreSQL
1. Click "+ New Service" → "Database" → "PostgreSQL"
2. Railway will automatically create the database
3. Note: Connection URL will be in `DATABASE_URL` variable

#### Redis
1. Click "+ New Service" → "Database" → "Redis"
2. Railway will automatically create Redis
3. Note: Connection URL will be in `REDIS_URL` variable

#### MongoDB
**Option A: MongoDB Atlas (Recommended - Free Tier)**
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Get connection string
4. Add to Railway as environment variable

**Option B: Railway MongoDB (Paid)**
1. Click "+ New Service" → "Database" → "MongoDB"
2. Configure as needed

#### Keycloak
1. Click "+ New Service" → "GitHub Repo"
2. Select your repository
3. Root Directory: `/keycloak` (if you have a Keycloak Dockerfile, otherwise use official image)
4. Add environment variables:
   ```
   KEYCLOAK_ADMIN=admin
   KEYCLOAK_ADMIN_PASSWORD=<strong-password>
   KC_DB=postgres
   KC_DB_URL_HOST=${{Postgres.PGHOST}}
   KC_DB_URL_DATABASE=${{Postgres.PGDATABASE}}
   KC_DB_USERNAME=${{Postgres.PGUSER}}
   KC_DB_PASSWORD=${{Postgres.PGPASSWORD}}
   KC_HOSTNAME=<your-keycloak-domain>.railway.app
   KC_HTTP_ENABLED=true
   KC_PROXY=edge
   ```

#### Backend (FastAPI)
1. Click "+ New Service" → "GitHub Repo"
2. Select your repository
3. **IMPORTANT**: Set Root Directory to `backend`
4. Set Service Name: `backend`
5. Dockerfile Path: `Dockerfile` (relative to root directory)
6. Add environment variables:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   MONGODB_URI=${{MONGODB_URI}}
   REDIS_URL=${{Redis.REDIS_URL}}
   KEYCLOAK_URL=https://<keycloak-service>.railway.app
   KEYCLOAK_REALM=sharenotes
   KEYCLOAK_CLIENT_ID=sharenotes-client
   ENVIRONMENT=development
   ```

#### Frontend (React)
1. Click "+ New Service" → "GitHub Repo"
2. **IMPORTANT**: Set Root Directory to `frontend`
4. Set Service Name: `frontend`
5. Dockerfile Path: `Dockerfile` (relative to root directory)
6. Dockerfile Path: `frontend/Dockerfile`
5. Add environment variables:
   ```
   VITE_API_URL=https://<backend-service>.railway.app
   VITE_KEYCLOAK_URL=https://<keycloak-service>.railway.app
   VITE_KEYCLOAK_REALM=sharenotes
   VITE_KEYCLOAK_CLIENT_ID=sharenotes-client
   ```

### 3. Get Railway API Token

**IMPORTANT: Use Project Token (Required for CI/CD)**

1. Go to your Railway project dashboard
2. Click **Project Settings** (not account settings)
3. Go to **Tokens** tab
4. Click "**Create Token**"
5. Give it a name: `GitHub Actions CI/CD`
6. **Copy the token immediately** (you won't see it again!)

**⚠️ Do NOT use an Account Token - it won't work for `railway link`**

### 3.1. Get Railway Project ID

1. Go to your Railway project dashboard
2. Click on Settings (gear icon)
3. Copy the Project ID (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
4. Or run locally: `railway status` (after linking the project)

### 4. Configure Railway Services

**IMPORTANT**: For each service (backend, frontend), configure:

1. In Railway Dashboard → Service Settings:
   - **Root Directory**: `backend` (for backend) or `frontend` (for frontend)
   - **Build Method**: Dockerfile
   - **Dockerfile Path**: `Dockerfile`
   - **Service Name**: Must match the `--service` flag in GitHub Actions
     - Backend: `backend`
     - Frontend: `frontend`

2. Create `.railway/railway.json` in root if using railway link (optional)

### 4. Add GitHub Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add the following secrets:
   
   **Secret 1: RAILWAY_TOKEN**
   - Name: `RAILWAY_TOKEN`
   - Value: `<paste-the-PROJECT-token-from-railway>`
   
   **Secret 2: RAILWAY_PROJECT_ID**
   - Name: `RAILWAY_PROJECT_ID`
   - Value: `<paste-your-railway-project-id>`

**⚠️ CRITICAL:** The `RAILWAY_TOKEN` MUST be a **Project Token**, not an account token. Account tokens will fail with "Unauthorized" error.

### 5. Create Development Environment (Optional)

1. In GitHub: Settings → Environments
2. Click "New environment"
3. Name: `development`
4. Add protection rules if needed (e.g., require approval)

### 6. Enable GitHub Actions

1. Go to repository → Actions tab
2. If prompted, enable workflows:
   - Push to `main` or `develop` branches
   - **Pull requests to `main` or `develop` branches**
   - Manual workflow dispatch

## Automatic Deployments

### On Pull Requests
- Every PR opened, updated, or reopened triggers a deployment
- Both backend and frontend services deploy independently
- Review deployment in Railway dashboard before merging

### On Push to Main/Develop
- Automatic deployment when code is merged
- Production-ready deployments
3. The workflow will trigger automatically on push to `main` or `develop`

## Manual Deployment

To trigger deployment manually:

1. Go to Actions tab
2. Select "Deploy to Railway (Development)"
3. Click "Run workflow"
4. Selec backend only
cd backend
railway up --service backend

# Deploy frontend only
cd ../frontend
railway up --service frontend

# Deploy all services from root (if configured)
cd ..
railway up
```

## Monorepo Deployment Notes

1. **Service Names**: Each service must have a unique name in Railway (`backend`, `frontend`, etc.)
2. **Root Directory**: Set correctly in Railway dashboard for each service
3. **Dockerfile Path**: Relative to the root directory of each service
4. **Environment Variables**: Set per service in Railway
5. **GitHub Actions**: Deploys each service separately using `working-directory Local Testing with Railway CLI

```bash
# Login to Railway
railway login

# Link to your project
railway link

# Set environment
railway environment development

# Deploy
railway up
```

## Environment Variables Reference

### Backend Required Variables:
- `DATABASE_URL` - PostgreSQL connection (auto from Railway)
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection (auto from Railway)
- `KEYCLOAK_URL` - Keycloak server URL
- `KEYCLOAK_REALM` - Keycloak realm name
- `KEYCLOAK_CLIENT_ID` - Keycloak client ID
- `SECRET_KEY` - Application secret key
- `STRIPE_SECRET_KEY` - Stripe API key (if subscriptions enabled)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

### Frontend Required Variables:
- `VITE_API_URL` - Backend API URL
- `VITE_KEYCLOAK_URL` - Keycloak server URL
- `VITE_KEYCLOAK_REALM` - Keycloak realm name
- `VITE_KEYCLOAK_CLIENT_ID` - Keycloak client ID
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (if subscriptions enabled)

## Health Checks

Railway will automatically monitor:
- Backend: `GET /api/health`
- Frontend: `GET /` (returns 200)

## Monitoring

1. Railway Dashboard: View logs, metrics, and deployments
2. GitHub Actions: View deployment history and status

## Troubleshooting

### Deployment Fails
- Check GitHub Actions logs
- Check Railway deployment logs
- Verify all environment variables are set
- Ensure Dockerfile paths are correct

### Services Can't Connect
- Use Railway's internal URLs (e.g., `${{Postgres.DATABASE_URL}}`)
- Check network policies in Railway
- Verify service names match

### Database Migrations
Run migrations manually in Railway:
```bash
railway run alembic upgrade head
```

## Cost Estimate (Development)

- PostgreSQL: ~$5/month
- Redis: ~$5/month  
- MongoDB Atlas Free: $0
- Backend Service: ~$5/month
- Frontend Service: ~$5/month
- Keycloak Service: ~$5/month

**Total: ~$25/month** (with MongoDB Atlas free tier)

## Production Deployment

Create a separate workflow for production:
1. Copy `.github/workflows/deploy-railway-dev.yml` to `deploy-railway-prod.yml`
2. Change environment to `production`
3. Change branch trigger to `release` or `production`
4. Create separate Railway project for production
5. Add `RAILWAY_TOKEN_PROD` secret

## Next Steps

1. ✅ Set up Railway project
2. ✅ Add all services
3. ✅ Configure environment variables
4. ✅ Add Railway token to GitHub secrets
5. ✅ Push to main/develop branch
6. ✅ Verify deployment in Railway dashboard
7. Test application
8. Set up custom domain (optional)
9. Configure monitoring and alerts
