# Share Notes - Architecture Documentation

## System Overview

Share Notes is a real-time collaborative note-taking application built with a microservices architecture designed to run on Kubernetes.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Ingress                              │
│                    (NGINX Ingress)                           │
└───────────┬─────────────────┬──────────────────┬────────────┘
            │                 │                  │
            │                 │                  │
    ┌───────▼──────┐  ┌──────▼──────┐   ┌──────▼──────┐
    │   Frontend   │  │   Backend   │   │  Keycloak   │
    │   (React)    │  │  (FastAPI)  │   │   (Auth)    │
    │              │  │             │   │             │
    └──────────────┘  └──────┬──────┘   └──────┬──────┘
                             │                 │
                 ┌───────────┼─────────────────┤
                 │           │                 │
         ┌───────▼───┐  ┌───▼────┐    ┌──────▼──────┐
         │ PostgreSQL│  │MongoDB │    │    Redis    │
         │  (Users,  │  │ (Note  │    │ (Sessions,  │
         │   Perms)  │  │Content)│    │  WebSocket) │
         └───────────┘  └────────┘    └─────────────┘
```

## Technology Stack

### Frontend
- **React 18**: UI framework
- **React Router**: Client-side routing
- **Keycloak JS**: Authentication client
- **Axios**: HTTP client
- **WebSocket**: Real-time communication
- **Tailwind CSS**: Styling (via inline classes)

### Backend
- **FastAPI**: Python web framework
- **WebSocket**: Real-time collaboration
- **SQLAlchemy**: PostgreSQL ORM
- **Motor**: Async MongoDB driver
- **Python-Keycloak**: Authentication client
- **Redis**: Session management

### Databases
- **PostgreSQL**: Relational data (users, permissions, note metadata)
- **MongoDB**: Document storage (note content, operations)
- **Redis**: Caching and WebSocket state

### Authentication
- **Keycloak**: Identity and access management

### Infrastructure
- **Docker**: Containerization
- **Kubernetes**: Orchestration
- **NGINX Ingress**: Load balancing and routing

## Data Model

### PostgreSQL Schema

```sql
-- Users table
users
  - id (UUID, PK)
  - keycloak_id (String, unique)
  - email (String, unique)
  - username (String, unique)
  - is_anonymous (Boolean)
  - created_at (DateTime)
  - updated_at (DateTime)

-- Notes table
notes
  - id (UUID, PK)
  - title (String)
  - owner_id (UUID, FK -> users.id)
  - is_public (Boolean)
  - share_token (String, unique)
  - mongodb_content_id (String)
  - created_at (DateTime)
  - updated_at (DateTime)

-- Note permissions table
note_permissions
  - id (UUID, PK)
  - note_id (UUID, FK -> notes.id)
  - user_id (UUID, FK -> users.id)
  - permission_level (Enum: READ, WRITE, ADMIN)
  - granted_at (DateTime)
```

### MongoDB Schema

```javascript
// note_contents collection
{
  _id: ObjectId,
  content: String,
  created_at: DateTime,
  updated_at: DateTime,
  operations: [
    {
      type: String,      // insert, delete, replace
      position: Number,
      content: String,
      length: Number,
      user_id: String,
      timestamp: DateTime
    }
  ]
}
```

## API Endpoints

### Notes API

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/notes/` | List all accessible notes | Optional |
| POST | `/api/notes/` | Create a new note | Optional |
| GET | `/api/notes/{id}` | Get note details | Optional |
| PUT | `/api/notes/{id}` | Update note | Required (Write) |
| DELETE | `/api/notes/{id}` | Delete note | Required (Owner) |
| POST | `/api/notes/{id}/share` | Share note | Required (Owner) |
| GET | `/api/notes/shared/{token}` | Access shared note | None |

### WebSocket Protocol

**Connection**: `ws://backend/ws/notes/{note_id}?user_id={user_id}&username={username}&token={jwt_token}`

**Message Types**:

```javascript
// Client -> Server
{
  type: "edit",
  operation: "insert" | "delete" | "replace",
  position: number,
  content: string,
  length: number
}

{
  type: "cursor",
  position: number,
  selection_end: number
}

{
  type: "get_content"
}

// Server -> Client
{
  type: "content",
  content: string,
  timestamp: string
}

{
  type: "edit",
  user_id: string,
  username: string,
  operation: string,
  position: number,
  content: string,
  length: number,
  timestamp: string
}

{
  type: "user_joined" | "user_left",
  user_id: string,
  username: string,
  timestamp: string
}

{
  type: "user_list",
  users: [{user_id: string, username: string}]
}
```

