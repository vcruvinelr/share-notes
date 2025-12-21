# Share Notes - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Docker and Docker Compose installed
- At least 8GB RAM available
- Ports 3000, 8000, 8080, 5432, 27017, 6379 available

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd share-notes

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Step 2: Start All Services

```bash
# Start all services with Docker Compose
docker-compose up -d

# Watch the logs (optional)
docker-compose logs -f
```

### Step 3: Wait for Services to Start

Services start in this order:
1. PostgreSQL (30 seconds)
2. MongoDB (30 seconds)
3. Redis (10 seconds)
4. Keycloak (1-2 minutes)
5. Backend (30 seconds)
6. Frontend (30 seconds)

**Total wait time: ~3-4 minutes**

### Step 4: Access the Application

| Service | URL | Credentials |
|---------|-----|-------------|
| **Application** | http://localhost:3000 | - |
| **API Docs** | http://localhost:8000/docs | - |
| **Keycloak Admin** | http://localhost:8080 | admin / admin |

### Step 5: Test the Application

#### Option A: Login with Test User

1. Click "Login" button
2. Use credentials:
   - **Email**: `test@sharenotes.com`
   - **Password**: `test123`

#### Option B: Use Anonymous Mode

1. Just start creating notes without logging in!

### Step 6: Create Your First Note

1. Enter a note title (e.g., "My First Note")
2. Click "Create Note"
3. Start typing in the editor
4. Click "Save"

### Step 7: Test Real-time Collaboration

1. Open the same note in two browser windows (or tabs)
2. Type in one window
3. See the changes appear in the other window in real-time! 🎉

### Step 8: Share a Note

1. Open any note you own
2. Click "Share" button
3. Choose one:
   - **Share with user**: Enter email and permission level
   - **Generate link**: Click "Generate Link" to get shareable URL

## 🛑 Stop Services

```bash
docker-compose down
```

## 🗑️ Clean Up (Remove All Data)

```bash
docker-compose down -v
```

## ⚙️ Advanced: Kubernetes Deployment

For production deployment on Kubernetes:

```bash
# Build images
./scripts/build-images.sh

# Deploy to Kubernetes
./scripts/deploy.sh

# Check status
kubectl get pods -n share-notes
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 📚 Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system
- Read [DEVELOPMENT.md](DEVELOPMENT.md) for development setup
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment

## 🐛 Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Restart specific service
docker-compose restart backend
```

### Can't access the application

```bash
# Check if services are running
docker-compose ps

# Ensure ports are not in use
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
lsof -i :8090  # Keycloak
```

### Database connection errors

```bash
# Restart databases
docker-compose restart postgres mongodb

# Check database logs
docker-compose logs postgres
docker-compose logs mongodb
```

## 💡 Tips

1. **First startup takes longer** - Keycloak needs to initialize its database
2. **Use incognito windows** for testing multi-user features
3. **Clear browser cache** if you see stale data
4. **Check logs** if something doesn't work: `docker-compose logs -f`

## 🎯 Feature Highlights

✅ **Anonymous note creation** - No login required  
✅ **Real-time collaboration** - Multiple users can edit simultaneously  
✅ **Secure authentication** - OAuth2/OIDC via Keycloak  
✅ **Share notes** - With specific users or via link  
✅ **Permission control** - Read-only, Edit, or Admin access  
✅ **WebSocket powered** - Instant updates across all clients  
✅ **Production ready** - Kubernetes manifests included  
✅ **Scalable** - Auto-scaling with HPA  
✅ **Database choice** - PostgreSQL for metadata, MongoDB for content  

## 📞 Need Help?

- Check [CONTRIBUTING.md](CONTRIBUTING.md) for how to report issues
- Review logs: `docker-compose logs -f`
- Ensure Docker has enough memory allocated (8GB minimum)

Enjoy using Share Notes! 📝✨
