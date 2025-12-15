# 🚀 Share Notes - First Time Setup Checklist

Use this checklist to ensure everything is properly configured before running the application.

## ✅ Prerequisites Checklist

- [ ] Docker Desktop installed and running
- [ ] Docker Compose installed (comes with Docker Desktop)
- [ ] At least 8GB RAM available for Docker
- [ ] Ports available: 3000, 8000, 8080, 5432, 27017, 6379
- [ ] Git installed (for cloning)

## ✅ Local Development Setup

### Step 1: Clone and Navigate
- [ ] Repository cloned to local machine
- [ ] Navigated to project directory: `cd share-notes`

### Step 2: Environment Configuration
- [ ] Backend `.env` created: `cp backend/.env.example backend/.env`
- [ ] Frontend `.env` created: `cp frontend/.env.example frontend/.env`
- [ ] (Optional) Review and modify environment variables if needed

### Step 3: Start Services
- [ ] Run: `docker-compose up -d`
- [ ] Wait 3-4 minutes for all services to start
- [ ] Check services are running: `docker-compose ps`

### Step 4: Verify Services

Check each service is healthy:

- [ ] PostgreSQL: `docker-compose logs postgres | grep "ready to accept connections"`
- [ ] MongoDB: `docker-compose logs mongodb | grep "Waiting for connections"`
- [ ] Redis: `docker-compose logs redis | grep "Ready to accept connections"`
- [ ] Keycloak: `docker-compose logs keycloak | grep "Started"`
- [ ] Backend: `docker-compose logs backend | grep "Application startup complete"`
- [ ] Frontend: `docker-compose logs frontend | grep "webpack compiled"`

### Step 5: Access and Test

- [ ] Frontend accessible: Open http://localhost:3000
- [ ] Backend API docs accessible: Open http://localhost:8000/docs
- [ ] Keycloak admin accessible: Open http://localhost:8080 (admin/admin)

### Step 6: Test Core Features

- [ ] **Anonymous Note Creation**
  - [ ] Create a note without logging in
  - [ ] Note appears in list
  
- [ ] **Authentication**
  - [ ] Click "Login" button
  - [ ] Login with test user: test@sharenotes.com / test123
  - [ ] Username appears in header
  
- [ ] **Note Operations**
  - [ ] Create a note
  - [ ] Edit note content
  - [ ] Save note
  - [ ] Delete note
  
- [ ] **Sharing**
  - [ ] Click "Share" on owned note
  - [ ] Generate share link
  - [ ] Copy link to clipboard
  
- [ ] **Real-time Collaboration**
  - [ ] Open same note in two browser windows
  - [ ] Type in one window
  - [ ] See changes appear in other window instantly
  - [ ] See active user count

## ✅ Kubernetes Deployment (Optional)

### Prerequisites
- [ ] Kubernetes cluster available (minikube, kind, or cloud)
- [ ] kubectl installed and configured
- [ ] NGINX Ingress Controller installed
- [ ] Container registry accessible (Docker Hub, GCR, etc.)

### Build and Push
- [ ] Make scripts executable: `chmod +x scripts/*.sh`
- [ ] Build images: `./scripts/build-images.sh`
- [ ] Tag images for your registry
- [ ] Push images to registry
- [ ] Update image references in k8s manifests

### Deploy
- [ ] Update secrets in k8s manifests
- [ ] Run deployment: `./scripts/deploy.sh`
- [ ] Check pods: `kubectl get pods -n share-notes`
- [ ] All pods in "Running" state
- [ ] Get ingress IP: `kubectl get ingress -n share-notes`
- [ ] Update /etc/hosts or DNS
- [ ] Access application via domain

## ✅ Troubleshooting Checklist

If something doesn't work, check these:

### Services Won't Start
- [ ] Check Docker Desktop is running
- [ ] Check available disk space
- [ ] Check ports are not in use: `lsof -i :3000,8000,8080`
- [ ] View logs: `docker-compose logs -f [service-name]`
- [ ] Restart service: `docker-compose restart [service-name]`

### Can't Access Frontend
- [ ] Check frontend container is running: `docker-compose ps frontend`
- [ ] Check logs: `docker-compose logs frontend`
- [ ] Try different browser
- [ ] Clear browser cache

### Authentication Issues
- [ ] Check Keycloak is running: `docker-compose ps keycloak`
- [ ] Wait longer (Keycloak takes 1-2 minutes to start)
- [ ] Access Keycloak admin: http://localhost:8080
- [ ] Verify realm 'sharenotes' exists
- [ ] Check client configurations

### Database Connection Errors
- [ ] Check database containers running
- [ ] Check database logs
- [ ] Restart databases: `docker-compose restart postgres mongodb`
- [ ] Verify environment variables in backend/.env

### WebSocket Not Working
- [ ] Check browser console for errors
- [ ] Verify backend is running
- [ ] Check WebSocket endpoint: ws://localhost:8000
- [ ] Try different browser

## ✅ Next Steps After Setup

- [ ] Read ARCHITECTURE.md to understand the system
- [ ] Read DEVELOPMENT.md for development workflow
- [ ] Read DEPLOYMENT.md for production deployment
- [ ] Try creating multiple notes
- [ ] Test sharing with different permission levels
- [ ] Explore API documentation at /docs
- [ ] Review Keycloak configuration
- [ ] Set up monitoring (optional)

## ✅ Security Checklist (Production)

Before deploying to production:

- [ ] Change all default passwords
- [ ] Update Keycloak admin password
- [ ] Update database passwords
- [ ] Generate new Keycloak client secrets
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS/TLS
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Enable database encryption
- [ ] Set up backup strategy
- [ ] Configure log retention
- [ ] Enable monitoring and alerting
- [ ] Review and harden Kubernetes security

## ✅ Performance Checklist (Production)

- [ ] Configure database connection pooling
- [ ] Set up database read replicas
- [ ] Enable Redis cluster mode
- [ ] Configure CDN for static assets
- [ ] Set appropriate resource limits
- [ ] Configure HPA thresholds
- [ ] Enable database query optimization
- [ ] Set up caching strategy
- [ ] Configure load balancer

## 📊 Success Metrics

You'll know everything is working when:

✅ All containers are running (7 total)  
✅ Frontend loads without errors  
✅ Can create notes without login  
✅ Can login with test user  
✅ Real-time collaboration works  
✅ Sharing generates valid links  
✅ Multiple users can edit simultaneously  
✅ No errors in any service logs  

## 🎉 Congratulations!

If you've checked all the boxes above, your Share Notes application is fully configured and running!

---

**Need Help?**
- Review logs: `docker-compose logs -f`
- Check documentation in respective .md files
- Ensure Docker has enough resources allocated
- Try restarting: `docker-compose restart`

**Stuck?**
- Create an issue with:
  - What you were trying to do
  - What happened instead
  - Relevant log output
  - Your environment (OS, Docker version)
