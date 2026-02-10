# Role-Based Access Control (RBAC) Implementation

## Overview

This document describes the implementation of Role-Based Access Control (RBAC) for the GPS RAPOR System. The RBAC system provides fine-grained access control based on user roles and permissions, ensuring that users can only access resources and perform actions appropriate to their role.

## Architecture

### Roles

The system supports two primary roles:

1. **Personnel** (`personnel`): Field workers who are tracked and can access their own data
2. **Admin** (`admin`): System administrators with full access to manage users and system resources

### Permission System

Permissions are defined as granular capabilities that can be assigned to roles. The system uses an enum-based permission model:

```typescript
enum Permission {
  // User management
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLES = 'user:manage_roles',
  
  // Location management
  LOCATION_READ_OWN = 'location:read_own',
  LOCATION_READ_ALL = 'location:read_all',
  LOCATION_CREATE = 'location:create',
  
  // Message management
  MESSAGE_READ_OWN = 'message:read_own',
  MESSAGE_READ_ALL = 'message:read_all',
  MESSAGE_CREATE = 'message:create',
  MESSAGE_DELETE = 'message:delete',
  
  // Report management
  REPORT_READ = 'report:read',
  REPORT_CREATE = 'report:create',
  REPORT_DELETE = 'report:delete',
  
  // System management
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_MONITOR = 'system:monitor',
}
```

### Role-Permission Mapping

#### Personnel Role Permissions
- `USER_READ`: View user information
- `LOCATION_READ_OWN`: View own location data
- `LOCATION_CREATE`: Create location updates
- `MESSAGE_READ_OWN`: View own messages
- `MESSAGE_CREATE`: Send messages
- `REPORT_READ`: View reports

#### Admin Role Permissions
All personnel permissions plus:
- `USER_CREATE`: Create new users
- `USER_UPDATE`: Update user information
- `USER_DELETE`: Delete users
- `USER_MANAGE_ROLES`: Change user roles
- `LOCATION_READ_ALL`: View all users' locations
- `MESSAGE_READ_ALL`: View all messages
- `MESSAGE_DELETE`: Delete messages
- `REPORT_CREATE`: Generate reports
- `REPORT_DELETE`: Delete reports
- `SYSTEM_ADMIN`: Full system administration
- `SYSTEM_MONITOR`: System monitoring access

## Middleware Components

### 1. Authentication Middleware

**`authenticateToken`**: Validates JWT tokens and attaches user information to the request.

```typescript
app.use(authenticateToken);
```

Features:
- Validates JWT signature and expiration
- Retrieves fresh user data from database
- Checks if user is active
- Attaches user info to `req.user`

### 2. Role-Based Middleware

#### `requireAdmin`
Ensures the user has admin role.

```typescript
router.get('/admin-only', authenticateToken, requireAdmin, handler);
```

#### `requirePersonnel`
Ensures the user has personnel or admin role.

```typescript
router.get('/personnel-route', authenticateToken, requirePersonnel, handler);
```

#### `requireAnyRole(...roles)`
Ensures the user has one of the specified roles.

```typescript
router.get('/flexible-route', authenticateToken, requireAnyRole('personnel', 'admin'), handler);
```

### 3. Permission-Based Middleware

#### `requirePermission(...permissions)`
Ensures the user has at least one of the specified permissions.

```typescript
router.post('/users', authenticateToken, requirePermission(Permission.USER_CREATE), handler);
```

### 4. Ownership Middleware

#### `requireOwnershipOrAdmin(userIdParam)`
Ensures the user is either an admin or the owner of the resource.

```typescript
router.get('/user/:userId/profile', authenticateToken, requireOwnershipOrAdmin('userId'), handler);
```

## Admin API Endpoints

All admin endpoints are protected by authentication and admin role requirements.

### User Management

#### GET /api/admin/users
Get all users with pagination and filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `role`: Filter by role (personnel | admin)
- `isActive`: Filter by active status (true | false)
- `search`: Search by name, personnelId, or email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "personnelId": "PERS01",
      "name": "John Doe",
      "role": "personnel",
      "email": "john@example.com",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### GET /api/admin/users/:userId
Get user by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "personnelId": "PERS01",
    "name": "John Doe",
    "role": "personnel",
    "email": "john@example.com",
    "phone": "+1234567890",
    "isActive": true,
    "preferences": {},
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/admin/users
Create new user.

**Request Body:**
```json
{
  "personnelId": "PERS02",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!",
  "role": "personnel",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "personnelId": "PERS02",
    "name": "Jane Smith",
    "role": "personnel",
    "isActive": true
  },
  "message": "User created successfully"
}
```

#### PUT /api/admin/users/:userId
Update user information.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "phone": "+1234567890",
  "role": "admin",
  "isActive": true,
  "preferences": {}
}
```

#### DELETE /api/admin/users/:userId
Delete user.

**Note:** Admins cannot delete themselves.

#### PATCH /api/admin/users/:userId/role
Update user role.

**Request Body:**
```json
{
  "role": "admin"
}
```

**Note:** Admins cannot change their own role.

#### PATCH /api/admin/users/:userId/status
Toggle user active status.

**Note:** Admins cannot change their own status.

#### POST /api/admin/users/:userId/reset-password
Reset user password.

**Request Body:**
```json
{
  "newPassword": "NewSecurePass123!"
}
```

#### GET /api/admin/users/statistics
Get user statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 50,
    "active": 45,
    "inactive": 5,
    "personnel": 42,
    "admin": 8,
    "recentlyActive": 30
  }
}
```