## Real-time Collaboration

### Operational Transformation

The system uses a simplified operational transformation approach:

1. **Client edits**: Detected at character level in textarea
2. **Operation generation**: Convert edit to operation (insert/delete/replace)
3. **Broadcast**: Send operation to all connected clients
4. **Apply**: Other clients apply operation to their local state
5. **Persistence**: Operations stored in MongoDB for conflict resolution

### Conflict Resolution

- Operations are timestamped
- MongoDB stores operation history
- Cursor positions are tracked separately
- Last-write-wins strategy for simple conflicts

## Authentication Flow

1. User clicks "Login"
2. Redirected to Keycloak login page
3. User authenticates with Keycloak
4. Keycloak redirects back with authorization code
5. Frontend exchanges code for JWT token
6. Token stored in localStorage
7. Token included in API requests (Authorization header)
8. Backend validates token with Keycloak
9. User session established

### Anonymous Access

- Anonymous users can create and edit notes
- Temporary user ID generated client-side
- Anonymous users tracked in database
- Can upgrade to authenticated account later

## Scalability

### Horizontal Scaling

- **Frontend**: Stateless, can scale infinitely
- **Backend**: Mostly stateless, WebSocket state in Redis
- **Databases**: Read replicas for PostgreSQL, sharding for MongoDB

### Performance Optimizations

1. **Database Indexing**
   - PostgreSQL: Indexes on user_id, note_id, share_token
   - MongoDB: Indexes on created_at, updated_at

2. **Caching**
   - Redis for session data
   - Browser caching for static assets

3. **Connection Pooling**
   - PostgreSQL connection pools
   - MongoDB connection pools

4. **Load Balancing**
   - NGINX Ingress for L7 load balancing
   - Kubernetes Service for L4 load balancing

### Auto-scaling

- **HPA (Horizontal Pod Autoscaler)**
  - Frontend: Scale based on CPU (70% threshold)
  - Backend: Scale based on CPU (70%) and Memory (80%)
  - Min replicas: 2, Max replicas: 10

## Security

### Authentication & Authorization

- **Keycloak**: Industry-standard OAuth2/OIDC
- **JWT tokens**: Secure, stateless authentication
- **Role-based access**: Owner, Write, Read permissions
- **Token refresh**: Automatic token refresh every 60s

### Data Security

- **Encryption in transit**: TLS/SSL for all connections
- **Encryption at rest**: Database-level encryption
- **Secrets management**: Kubernetes Secrets
- **Password hashing**: Keycloak handles with bcrypt

### Network Security

- **Network policies**: Restrict pod-to-pod communication
- **Ingress rules**: Only expose necessary endpoints
- **CORS**: Configured for specific origins
- **Rate limiting**: Can be added at Ingress level

## Monitoring & Observability

### Metrics to Monitor

- **Application**: Request rate, response time, error rate
- **Database**: Connection pool size, query performance
- **WebSocket**: Active connections, message throughput
- **Infrastructure**: CPU, memory, disk, network

### Health Checks

- **Liveness probes**: Ensure pods are running
- **Readiness probes**: Ensure pods can serve traffic
- **Database health**: Connection and query tests

## Disaster Recovery

### Backup Strategy

1. **PostgreSQL**: Daily pg_dump backups
2. **MongoDB**: Daily mongodump backups
3. **Offsite storage**: Upload to S3/GCS
4. **Retention**: 30 days

### Recovery Procedures

1. **Database restore**: Restore from latest backup
2. **Application restart**: Roll back to previous version
3. **Data validation**: Verify data integrity
4. **Gradual rollout**: Progressive deployment

## Future Enhancements

1. **Rich text editing**: Implement WYSIWYG editor
2. **File attachments**: Support images and files
3. **Comments**: Add commenting system
4. **Version history**: Track note revisions
5. **Search**: Full-text search with Elasticsearch
6. **Mobile apps**: Native iOS/Android apps
7. **Offline support**: PWA with service workers
8. **Real-time presence**: Show active users with cursors
9. **Video chat**: Integrate video conferencing
10. **AI features**: Auto-summarization, suggestions
