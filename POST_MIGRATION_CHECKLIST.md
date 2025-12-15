# Post-Migration Checklist

Use this checklist after completing the tech stack migration to ensure everything is working correctly.

## ✅ Installation & Setup

- [ ] Run `./setup.sh` successfully
- [ ] Frontend dependencies installed (`frontend/node_modules` exists)
- [ ] Backend dependencies installed (Poetry virtual environment created)
- [ ] Husky hooks installed (`.husky/pre-commit` is executable)
- [ ] `.env` files created from examples

## ✅ Frontend Verification

### Build & Development
- [ ] `cd frontend && npm run dev` starts successfully
- [ ] Frontend accessible at http://localhost:3000
- [ ] Hot module replacement (HMR) works (edit a file and see instant changes)
- [ ] `npm run build` completes without errors
- [ ] Build output in `frontend/dist/` directory

### TypeScript
- [ ] `npm run type-check` passes without errors
- [ ] IDE shows TypeScript autocomplete
- [ ] No TypeScript errors in editor

### Code Quality
- [ ] `npm run lint` passes
- [ ] `npm run lint:fix` fixes issues
- [ ] `npm run format` formats code
- [ ] ESLint warnings/errors are addressed

### Features
- [ ] Can create a new note
- [ ] Can edit a note
- [ ] Authentication works (login/logout)
- [ ] WebSocket connection establishes
- [ ] Real-time collaboration works

## ✅ Backend Verification

### Installation
- [ ] `poetry --version` shows Poetry is installed
- [ ] `poetry install` completes successfully
- [ ] Virtual environment created (`.venv` directory)

### Development Server
- [ ] `cd backend && poetry run uvicorn app.main:app --reload` starts
- [ ] Backend accessible at http://localhost:8000
- [ ] API docs accessible at http://localhost:8000/docs
- [ ] Hot reload works (edit a file and server restarts)

### Database Migrations
- [ ] `poetry run alembic current` shows current migration
- [ ] `poetry run alembic upgrade head` applies migrations
- [ ] `poetry run alembic history` shows migration history
- [ ] Database tables created in PostgreSQL

### Code Quality
- [ ] `poetry run black app/` formats code
- [ ] `poetry run isort app/` sorts imports
- [ ] `poetry run mypy app/` runs type checking (if configured)
- [ ] `poetry run flake8 app/` passes linting

### API Endpoints
- [ ] GET `/api/notes/` returns notes list
- [ ] POST `/api/notes/` creates a note
- [ ] WebSocket connection `/ws/notes/{id}` works
- [ ] Authentication endpoints work

## ✅ Husky & Git Hooks

### Pre-commit Hooks
- [ ] Make a test change in frontend
- [ ] `git add .` and `git commit -m "test"`
- [ ] Pre-commit hook runs automatically
- [ ] ESLint runs on frontend files
- [ ] Prettier formats frontend files
- [ ] Black runs on backend files
- [ ] isort runs on backend files
- [ ] Commit succeeds after formatting

### Manual Testing
- [ ] `npm run lint` (root) runs both frontend and backend linting
- [ ] `npm run format` (root) formats both projects

## ✅ Docker & Docker Compose

### Build
- [ ] `docker-compose build` completes successfully
- [ ] Frontend image builds with Vite
- [ ] Backend image builds with Poetry

### Startup
- [ ] `docker-compose up -d` starts all services
- [ ] All containers are running: `docker-compose ps`
- [ ] No error logs: `docker-compose logs`

### Services
- [ ] PostgreSQL healthy: `docker-compose ps postgres`
- [ ] MongoDB healthy: `docker-compose ps mongodb`
- [ ] Redis healthy: `docker-compose ps redis`
- [ ] Keycloak healthy: `docker-compose ps keycloak`
- [ ] Backend healthy: `docker-compose ps backend`
- [ ] Frontend healthy: `docker-compose ps frontend`

### Hot Reload in Docker
- [ ] Edit a frontend file in `frontend/src/`
- [ ] Changes reflect in browser without rebuild
- [ ] Edit a backend file in `backend/app/`
- [ ] Backend restarts automatically

### Environment Variables
- [ ] Frontend uses `VITE_*` variables
- [ ] Backend environment variables work
- [ ] Services can communicate

## ✅ Application Features

### Authentication
- [ ] Can click "Login" button
- [ ] Redirects to Keycloak
- [ ] Can login with test user
- [ ] Redirects back to app
- [ ] Shows logged-in user
- [ ] Can logout

### Notes Management
- [ ] Can create a note (authenticated)
- [ ] Can create a note (anonymous)
- [ ] Can view notes list
- [ ] Can open a note
- [ ] Can edit note title
- [ ] Can edit note content
- [ ] Can save a note
- [ ] Can delete a note

### Sharing
- [ ] Can click "Share" button
- [ ] Can generate share link
- [ ] Share link copies to clipboard
- [ ] Can share with user email
- [ ] Can set permission level (read/write/admin)

### Real-time Collaboration
- [ ] Open same note in two browsers
- [ ] Type in one browser
- [ ] See changes in other browser instantly
- [ ] Both users can edit simultaneously
- [ ] User count updates
- [ ] Active users shown

## ✅ Code Quality

### Frontend
- [ ] All files use TypeScript (.tsx)
- [ ] All styles use SCSS (.scss)
- [ ] No console errors in browser
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Code is formatted consistently

### Backend
- [ ] All code formatted with Black
- [ ] Imports sorted with isort
- [ ] No flake8 warnings
- [ ] Type hints used where appropriate
- [ ] Docstrings present

## ✅ Documentation

- [ ] README.md updated with new tech stack
- [ ] MIGRATION_GUIDE.md explains all changes
- [ ] QUICKSTART.md still accurate
- [ ] TECH_STACK_UPDATE_SUMMARY.md created
- [ ] All code examples use new syntax
- [ ] Environment variables documented

## ✅ Deployment Preparation

### Images
- [ ] `./scripts/build-images.sh` builds images
- [ ] Images tagged correctly
- [ ] Images pushed to registry (if applicable)

### Kubernetes
- [ ] `kubectl apply -f infrastructure/k8s/` works
- [ ] All pods start successfully
- [ ] Services are accessible
- [ ] Ingress configured correctly

### Environment Variables
- [ ] Production .env files prepared
- [ ] Secrets configured in K8s
- [ ] ConfigMaps created

## ✅ Performance

### Frontend
- [ ] Vite dev server starts in < 3 seconds
- [ ] HMR updates in < 100ms
- [ ] Production build completes in < 30 seconds
- [ ] Build size is reasonable

### Backend
- [ ] Server starts in < 5 seconds
- [ ] API responds in < 100ms
- [ ] WebSocket latency < 50ms
- [ ] Migrations run quickly

## 🐛 Troubleshooting

If any checks fail, refer to:
- `MIGRATION_GUIDE.md` - Troubleshooting section
- `README.md` - Setup instructions
- `QUICKSTART.md` - Quick fixes
- Docker logs: `docker-compose logs [service]`
- Application logs

## 📝 Notes

**Date Completed:** _______________

**Completed By:** _______________

**Issues Found:** 
- 
- 
- 

**Resolved:**
- 
- 
- 

**Outstanding:**
- 
- 
- 

---

**Migration Status:** [ ] Complete [ ] Pending [ ] Issues

**Ready for Production:** [ ] Yes [ ] No [ ] Pending Testing
