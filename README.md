# GPS RAPOR System Redesign

A comprehensive location tracking and personnel management system designed for Atılım Gıda. This redesign addresses critical synchronization, reliability, and performance issues while introducing modern architecture patterns and robust error handling.

## 🚀 Features

- **Real-time Location Tracking**: Continuous GPS monitoring with offline support
- **Secure Messaging System**: Real-time communication with message queuing
- **Automated PDF Reports**: Comprehensive reporting with embedded maps
- **Offline-First Architecture**: Full functionality without internet connectivity
- **Modern Security**: JWT authentication, AES-256 encryption, TLS 1.3
- **Scalable Infrastructure**: Docker deployment with Redis caching
- **Comprehensive Monitoring**: Health checks, logging, and performance metrics

## 🏗️ Architecture

### Backend (Node.js/TypeScript)
- **Express.js** with TypeScript for type safety
- **Socket.IO** for real-time WebSocket communication
- **SQLite** with connection pooling and optimizations
- **Redis** for caching and session management
- **JWT** authentication with automatic refresh
- **Comprehensive logging** with Winston

### Frontend (Flutter/Dart)
- **Material Design 3** with dark/light theme support
- **Background location services** for continuous tracking
- **Offline-first data storage** with SQLite
- **Real-time synchronization** with conflict resolution
- **Push notifications** via Firebase Cloud Messaging

### Infrastructure
- **Docker** containerization for easy deployment
- **Nginx** reverse proxy with SSL termination
- **Raspberry Pi** compatible deployment
- **Automated backups** and monitoring

## 📋 Requirements

### System Requirements
- **Node.js** 18+ (for backend)
- **Flutter** 3.0+ (for mobile app)
- **Docker** and Docker Compose (for deployment)
- **Redis** (for caching)
- **SQLite** (database)

### Hardware Requirements
- **Raspberry Pi 4** (minimum 4GB RAM recommended)
- **32GB+ SD Card** (Class 10 or better)
- **Stable internet connection**

## 🚀 Quick Start

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gps-rapor-redesign
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   flutter pub get
   flutter run
   ```

### Production Deployment

1. **Using Docker Compose**
   ```bash
   # Copy environment file
   cp backend/.env.example backend/.env
   
   # Edit environment variables
   nano backend/.env
   
   # Deploy
   docker-compose up -d
   ```

2. **Using Deployment Script**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

## 🔧 Configuration

### Environment Variables

Key environment variables for production:

```bash
# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key

# Database
DATABASE_URL=sqlite:./data/database.sqlite

# Redis
REDIS_URL=redis://localhost:6379

# Notifications
FCM_SERVER_KEY=your-fcm-server-key
FCM_SENDER_ID=your-fcm-sender-id
```

### Database Configuration

The system uses SQLite with optimizations for performance:
- WAL mode for better concurrency
- Connection pooling
- Automatic indexing
- Full-text search for messages

## 📱 Mobile App Features

### Location Tracking
- **Continuous GPS monitoring** in foreground and background
- **Battery optimization** with adaptive update intervals
- **Offline location storage** with automatic sync
- **Network fallback** when GPS is unavailable

### Messaging
- **Real-time messaging** with Socket.IO
- **Offline message composition** and queuing
- **Message history** with full-text search
- **File attachments** up to 10MB

### Reporting
- **Daily and weekly reports** with location data
- **PDF generation** with embedded maps
- **Automatic report distribution**
- **Report history and download**

## 🔒 Security Features

### Authentication & Authorization
- **JWT-based authentication** with automatic refresh
- **Role-based access control** (Personnel/Admin)
- **Secure password hashing** with bcrypt
- **Session management** with Redis

### Data Protection
- **AES-256 encryption** for sensitive data at rest
- **TLS 1.3** for all communications
- **Input sanitization** and validation
- **Rate limiting** and DDoS protection

### Security Monitoring
- **Suspicious activity detection**
- **Security event logging**
- **Failed login attempt tracking**
- **IP-based access control**

## 📊 Monitoring & Logging

### Health Checks
- **Database connectivity** monitoring
- **Redis availability** checks
- **Memory usage** tracking
- **Response time** monitoring

### Logging
- **Structured logging** with Winston
- **Log rotation** and archival
- **Error tracking** with stack traces
- **Performance metrics** collection

### Alerting
- **System health alerts**
- **Performance threshold warnings**
- **Security incident notifications**
- **Capacity planning alerts**

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Frontend Testing
```bash
cd frontend
flutter test               # Unit tests
flutter test integration_test/  # Integration tests
```

### Property-Based Testing
The system includes comprehensive property-based tests to verify correctness properties across all components.

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout

### Location Endpoints
- `POST /api/locations` - Submit location update
- `GET /api/locations/:userId` - Get user locations
- `GET /api/locations/history` - Location history

### Message Endpoints
- `POST /api/messages` - Send message
- `GET /api/messages/:conversationId` - Get conversation
- `PUT /api/messages/:messageId/read` - Mark as read

### Report Endpoints
- `POST /api/reports/generate` - Generate report
- `GET /api/reports/:reportId` - Get report
- `GET /api/reports/download/:reportId` - Download PDF

## 🔄 Data Synchronization

### Offline-First Design
- **Local SQLite storage** for all data
- **Operation queuing** for offline actions
- **Automatic synchronization** when online
- **Conflict resolution** with timestamp precedence

### Sync Process
1. **Incremental sync** with delta updates
2. **Compression** for bandwidth optimization
3. **Retry mechanisms** with exponential backoff
4. **Data integrity** validation

## 🚀 Deployment

### Docker Deployment
The system is containerized for easy deployment:

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - backend_data:/app/data
      - backend_uploads:/app/uploads
```

### Raspberry Pi Deployment
Optimized for Raspberry Pi 4:
- **ARM64 compatible** Docker images
- **Resource optimization** for limited hardware
- **Automatic startup** and monitoring
- **Log rotation** and cleanup

## 📈 Performance Optimization

### Database Optimization
- **Connection pooling** for concurrent access
- **Query optimization** with proper indexing
- **Data compression** for storage efficiency
- **Automatic cleanup** of old data

### Caching Strategy
- **Redis caching** for frequently accessed data
- **Application-level caching** for computed results
- **CDN integration** for static assets
- **Cache invalidation** strategies

## 🛠️ Maintenance

### Backup Strategy
- **Automated daily backups** of database
- **File system backups** for uploads
- **Backup rotation** (keep last 30 days)
- **Backup verification** and testing

### Updates and Patches
- **Rolling updates** with zero downtime
- **Database migrations** with rollback support
- **Configuration updates** without restart
- **Security patch management**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is proprietary software developed for Atılım Gıda.

## 📞 Support

For technical support or questions:
- **Email**: support@gpsrapor.com
- **Documentation**: See `/docs` folder
- **Issues**: Use GitHub issues for bug reports

---

**GPS RAPOR System v2.0** - Built with ❤️ for reliable personnel tracking and management.