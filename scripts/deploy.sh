#!/bin/bash

# GPS RAPOR System Deployment Script
# This script handles deployment to Raspberry Pi using Coolify

set -e

# Configuration
PROJECT_NAME="gps-rapor-redesign"
DOCKER_COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="/opt/gps-rapor/backups"
LOG_FILE="/opt/gps-rapor/logs/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check available disk space (minimum 2GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 2097152 ]]; then
        error "Insufficient disk space. At least 2GB required."
        exit 1
    fi
    
    log "System requirements check passed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    sudo mkdir -p /opt/gps-rapor/{data,uploads,logs,backups,ssl}
    sudo chown -R $USER:$USER /opt/gps-rapor
    chmod 755 /opt/gps-rapor
    
    log "Directories created successfully"
}

# Backup existing data
backup_data() {
    if [[ -f "/opt/gps-rapor/data/database.sqlite" ]]; then
        log "Creating backup of existing data..."
        
        backup_timestamp=$(date +%Y%m%d_%H%M%S)
        backup_file="$BACKUP_DIR/backup_$backup_timestamp.tar.gz"
        
        tar -czf "$backup_file" -C /opt/gps-rapor data uploads
        
        log "Backup created: $backup_file"
        
        # Keep only last 5 backups
        ls -t $BACKUP_DIR/backup_*.tar.gz | tail -n +6 | xargs -r rm
    else
        log "No existing data to backup"
    fi
}

# Set environment variables
setup_environment() {
    log "Setting up environment variables..."
    
    # Generate secure secrets if they don't exist
    if [[ ! -f ".env.production" ]]; then
        log "Generating production environment file..."
        
        JWT_SECRET=$(openssl rand -hex 32)
        ENCRYPTION_KEY=$(openssl rand -hex 16)
        
        cat > .env.production << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Database
DATABASE_URL=sqlite:/app/data/database.sqlite

# Redis
REDIS_URL=redis://redis:6379

# Logging
LOG_LEVEL=info

# File Uploads
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/app/uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
        
        log "Production environment file created"
    else
        log "Using existing production environment file"
    fi
}

# Build and deploy containers
deploy_containers() {
    log "Building and deploying containers..."
    
    # Pull latest images
    docker-compose -f $DOCKER_COMPOSE_FILE pull
    
    # Build and start services
    docker-compose -f $DOCKER_COMPOSE_FILE up -d --build
    
    log "Containers deployed successfully"
}

# Health check
health_check() {
    log "Performing health check..."
    
    max_attempts=30
    attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:3000/health &> /dev/null; then
            log "Health check passed"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    sudo tee /etc/logrotate.d/gps-rapor > /dev/null << EOF
/opt/gps-rapor/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        docker-compose -f /opt/gps-rapor/$DOCKER_COMPOSE_FILE restart backend
    endscript
}
EOF
    
    log "Log rotation configured"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create monitoring script
    cat > /opt/gps-rapor/monitor.sh << 'EOF'
#!/bin/bash

# Simple monitoring script for GPS RAPOR system
LOG_FILE="/opt/gps-rapor/logs/monitor.log"

check_service() {
    service_name=$1
    if docker-compose -f /opt/gps-rapor/docker-compose.yml ps $service_name | grep -q "Up"; then
        echo "[$(date)] $service_name is running" >> $LOG_FILE
        return 0
    else
        echo "[$(date)] $service_name is down, attempting restart" >> $LOG_FILE
        docker-compose -f /opt/gps-rapor/docker-compose.yml restart $service_name
        return 1
    fi
}

# Check all services
check_service backend
check_service redis

# Check disk space
available_space=$(df / | awk 'NR==2 {print $4}')
if [[ $available_space -lt 1048576 ]]; then
    echo "[$(date)] WARNING: Low disk space - ${available_space}KB available" >> $LOG_FILE
fi

# Check memory usage
memory_usage=$(free | awk 'NR==2{printf "%.2f%%", $3*100/$2}')
echo "[$(date)] Memory usage: $memory_usage" >> $LOG_FILE
EOF
    
    chmod +x /opt/gps-rapor/monitor.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/gps-rapor/monitor.sh") | crontab -
    
    log "Monitoring setup completed"
}

# Main deployment function
main() {
    log "Starting GPS RAPOR system deployment..."
    
    check_root
    check_requirements
    create_directories
    backup_data
    setup_environment
    deploy_containers
    
    if health_check; then
        setup_log_rotation
        setup_monitoring
        log "Deployment completed successfully!"
        log "System is available at: http://localhost:3000"
    else
        error "Deployment failed - health check did not pass"
        exit 1
    fi
}

# Run main function
main "$@"