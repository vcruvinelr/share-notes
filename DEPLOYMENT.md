# Share Notes - Deployment Guide

## Prerequisites

### Local Development
- Docker Desktop with Kubernetes enabled
- kubectl CLI
- Node.js 18+
- Python 3.11+

### Production
- Kubernetes cluster (1.24+)
- kubectl configured to access your cluster
- NGINX Ingress Controller
- cert-manager (for TLS certificates)
- Container registry (Docker Hub, GCR, ECR, etc.)

## Local Development with Docker Compose

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd share-notes
   ```

2. **Create environment files**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Keycloak Admin: http://localhost:8080 (admin/admin)

5. **Test users**
   - Admin: admin@sharenotes.com / admin123
   - Test User: test@sharenotes.com / test123

## Kubernetes Deployment

### Step 1: Build and Push Docker Images

```bash
# Build images
chmod +x scripts/build-images.sh
./scripts/build-images.sh

# Tag for your registry
docker tag share-notes-backend:latest <your-registry>/share-notes-backend:latest
docker tag share-notes-frontend:latest <your-registry>/share-notes-frontend:latest

# Push to registry
docker push <your-registry>/share-notes-backend:latest
docker push <your-registry>/share-notes-frontend:latest
```

### Step 2: Update Kubernetes Manifests

Update image references in:
- `infrastructure/k8s/05-backend.yaml`
- `infrastructure/k8s/06-frontend.yaml`

Update secrets in:
- `infrastructure/k8s/01-postgres.yaml` - PostgreSQL password
- `infrastructure/k8s/02-mongodb.yaml` - MongoDB password
- `infrastructure/k8s/04-keycloak.yaml` - Keycloak admin password
- `infrastructure/k8s/05-backend.yaml` - Keycloak client secret

### Step 3: Install Prerequisites

```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager (for TLS)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### Step 4: Deploy Application

```bash
# Make deploy script executable
chmod +x scripts/deploy.sh

# Deploy
./scripts/deploy.sh
```

### Step 5: Configure DNS

Add the following entries to your DNS or `/etc/hosts`:
```
<INGRESS_IP> share-notes.local
<INGRESS_IP> backend.share-notes.local
<INGRESS_IP> keycloak.share-notes.local
```

Get the Ingress IP:
```bash
kubectl get ingress -n share-notes
```

### Step 6: Update Keycloak Configuration

1. Access Keycloak admin console: http://keycloak.share-notes.local
2. Login with admin credentials
3. Update redirect URIs in client configurations:
   - `sharenotes-frontend`: Add your actual domain
   - `sharenotes-backend`: Add your actual domain

### Step 7: Access the Application

- Frontend: http://share-notes.local
- Backend API: http://backend.share-notes.local
- Keycloak: http://keycloak.share-notes.local

## Monitoring and Maintenance

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/backend -n share-notes

# Frontend logs
kubectl logs -f deployment/frontend -n share-notes

# Database logs
kubectl logs -f deployment/postgres -n share-notes
kubectl logs -f deployment/mongodb -n share-notes
```

### Scale Services

```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n share-notes

# Scale frontend
kubectl scale deployment frontend --replicas=5 -n share-notes
```

### Backup Databases

```bash
# PostgreSQL backup
kubectl exec -it deployment/postgres -n share-notes -- pg_dump -U sharenotes sharenotes > backup.sql

# MongoDB backup
kubectl exec -it deployment/mongodb -n share-notes -- mongodump --db sharenotes --out /tmp/backup
```

## Cleanup

```bash
chmod +x scripts/cleanup.sh
./scripts/cleanup.sh
```

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name> -n share-notes
kubectl logs <pod-name> -n share-notes
```

### Database connection issues
```bash
# Test PostgreSQL connection
kubectl exec -it deployment/postgres -n share-notes -- psql -U sharenotes -d sharenotes

# Test MongoDB connection
kubectl exec -it deployment/mongodb -n share-notes -- mongosh -u sharenotes -p <password>
```

### WebSocket connection issues
- Ensure NGINX Ingress is configured with WebSocket support
- Check ingress annotations in `07-ingress.yaml`
- Verify firewall/security group rules allow WebSocket connections

## Production Considerations

1. **Security**
   - Change all default passwords
   - Use Kubernetes Secrets management (e.g., Sealed Secrets, External Secrets)
   - Enable TLS/SSL certificates
   - Configure network policies
   - Enable pod security policies

2. **High Availability**
   - Use StatefulSets for databases
   - Configure database replication
   - Set up monitoring and alerting
   - Implement backup strategies

3. **Performance**
   - Configure resource limits appropriately
   - Enable HPA (Horizontal Pod Autoscaler)
   - Use Redis cluster for session management
   - Configure database connection pooling
   - Implement CDN for static assets

4. **Monitoring**
   - Install Prometheus and Grafana
   - Configure application metrics
   - Set up log aggregation (ELK/EFK stack)
   - Configure alerting rules
