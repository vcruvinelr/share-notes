# Migration Guide - Tech Stack Modernization

This guide documents the changes made to modernize the Share Notes application tech stack.

## Overview of Changes

### Frontend Migration: CRA → Vite + TypeScript + SCSS

**Before:**
- Create React App (CRA)
- JavaScript (.js files)
- CSS with Tailwind
- No pre-commit hooks

**After:**
- Vite (faster build tool)
- TypeScript (.tsx files)
- SCSS with variables
- ESLint + Prettier pre-commit hooks

### Backend Migration: requirements.txt → Poetry + Alembic

**Before:**
- pip + requirements.txt
- No migration tool
- Basic Dockerfile

**After:**
- Poetry for dependency management
- Alembic for database migrations
- Black + isort pre-commit hooks
- Multi-stage Dockerfile with Poetry

## Migration Steps

### 1. Frontend Setup (First Time)

```bash
cd frontend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Start development server
npm run dev
```

The Vite dev server will run on `http://localhost:3000` with hot module replacement (HMR).

### 2. Backend Setup (First Time)

```bash
cd backend

# Install Poetry (if not already installed)
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies
poetry install

# Copy environment file
cp .env.example .env

# Run database migrations
poetry run alembic upgrade head

# Start development server
poetry run uvicorn app.main:app --reload
```

The FastAPI server will run on `http://localhost:8000` with auto-reload.

### 3. Husky Pre-commit Hooks Setup (First Time)

```bash
# From root directory
npm install

# This will automatically install Husky hooks
# Hooks will run on every git commit to ensure code quality
```

## New Commands

### Frontend

```bash
# Development
npm run dev              # Start Vite dev server with HMR
npm run build           # Build for production (outputs to dist/)
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint errors
npm run format          # Format code with Prettier
npm run type-check      # Run TypeScript type checking
```

### Backend

```bash
# Development
poetry run uvicorn app.main:app --reload    # Start with auto-reload

# Database Migrations
poetry run alembic upgrade head                    # Apply migrations
poetry run alembic revision --autogenerate -m "description"  # Create new migration
poetry run alembic downgrade -1                    # Rollback last migration
poetry run alembic history                         # View migration history

# Code Quality
poetry run black app/                # Format code
poetry run isort app/                # Sort imports
poetry run mypy app/                 # Type checking
poetry run pytest                    # Run tests

# Pre-commit
poetry run pre-commit install        # Install hooks
poetry run pre-commit run --all-files  # Run manually
```

### Monorepo (from root)

```bash
# Quick commands
npm run frontend:dev       # Start frontend dev server
npm run frontend:build     # Build frontend
npm run frontend:lint      # Lint frontend
npm run frontend:format    # Format frontend

npm run backend:dev        # Start backend dev server
npm run backend:lint       # Lint & format backend
npm run backend:migrate    # Run migrations
npm run backend:migrate:create "migration_name"  # Create migration

npm run lint              # Lint both projects
npm run format            # Format both projects
```

## Docker Compose Changes

### Updated Services

**Backend:**
- Now uses Poetry in multi-stage build
- Hot reload with volume mounts for `app/` and `alembic/` directories
- Runs with `poetry run` commands

**Frontend:**
- Now uses Vite instead of CRA
- Environment variables changed from `REACT_APP_*` to `VITE_*`
- Build output changed from `build/` to `dist/`
- Volume mounts updated for Vite config files

