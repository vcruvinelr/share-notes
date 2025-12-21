# Share Notes - Development Guide

## Quick Start with Docker Compose

The easiest way to run the entire stack locally is using Docker Compose:

```bash
# Start all services (PostgreSQL, MongoDB, Redis, Keycloak, Backend, Frontend)
docker-compose -f docker-compose.local.yml up -d

# View logs
docker-compose -f docker-compose.local.yml logs -f

# Stop all services
docker-compose -f docker-compose.local.yml down

# Stop and remove volumes (fresh start)
docker-compose -f docker-compose.local.yml down -v
```

**Services will be available at:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8010
- API Docs: http://localhost:8010/docs
- Keycloak: http://localhost:8090
- PostgreSQL: localhost:5432
- MongoDB: localhost:27017
- Redis: localhost:6379

**Default credentials:**
- Keycloak Admin: `admin` / `admin`
- PostgreSQL: `syncpad` / `syncpad_dev_password`
- MongoDB: `syncpad` / `syncpad_dev_password`

> 💡 **Note:** The local docker-compose automatically creates the Keycloak database, so you won't encounter database errors.

## Manual Development Setup (Alternative)

If you prefer to run services individually without Docker:

### Backend Development

1. **Create virtual environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Run database migrations**
   ```bash
   # Start PostgreSQL and MongoDB using Docker Compose
   docker-compose up -d postgres mongodb
   
   # Create tables (FastAPI will do this automatically on startup)
   # Or manually run:
   # alembic upgrade head
   ```

5. **Start development server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

6. **Access API documentation**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Frontend Development

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Access application**
   - Frontend: http://localhost:3000

### Testing

#### Backend Tests

```bash
cd backend
pytest
pytest --cov=app tests/  # With coverage
```

#### Frontend Tests

```bash
cd frontend
npm test
npm test -- --coverage  # With coverage
```

## Code Structure

### Backend Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration
│   ├── database.py          # Database setup
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # Authentication
│   └── routes/
│       ├── __init__.py
│       ├── notes.py         # Note CRUD endpoints
│       └── websocket.py     # WebSocket handlers
├── requirements.txt
├── Dockerfile
└── .env.example
```

### Frontend Structure

```
frontend/
├── public/
│   ├── index.html
│   └── silent-check-sso.html
├── src/
│   ├── components/
│   │   ├── NoteList.js      # Note list component
│   │   └── NoteEditor.js    # Note editor component
│   ├── contexts/
│   │   └── AuthContext.js   # Authentication context
│   ├── services/
│   │   ├── api.js           # API client
│   │   ├── noteService.js   # Note API calls
│   │   └── websocket.js     # WebSocket service
│   ├── App.js               # Main application
│   ├── App.css
│   ├── index.js
│   ├── index.css
│   └── config.js            # Configuration
├── package.json
├── Dockerfile
└── .env.example
```

## Development Workflow

### Creating a New Feature

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Backend changes**
   - Add/modify models in `app/models.py`
   - Add/modify schemas in `app/schemas.py`
   - Add/modify routes in `app/routes/`
   - Add tests in `tests/`

3. **Frontend changes**
   - Add/modify components in `src/components/`
   - Add/modify services in `src/services/`
   - Update state management if needed

4. **Test changes**
   ```bash
   # Backend
   cd backend
   pytest
   
   # Frontend
   cd frontend
   npm test
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

6. **Create pull request**

## Debugging

### Backend Debugging

1. **Use Python debugger**
   ```python
   import pdb; pdb.set_trace()
   ```

2. **Enable debug logging**
   ```python
   import logging
   logging.basicConfig(level=logging.DEBUG)
   ```

3. **Check logs**
   ```bash
   docker-compose logs -f backend
   ```

### Frontend Debugging

1. **Use React DevTools**
   - Install Chrome/Firefox extension
   - Inspect component state and props

2. **Console logging**
   ```javascript
   console.log('Debug info:', data);
   ```

3. **Network inspection**
   - Open browser DevTools
   - Check Network tab for API calls
   - Check WebSocket frames

### Database Debugging

1. **PostgreSQL**
   ```bash
   docker-compose exec postgres psql -U sharenotes -d sharenotes
   ```

2. **MongoDB**
   ```bash
   docker-compose exec mongodb mongosh -u sharenotes -p sharenotes_dev_password
   ```

## Common Issues

### Backend issues

**Issue**: Database connection error
```
Solution: Ensure PostgreSQL and MongoDB are running
docker-compose up -d postgres mongodb
```

**Issue**: Keycloak authentication fails
```
Solution: Check Keycloak is running and realm is configured
docker-compose up -d keycloak
Access http://localhost:8080 and verify realm 'sharenotes' exists
```

### Frontend issues

**Issue**: WebSocket connection fails
```
Solution: Ensure backend is running and WebSocket endpoint is accessible
Check browser console for connection errors
```

**Issue**: CORS errors
```
Solution: Update CORS_ORIGINS in backend .env file
CORS_ORIGINS=["http://localhost:3000"]
```

## Performance Tips

### Backend

1. **Use async/await** for database operations
2. **Implement connection pooling** for databases
3. **Add caching** with Redis for frequently accessed data
4. **Optimize database queries** with proper indexes

### Frontend

1. **Use React.memo** for expensive components
2. **Implement code splitting** with React.lazy
3. **Debounce** user input for search/filter
4. **Optimize WebSocket** message handling

## Code Style

### Backend (Python)

- Follow PEP 8
- Use type hints
- Maximum line length: 100 characters
- Use Black for formatting
- Use isort for import sorting

```bash
black app/
isort app/
```

### Frontend (JavaScript)

- Use ESLint with React rules
- Use Prettier for formatting
- Maximum line length: 100 characters
- Use functional components with hooks
- Use meaningful variable names

```bash
npm run lint
npm run format
```

## Git Commit Messages

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example:
```
feat: add real-time cursor tracking
fix: resolve WebSocket reconnection issue
docs: update API documentation
```

## Environment Variables

### Backend (.env)

```bash
DATABASE_URL=postgresql://sharenotes:password@localhost:5432/sharenotes
MONGODB_URL=mongodb://sharenotes:password@localhost:27017/sharenotes?authSource=admin
MONGODB_DB_NAME=sharenotes
REDIS_URL=redis://localhost:6379
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=sharenotes
KEYCLOAK_CLIENT_ID=sharenotes-backend
KEYCLOAK_CLIENT_SECRET=your-client-secret
CORS_ORIGINS=["http://localhost:3000"]
DEBUG=True
```

### Frontend (.env)

```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
REACT_APP_KEYCLOAK_URL=http://localhost:8080
REACT_APP_KEYCLOAK_REALM=sharenotes
REACT_APP_KEYCLOAK_CLIENT_ID=sharenotes-frontend
```

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
