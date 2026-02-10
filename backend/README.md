# GPS RAPOR Backend

TypeScript/Node.js backend for the GPS RAPOR system with Express, Socket.IO, and SQLite.

## 🏗️ Architecture

### Technology Stack
- **Node.js 18+** with TypeScript for type safety
- **Express.js** for REST API endpoints
- **Socket.IO** for real-time WebSocket communication
- **SQLite** with Sequelize ORM and optimizations
- **Redis** for caching and session management
- **JWT** for authentication with automatic refresh
- **Winston** for structured logging

### Project Structure
```
src/
├── config/           # Configuration management
├── controllers/      # Request handlers
├── database/         # Database migrations and seeds
├── middleware/       # Express middleware
├── models/          # Sequelize models
├── routes/          # API route definitions
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── test/            # Test setup and utilities
└── server.ts        # Main server entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- Redis server (optional, for caching)

### Installation
```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit environment variables
nano .env

# Run database migrations
npm run migrate

# Seed database with initial data
npm run seed

# Start development server
npm run dev
```

### Environment Configuration
Key environment variables:

```bash
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=sqlite:./data/database.sqlite

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## 📊 Database Schema

### Core Models

#### Users
- Personnel and admin user management
- Secure password hashing with bcrypt
- Role-based access control
- Device information and preferences

#### Locations
- GPS coordinates with accuracy metadata
- Battery level and source information
- Offline sync status tracking
- Spatial indexing for performance

#### Messages
- Real-time messaging with conversation support
- File attachments and location sharing
- Full-text search capabilities
- Message delivery status tracking

#### Reports
- PDF report generation and management
- Configurable report criteria
- File storage and download links
- Report expiration and cleanup

### Database Optimizations
- **WAL mode** for better concurrency
- **Connection pooling** for performance
- **Automatic indexing** for common queries
- **Full-text search** for message content

## 🔐 Security Features

### Authentication
```typescript
// JWT-based authentication
const token = generateToken(user);
const refreshToken = generateRefreshToken(user);

// Middleware for protected routes
app.use('/api/protected', authenticateToken);
```

### Authorization
```typescript
// Role-based access control
app.use('/api/admin', requireAdmin);
app.use('/api/users/:userId', requireOwnershipOrAdmin('userId'));
```

### Data Encryption
```typescript
// Encrypt sensitive data
const encryptedData = encrypt(sensitiveInfo);

// Hash passwords
const passwordHash = await hashPassword(password);
```

### Security Middleware
- **Helmet** for security headers
- **Rate limiting** to prevent abuse
- **Input sanitization** for XSS protection
- **CORS** configuration for cross-origin requests

## 🌐 API Endpoints

### Authentication
```
POST /api/auth/login      # User login
POST /api/auth/refresh    # Token refresh
POST /api/auth/logout     # User logout
```

### Users
```
GET    /api/users         # List users (admin only)
POST   /api/users         # Create user (admin only)
PUT    /api/users/:id     # Update user
DELETE /api/users/:id     # Delete user (admin only)
```

### Locations
```
POST /api/locations       # Submit location update
GET  /api/locations/:userId  # Get user locations
GET  /api/locations/history  # Location history with filters
```

### Messages
```
POST /api/messages        # Send message
GET  /api/messages/:conversationId  # Get conversation
PUT  /api/messages/:messageId/read  # Mark message as read
GET  /api/messages/search # Search messages
```

### Reports
```
POST /api/reports/generate    # Generate new report
GET  /api/reports/:reportId   # Get report details
GET  /api/reports/download/:reportId  # Download PDF
GET  /api/reports            # List reports (admin only)
```

### Health Checks
```
GET /health              # Comprehensive health check
GET /ping                # Simple availability check
GET /ready               # Readiness probe
GET /live                # Liveness probe
```

## 🔄 Real-time Communication

### Socket.IO Events

#### Client to Server
```typescript
// Authentication
socket.emit('authenticate', token);

// Location updates
socket.emit('updateLocation', {
  lat: 39.9334,
  lng: 32.8597,
  speed: 0,
  battery: 85
});

// Send message
socket.emit('sendMessage', {
  to: 'admin',
  message: 'Hello',
  type: 'text'
});
```

#### Server to Client
```typescript
// Location broadcast
io.emit('locationUpdate', locationData);

// New message notification
socket.emit('newMessage', messageData);

// System notifications
socket.emit('notification', notificationData);
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=auth
```

### Test Structure
```
src/test/
├── setup.ts              # Test configuration
├── helpers/               # Test utilities
├── unit/                  # Unit tests
├── integration/           # Integration tests
└── property/              # Property-based tests
```

### Property-Based Testing
The backend includes comprehensive property-based tests using `fast-check`:

```typescript
// Example property test
it('should handle location updates correctly', async () => {
  await fc.assert(fc.asyncProperty(
    locationGenerator(),
    async (location) => {
      const result = await locationService.updateLocation(location);
      expect(result.latitude).toBe(location.latitude);
      expect(result.longitude).toBe(location.longitude);
    }
  ));
});
```

## 📈 Performance Monitoring

### Logging
```typescript
// Structured logging with context
logInfo('User authenticated', { userId, ip: req.ip });
logError(error, { operation: 'database_query', userId });
logPerformance('location_update', duration, { userId });
```

### Health Monitoring
```typescript
// Health check with service status
const healthCheck = {
  status: 'healthy',
  services: [
    { name: 'database', status: 'healthy', responseTime: 15 },
    { name: 'redis', status: 'healthy', responseTime: 5 }
  ],
  memory: { used: 128, total: 512, percentage: 25 }
};
```

### Performance Metrics
- **Response time tracking** for all endpoints
- **Database query performance** monitoring
- **Memory usage** and garbage collection metrics
- **WebSocket connection** statistics

## 🚀 Deployment

### Docker Deployment
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
COPY tsconfig.json ./
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Environment-Specific Configurations
- **Development**: Hot reload with nodemon
- **Testing**: In-memory database and mocked services
- **Production**: Optimized builds and security hardening

## 🔧 Development Tools

### Code Quality
```bash
# Linting
npm run lint
npm run lint:fix

# Type checking
npm run type-check

# Code formatting
npm run format
```

### Database Management
```bash
# Run migrations
npm run migrate

# Seed database
npm run seed

# Reset database
npm run db:reset
```

### Debugging
```bash
# Start with debugger
npm run debug

# Debug tests
npm run test:debug
```

## 📚 Additional Resources

- [API Documentation](./docs/api.md)
- [Database Schema](./docs/database.md)
- [Security Guide](./docs/security.md)
- [Deployment Guide](./docs/deployment.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database file permissions
   ls -la data/database.sqlite
   
   # Reset database
   npm run db:reset
   ```

2. **Port Already in Use**
   ```bash
   # Find process using port 3000
   lsof -i :3000
   
   # Kill process
   kill -9 <PID>
   ```

3. **Memory Issues**
   ```bash
   # Monitor memory usage
   node --inspect server.js
   
   # Increase memory limit
   node --max-old-space-size=4096 server.js
   ```

## 📞 Support

For backend-specific issues:
- Check the logs in `./logs/` directory
- Review the health check endpoint: `GET /health`
- Enable debug logging: `DEBUG=gps-rapor:* npm run dev`