### Running with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Rebuild after dependency changes
docker-compose up -d --build
```

## File Changes Summary

### New Files Created

**Frontend:**
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `tsconfig.node.json` - TypeScript config for Vite
- `.eslintrc.cjs` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `src/vite-env.d.ts` - Vite environment types
- `src/types/index.ts` - TypeScript type definitions
- `src/styles/variables.scss` - SCSS variables
- `src/styles/main.scss` - Global SCSS styles
- All `.tsx` files (converted from `.js`)
- All `.scss` files (converted from `.css`)

**Backend:**
- `pyproject.toml` - Poetry configuration
- `alembic.ini` - Alembic configuration
- `alembic/env.py` - Alembic environment
- `alembic/script.py.mako` - Migration template
- `alembic/versions/001_initial.py` - Initial migration
- `.pre-commit-config.yaml` - Pre-commit hooks config

**Root:**
- `package.json` - Monorepo scripts
- `.husky/pre-commit` - Pre-commit hook script
- `README_MONOREPO.md` - Monorepo documentation

### Modified Files

- `frontend/Dockerfile` - Updated for Vite and TypeScript
- `backend/Dockerfile` - Updated for Poetry
- `docker-compose.yml` - Updated environment variables and volumes

### Removed Files

- `frontend/package-lock.json` - Will be regenerated on `npm install`
- `backend/requirements.txt` - Replaced by `pyproject.toml`

## Breaking Changes

### Environment Variables

**Frontend:**
- `REACT_APP_API_URL` → `VITE_API_URL`
- `REACT_APP_WS_URL` → `VITE_WS_URL`
- `REACT_APP_KEYCLOAK_URL` → `VITE_KEYCLOAK_URL`
- `REACT_APP_KEYCLOAK_REALM` → `VITE_KEYCLOAK_REALM`
- `REACT_APP_KEYCLOAK_CLIENT_ID` → `VITE_KEYCLOAK_CLIENT_ID`

**Backend:**
- No breaking changes, all environment variables remain the same

### Import Changes

**Frontend:**
All imports now use TypeScript:
```typescript
// Before
import { useState } from 'react';

// After (same, but with types)
import { useState } from 'react';
```

Access to env variables changed:
```typescript
// Before
process.env.REACT_APP_API_URL

// After
import.meta.env.VITE_API_URL
```

## Benefits of Migration

### Frontend (Vite + TypeScript + SCSS)

1. **Faster Development**: Vite provides instant HMR and faster builds
2. **Type Safety**: TypeScript catches errors at compile time
3. **Better IDE Support**: IntelliSense and autocomplete
4. **Maintainable Styles**: SCSS variables and nesting
5. **Code Quality**: ESLint + Prettier ensure consistent code

### Backend (Poetry + Alembic)

1. **Better Dependency Management**: Poetry lock file ensures reproducibility
2. **Database Migrations**: Alembic provides version control for database schema
3. **Code Quality**: Black + isort ensure consistent formatting
4. **Virtual Environment**: Poetry manages virtual environments automatically
5. **Development Tools**: Easy access to mypy, pytest, etc.

### Husky Hooks

1. **Automated Quality Checks**: Code is automatically linted before commit
2. **Team Consistency**: Everyone follows the same code standards
3. **Fewer Bugs**: Catches issues before they reach the repository

## Troubleshooting

### Frontend Issues

**Issue:** `npm install` fails
```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Issue:** TypeScript errors
```bash
# Check types without running
npm run type-check
```

**Issue:** Vite port already in use
```bash
# Change port in vite.config.ts or kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Backend Issues

**Issue:** Poetry command not found
```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -
export PATH="$HOME/.local/bin:$PATH"
```

**Issue:** Alembic migration fails
```bash
# Check current migration status
poetry run alembic current

# View migration history
poetry run alembic history

# Rollback if needed
poetry run alembic downgrade -1
```

**Issue:** Import errors after Poetry install
```bash
# Reinstall dependencies
poetry install --no-root
```

### Docker Issues

**Issue:** Build fails after migration
```bash
# Clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

**Issue:** Hot reload not working
```bash
# Check volume mounts in docker-compose.yml
# Ensure correct paths are mounted
```

## Next Steps

1. **Test thoroughly**: Run all tests to ensure nothing broke
2. **Update CI/CD**: Update pipeline to use Poetry and Vite
3. **Team training**: Ensure team is familiar with new tools
4. **Documentation**: Keep this guide updated as you make changes

## Rollback Plan

If you need to rollback:

1. **Frontend**: Checkout previous commit before migration
2. **Backend**: Remove Poetry files, restore `requirements.txt`
3. **Docker**: Revert `docker-compose.yml` and Dockerfiles

```bash
# Example rollback
git checkout <previous-commit-hash> -- frontend/ backend/ docker-compose.yml
```

## Support

For questions or issues:
- Check the main README.md
- Review QUICKSTART.md for setup
- Check DEVELOPMENT.md for development workflow