## Security Features

### 1. Authentication
- JWT-based token authentication
- Automatic token validation on each request
- Fresh user data retrieval from database
- Active user status verification

### 2. Authorization
- Role-based access control
- Permission-based access control
- Resource ownership verification
- Admin privilege checks

### 3. Security Logging
All security-related events are logged:
- Authentication attempts (success/failure)
- Authorization failures
- Admin actions (user creation, deletion, role changes)
- Suspicious activity

### 4. Rate Limiting
Admin endpoints are protected by rate limiting:
- 100 requests per 15 minutes per IP
- Prevents brute force attacks
- Protects against DoS attacks

### 5. Input Validation
All admin endpoints use express-validator for:
- Request body validation
- Parameter validation
- Data sanitization
- Type checking

## Usage Examples

### Protecting Routes with Role-Based Access

```typescript
import { authenticateToken, requireAdmin, requirePermission, Permission } from '@/middleware/auth';

// Admin-only route
router.get('/admin-dashboard', authenticateToken, requireAdmin, getDashboard);

// Permission-based route
router.post('/users', authenticateToken, requirePermission(Permission.USER_CREATE), createUser);

// Ownership or admin route
router.get('/user/:userId/data', authenticateToken, requireOwnershipOrAdmin('userId'), getUserData);
```

### Checking Permissions Programmatically

```typescript
import { hasPermission, Permission } from '@/middleware/auth';

if (hasPermission(user.role, Permission.USER_CREATE)) {
  // User can create users
}
```

### Admin API Client Example

```typescript
// Login as admin
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin@example.com',
    password: 'AdminPass123!'
  })
});

const { tokens } = await loginResponse.json();

// Get all users
const usersResponse = await fetch('/api/admin/users?page=1&limit=20', {
  headers: {
    'Authorization': `Bearer ${tokens.accessToken}`
  }
});

const users = await usersResponse.json();

// Create new user
const createResponse = await fetch('/api/admin/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${tokens.accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    personnelId: 'PERS03',
    name: 'New User',
    password: 'SecurePass123!',
    role: 'personnel'
  })
});
```

## Testing

The RBAC implementation includes comprehensive test coverage:

### Unit Tests (`rbac.test.ts`)
- Admin role middleware
- Personnel role middleware
- Any role middleware
- Permission-based middleware
- Ownership middleware
- Permission system validation

### Integration Tests (`admin.test.ts`)
- User listing with pagination and filtering
- User retrieval by ID
- User creation
- User updates
- User deletion
- Role management
- Status toggling
- Password reset
- User statistics

Run tests:
```bash
npm test -- rbac.test.ts
npm test -- admin.test.ts
```

## Best Practices

1. **Always authenticate first**: Use `authenticateToken` before any authorization middleware
2. **Use specific permissions**: Prefer `requirePermission` over `requireAdmin` when possible
3. **Log security events**: All authorization failures are automatically logged
4. **Validate input**: Always use validation middleware on admin endpoints
5. **Check ownership**: Use `requireOwnershipOrAdmin` for user-specific resources
6. **Rate limit**: Apply rate limiting to all admin endpoints
7. **Test thoroughly**: Write tests for all permission combinations

## Future Enhancements

Potential improvements to the RBAC system:

1. **Dynamic Permissions**: Allow runtime permission assignment
2. **Role Hierarchy**: Support role inheritance
3. **Resource-Level Permissions**: Fine-grained permissions per resource
4. **Permission Groups**: Group related permissions
5. **Audit Trail**: Detailed audit log for all admin actions
6. **Multi-Factor Authentication**: Additional security for admin accounts
7. **Session Management**: Track and manage active admin sessions
8. **IP Whitelisting**: Restrict admin access to specific IPs

## Troubleshooting

### Common Issues

**Issue**: "Invalid or inactive user" error
- **Cause**: User account is deactivated or deleted
- **Solution**: Verify user status in database, reactivate if needed

**Issue**: "Insufficient permissions" error
- **Cause**: User role doesn't have required permission
- **Solution**: Check role-permission mapping, update user role if needed

**Issue**: "Access denied" error on ownership routes
- **Cause**: User trying to access another user's resource
- **Solution**: Verify user ID matches resource owner or user is admin

**Issue**: Rate limit exceeded
- **Cause**: Too many requests in short time
- **Solution**: Wait for rate limit window to reset (15 minutes)

## Compliance

The RBAC implementation supports compliance with:
- **GDPR**: User data access control and audit logging
- **SOC 2**: Access control and security monitoring
- **ISO 27001**: Information security management

## References

- [Requirements Document](../.kiro/specs/gps-rapor-redesign/requirements.md) - Requirement 8.5
- [Design Document](../.kiro/specs/gps-rapor-redesign/design.md) - Property 17
- [Authentication Implementation](./AUTHENTICATION_IMPLEMENTATION.md)
- [API Documentation](./API_DOCUMENTATION.md)
