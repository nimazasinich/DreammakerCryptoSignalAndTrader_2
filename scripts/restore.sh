#!/bin/bash

# Restore Script for BOLT AI Trading System
# Usage: ./scripts/restore.sh [BACKUP_FILE]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/restore.sh [BACKUP_FILE]"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/backup-*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log_info "========================================="
log_info "BOLT AI Trading System - Restore"
log_info "========================================="
log_info "Backup file: $BACKUP_FILE"
log_info "Timestamp: $(date)"
log_info "========================================="
echo ""

# Validate backup file
log_info "Validating backup file..."
if ! tar -tzf "$BACKUP_FILE" &> /dev/null; then
    log_error "Invalid backup file (corrupted or not a valid tar.gz)"
    exit 1
fi
log_success "Backup file is valid"

# Create pre-restore backup
log_info "Creating pre-restore backup..."
PRERESTORE_BACKUP="./backups/pre-restore-$(date +%Y-%m-%d-%H-%M).tar.gz"
if [ -d "./data" ]; then
    tar -czf "$PRERESTORE_BACKUP" ./data ./config 2>/dev/null || log_warning "Pre-restore backup failed"
    log_success "Pre-restore backup created: $PRERESTORE_BACKUP"
fi

# Stop services
log_info "Stopping services..."
if [ -f "docker-compose.yml" ]; then
    docker-compose down || log_warning "Failed to stop services"
else
    log_warning "docker-compose.yml not found, skipping service stop"
fi

# Extract backup to temporary directory
log_info "Extracting backup..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR" || {
    log_error "Failed to extract backup"
    exit 1
}
log_success "Backup extracted to temporary directory"

# Restore database files
log_info "Restoring database files..."
if [ -d "$TEMP_DIR/data" ]; then
    mkdir -p ./data
    cp -f "$TEMP_DIR/data"/* ./data/ 2>/dev/null || log_warning "No database files to restore"
    log_success "Database files restored"
else
    log_warning "No database files in backup"
fi

# Restore configuration files
log_info "Restoring configuration files..."
if [ -d "$TEMP_DIR/config" ]; then
    mkdir -p ./config
    cp -rf "$TEMP_DIR/config"/* ./config/ 2>/dev/null || log_warning "No config files to restore"
    log_success "Configuration files restored"
else
    log_warning "No configuration files in backup"
fi

# Restore logs
log_info "Restoring logs..."
if [ -d "$TEMP_DIR/logs" ]; then
    mkdir -p ./data/logs
    cp -f "$TEMP_DIR/logs"/* ./data/logs/ 2>/dev/null || log_warning "No logs to restore"
    log_success "Logs restored"
else
    log_warning "No logs in backup"
fi

# Verify data integrity
log_info "Verifying data integrity..."
if [ -f "./data/bolt.db" ]; then
    if command -v sqlite3 &> /dev/null; then
        sqlite3 ./data/bolt.db "PRAGMA integrity_check;" | grep "ok" &> /dev/null || {
            log_error "Database integrity check failed"
            log_warning "Restoring pre-restore backup..."
            tar -xzf "$PRERESTORE_BACKUP" -C ./ 2>/dev/null || true
            exit 1
        }
        log_success "Database integrity check passed"
    else
        log_warning "sqlite3 not installed, skipping integrity check"
    fi
else
    log_warning "Database file not found, skipping integrity check"
fi

# Set proper permissions
log_info "Setting proper permissions..."
chmod -R 644 ./data/*.db 2>/dev/null || true
chmod -R 755 ./data/logs 2>/dev/null || true
log_success "Permissions set"

# Start services
log_info "Starting services..."
if [ -f "docker-compose.yml" ]; then
    docker-compose up -d || {
        log_error "Failed to start services"
        log_warning "Restoring pre-restore backup..."
        tar -xzf "$PRERESTORE_BACKUP" -C ./ 2>/dev/null || true
        exit 1
    }
    log_success "Services started"
else
    log_warning "docker-compose.yml not found, skipping service start"
fi

# Wait for services to be ready
log_info "Waiting for services to be ready..."
sleep 10

# Run health check
log_info "Running health check..."
if [ -x "./scripts/health-check.sh" ]; then
    ./scripts/health-check.sh http://localhost:8001 || {
        log_error "Health check failed after restore"
        log_warning "Please investigate manually"
        exit 1
    }
else
    log_warning "Health check script not found, using basic check"
    curl -f http://localhost:8001/api/health || {
        log_warning "Basic health check failed, please investigate manually"
    }
fi

echo ""
log_info "========================================="
log_success "Restore completed successfully!"
log_info "========================================="
echo ""
log_info "Next steps:"
echo "  1. Verify application functionality"
echo "  2. Check logs: docker-compose logs -f"
echo "  3. Monitor for any issues"
echo ""
log_info "Pre-restore backup saved at: $PRERESTORE_BACKUP"
echo ""

exit 0

