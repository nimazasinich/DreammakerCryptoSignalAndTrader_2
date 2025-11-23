#!/bin/bash

# Backup Script for BOLT AI Trading System
# Usage: ./scripts/backup.sh

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y-%m-%d-%H-%M)
BACKUP_NAME="backup-$TIMESTAMP.tar.gz"
RETENTION_DAYS=30

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log_info "Starting backup process..."
log_info "Backup name: $BACKUP_NAME"

# Create temporary directory for backup staging
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Backup SQLite database files
log_info "Backing up database files..."
if [ -d "./data" ]; then
    mkdir -p "$TEMP_DIR/data"
    find ./data -name "*.db" -exec cp {} "$TEMP_DIR/data/" \; 2>/dev/null || log_warning "No database files found"
    find ./data -name "*.db-shm" -exec cp {} "$TEMP_DIR/data/" \; 2>/dev/null || true
    find ./data -name "*.db-wal" -exec cp {} "$TEMP_DIR/data/" \; 2>/dev/null || true
fi

# Backup configuration files
log_info "Backing up configuration files..."
if [ -d "./config" ]; then
    mkdir -p "$TEMP_DIR/config"
    cp -r ./config/* "$TEMP_DIR/config/" 2>/dev/null || log_warning "No config files found"
fi

# Backup recent logs (last 7 days)
log_info "Backing up recent logs..."
if [ -d "./data/logs" ]; then
    mkdir -p "$TEMP_DIR/logs"
    find ./data/logs -type f -mtime -7 -exec cp {} "$TEMP_DIR/logs/" \; 2>/dev/null || log_warning "No recent logs found"
fi

# Backup environment file (without secrets)
if [ -f ".env" ]; then
    log_info "Backing up environment configuration (sanitized)..."
    grep -v -E '(TOKEN|SECRET|PASSWORD|KEY)' .env > "$TEMP_DIR/.env.backup" 2>/dev/null || true
fi

# Create compressed archive
log_info "Creating compressed archive..."
cd "$TEMP_DIR"
tar -czf "$BACKUP_NAME" . || {
    log_error "Failed to create backup archive"
    exit 1
}
cd - > /dev/null

# Move backup to backup directory
mv "$TEMP_DIR/$BACKUP_NAME" "$BACKUP_DIR/"
log_info "Backup saved to: $BACKUP_DIR/$BACKUP_NAME"

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
log_info "Backup size: $BACKUP_SIZE"

# Upload to S3 if configured
if [ -n "$AWS_ACCESS_KEY" ] && [ -n "$AWS_SECRET_KEY" ] && [ -n "$S3_BACKUP_BUCKET" ]; then
    log_info "Uploading backup to S3..."
    aws s3 cp "$BACKUP_DIR/$BACKUP_NAME" "s3://$S3_BACKUP_BUCKET/bolt-ai/" || {
        log_warning "Failed to upload to S3"
    }
fi

# Cleanup old backups
log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup-*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup-*.tar.gz" -type f | wc -l)
log_info "Total backups retained: $BACKUP_COUNT"

# Create backup manifest
cat > "$BACKUP_DIR/latest-backup.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backup_name": "$BACKUP_NAME",
  "backup_size": "$BACKUP_SIZE",
  "retention_days": $RETENTION_DAYS,
  "total_backups": $BACKUP_COUNT
}
EOF

log_info "Backup completed successfully!"

# Send notification if configured
if [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✅ Backup completed: $BACKUP_NAME ($BACKUP_SIZE)\"}" \
        2>/dev/null || true
fi

exit 0

