# Share Notes - Monorepo

This is the root package.json for managing the entire monorepo.

## Scripts

### Frontend
- `npm run frontend:dev` - Start frontend development server
- `npm run frontend:build` - Build frontend for production
- `npm run frontend:lint` - Lint frontend code
- `npm run frontend:format` - Format frontend code

### Backend
- `npm run backend:dev` - Start backend development server
- `npm run backend:lint` - Lint and format backend code
- `npm run backend:migrate` - Run database migrations
- `npm run backend:migrate:create "migration_name"` - Create new migration

### Husky
- `npm run prepare` - Install Husky hooks (runs automatically after npm install)

## Setup

1. Install root dependencies:
   ```bash
   npm install
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend && npm install
   ```

3. Install backend dependencies:
   ```bash
   cd backend && poetry install
   ```

4. Husky hooks will be automatically installed and will run linting on commit.
