# Share Notes - Real-time Collaborative Note Taking

A scalable, real-time collaborative note-taking application built with modern technologies and designed to run on Kubernetes.

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd share-notes

# Start all services with Docker Compose
docker-compose -f docker-compose.local.yml up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8010
# API Docs: http://localhost:8010/docs
# Keycloak: http://localhost:8090
```

### Production Deployment (Coolify)

```bash
# Use the Coolify-specific docker-compose file
# In Coolify, set Docker Compose Location to:
/docker-compose.coolify.yml
```

**For detailed instructions:**
- Local development: See [DEVELOPMENT.md](./DEVELOPMENT.md)
- Coolify deployment: See [COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md)
- Quick setup: See [QUICKSTART.md](./QUICKSTART.md)

## 📋 Architecture

### Tech Stack

**Frontend:**
- React 18+ with TypeScript
- Vite (build tool)
- SCSS for styling
- Keycloak for authentication
- WebSocket for real-time collaboration

**Backend:**
- FastAPI (Python 3.11+)
- Poetry for dependency management
- Alembic for database migrations
- WebSocket support for real-time features
- Redis for session management

**Databases:**
- PostgreSQL 16 (user data, permissions, metadata)
- MongoDB 7 (note content, real-time operations)

**Authentication:**
- Keycloak 23.0 with OAuth2/OIDC

**Infrastructure:**
- Docker & Docker Compose
- Kubernetes with Horizontal Pod Autoscaling
- NGINX Ingress

**Code Quality:**
- Husky pre-commit hooks
- ESLint + Prettier (frontend)
- Black + isort (backend)
- TypeScript type checking

### Features
- ✅ Create notes (authenticated or anonymous users)
- ✅ Share notes with other users
- ✅ Real-time collaborative editing via WebSocket
- ✅ Role-based permissions (owner, editor, read-only)
- ✅ Multi-user simultaneous editing
- ✅ Secure authentication with Keycloak
- ✅ Operational transformation for conflict-free editing
- ✅ Hot module replacement in development
- ✅ Database migrations with Alembic
- ✅ Automated code quality checks

## 📁 Project Structure

```
share-notes/
├── backend/                    # FastAPI application
│   ├── app/                   # Application code
│   │   ├── main.py           # FastAPI app
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── database.py       # Database connections
│   │   ├── auth.py           # Authentication
│   │   └── routes/           # API routes
│   ├── alembic/              # Database migrations
│   ├── pyproject.toml        # Poetry dependencies
│   ├── alembic.ini           # Alembic configuration
│   └── Dockerfile            # Multi-stage Docker build
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/       # React components (.tsx)
│   │   ├── contexts/         # React contexts
│   │   ├── services/         # API services
│   │   ├── types/            # TypeScript types
│   │   ├── styles/           # SCSS styles
│   │   ├── App.tsx           # Main app
│   │   └── main.tsx          # Entry point
│   ├── package.json          # NPM dependencies
│   ├── vite.config.ts        # Vite configuration
│   ├── tsconfig.json         # TypeScript config
│   └── Dockerfile            # Multi-stage Docker build
├── infrastructure/            # Kubernetes manifests
│   └── k8s/                  # K8s YAML files
├── database/                 # Database init scripts
│   ├── postgres/             # PostgreSQL
│   └── mongodb/              # MongoDB
├── keycloak/                 # Keycloak realm config
├── .husky/                   # Git hooks
├── docker-compose.yml        # Local development
├── package.json              # Monorepo scripts
└── setup.sh                  # Automated setup
```

### Quick Setup (Automated)

```bash
# Run the automated setup script
./setup.sh
```

This will:
- Install all dependencies (root, frontend, backend)
- Set up Poetry for backend
- Create .env files from examples
- Install Husky git hooks

### Manual Setup

#### 1. Install Dependencies

**Root:**
```bash
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
poetry install
```

#### 2. Configure Environment

```bash
# Frontend
cp frontend/.env.example frontend/.env

# Backend
cp backend/.env.example backend/.env
```

Edit the `.env` files with your configuration.

#### 3. Run Database Migrations

```bash
cd backend
poetry run alembic upgrade head
```

### Local Development

**Option 1: Docker Compose (Recommended)**
```bash
docker-compose up -d
```

**Option 2: Run Services Individually**

Backend:
```bash
cd backend
poetry run uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm run dev
```

**Access Services:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Keycloak: http://localhost:8080 (admin/admin)
- MongoDB: localhost:27017
- PostgreSQL: localhost:5432

## 💻 Development

### Monorepo Commands

From the root directory:

```bash
# Frontend
npm run frontend:dev        # Start dev server
npm run frontend:build      # Build for production
npm run frontend:lint       # Lint code
npm run frontend:format     # Format code

# Backend
npm run backend:dev         # Start dev server
npm run backend:lint        # Lint and format
npm run backend:migrate     # Run migrations
npm run backend:migrate:create "migration_name"  # Create migration

# All projects
npm run lint               # Lint all
npm run format             # Format all
```

### Backend Development

```bash
cd backend

# Development server with hot reload
poetry run uvicorn app.main:app --reload

# Database migrations
poetry run alembic upgrade head                    # Apply migrations
poetry run alembic revision --autogenerate -m "description"  # Create migration
poetry run alembic downgrade -1                    # Rollback

# Code quality
poetry run black app/                 # Format code
poetry run isort app/                 # Sort imports
poetry run mypy app/                  # Type checking
poetry run pytest                     # Run tests

# Pre-commit hooks
poetry run pre-commit install         # Install hooks
poetry run pre-commit run --all-files # Run manually
```

### Frontend Development

```bash
cd frontend

# Development server with HMR
npm run dev

# Build
npm run build                  # Production build
npm run preview                # Preview production build

# Code quality
npm run lint                   # ESLint
npm run lint:fix               # Fix ESLint errors
npm run format                 # Prettier
npm run type-check             # TypeScript checking
```

## 🚢 Deployment

### Kubernetes Deployment

1. **Build and push images**
   ```bash
   ./scripts/build-images.sh
   ```

2. **Deploy to Kubernetes**
   ```bash
   ./scripts/deploy.sh
   ```

3. **Access via Ingress**
   ```bash
   kubectl get ingress -n share-notes
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 📚 Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Tech stack migration details
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Complete project summary

## 🧪 Testing

### Backend Tests
```bash
cd backend
poetry run pytest
poetry run pytest --cov=app  # With coverage
```

### Frontend Tests
```bash
cd frontend
npm run test
npm run test:coverage
```

## 🔒 Security

- Keycloak for authentication and authorization
- JWT token validation
- CORS configuration
- Role-based access control
- Secure WebSocket connections

## 📊 Monitoring

- Health check endpoints
- Horizontal Pod Autoscaling
- Resource limits and requests
- Liveness and readiness probes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linters and tests
5. Commit with pre-commit hooks
6. Push and create a pull request

Pre-commit hooks will automatically:
- Format frontend code (Prettier)
- Lint frontend code (ESLint)
- Format backend code (Black)
- Sort backend imports (isort)

## 📝 License

MIT
