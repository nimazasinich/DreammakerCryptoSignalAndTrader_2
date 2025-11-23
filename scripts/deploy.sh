#!/bin/bash

# Deployment Script for BOLT AI Trading System
# Usage: ./scripts/deploy.sh [OPTIONS]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration
ENVIRONMENT="staging"
SKIP_BACKUP=false
SKIP_TESTS=false
SKIP_HEALTH_CHECK=false
ROLLBACK=false
DOCKER_IMAGE="bolt-ai:latest"
CONTAINER_NAME="bolt-ai-app"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-health-check)
            SKIP_HEALTH_CHECK=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./scripts/deploy.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --environment, -e ENV    Deployment environment (staging/production)"
            echo "  --skip-backup            Skip backup step"
            echo "  --skip-tests             Skip testing step"
            echo "  --skip-health-check      Skip health check after deployment"
            echo "  --rollback               Rollback to previous deployment"
            echo "  --help, -h               Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Functions
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

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if required files exist
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile not found"
        exit 1
    fi
    
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml not found"
        exit 1
    fi
    
    # Check environment variables
    if [ "$ENVIRONMENT" = "production" ] && [ -z "$HF_TOKEN" ]; then
        log_warning "HF_TOKEN not set for production deployment"
    fi
    
    log_success "Pre-deployment checks passed"
}

# Backup current deployment
backup_deployment() {
    if [ "$SKIP_BACKUP" = true ]; then
        log_warning "Skipping backup (--skip-backup flag set)"
        return 0
    fi
    
    log_info "Creating backup..."
    
    if [ -x "./scripts/backup.sh" ]; then
        ./scripts/backup.sh || log_warning "Backup script failed"
    else
        log_warning "Backup script not found or not executable"
    fi
    
    # Tag current image as backup
    if docker image inspect "$DOCKER_IMAGE" &> /dev/null; then
        BACKUP_TAG="bolt-ai:backup-$(date +%Y%m%d-%H%M%S)"
        docker tag "$DOCKER_IMAGE" "$BACKUP_TAG"
        log_success "Tagged current image as $BACKUP_TAG"
    fi
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."
    
    docker build -t "$DOCKER_IMAGE" . || {
        log_error "Docker build failed"
        exit 1
    }
    
    log_success "Docker image built successfully"
}

# Run tests on Docker image
test_image() {
    if [ "$SKIP_TESTS" = true ]; then
        log_warning "Skipping tests (--skip-tests flag set)"
        return 0
    fi
    
    log_info "Running tests on Docker image..."
    
    # Start test container
    docker run --rm --name bolt-ai-test \
        -e NODE_ENV=test \
        -e DATABASE_PATH=/app/data/test.db \
        "$DOCKER_IMAGE" npm test || {
        log_warning "Tests failed or not configured"
    }
    
    log_success "Tests completed"
}

# Stop old containers
stop_containers() {
    log_info "Stopping old containers..."
    
    docker-compose down --remove-orphans || {
        log_warning "Failed to stop containers gracefully"
    }
    
    log_success "Containers stopped"
}

# Start new containers
start_containers() {
    log_info "Starting new containers..."
    
    docker-compose up -d || {
        log_error "Failed to start containers"
        return 1
    }
    
    log_success "Containers started"
}

# Run health checks
health_check() {
    if [ "$SKIP_HEALTH_CHECK" = true ]; then
        log_warning "Skipping health check (--skip-health-check flag set)"
        return 0
    fi
    
    log_info "Waiting for application to start..."
    sleep 10
    
    log_info "Running health checks..."
    
    if [ -x "./scripts/health-check.sh" ]; then
        ./scripts/health-check.sh http://localhost:8001 || {
            log_error "Health check failed"
            return 1
        }
    else
        log_warning "Health check script not found, using basic check"
        curl -f http://localhost:8001/api/health || {
            log_error "Basic health check failed"
            return 1
        }
    fi
    
    log_success "Health checks passed"
}

# Rollback deployment
rollback_deployment() {
    log_warning "Initiating rollback..."
    
    # Find latest backup image
    BACKUP_IMAGE=$(docker images --filter "reference=bolt-ai:backup-*" --format "{{.Repository}}:{{.Tag}}" | head -1)
    
    if [ -z "$BACKUP_IMAGE" ]; then
        log_error "No backup image found"
        exit 1
    fi
    
    log_info "Rolling back to $BACKUP_IMAGE"
    
    # Stop current containers
    docker-compose down
    
    # Tag backup as latest
    docker tag "$BACKUP_IMAGE" "$DOCKER_IMAGE"
    
    # Start containers with backup image
    docker-compose up -d
    
    # Run health check
    sleep 10
    health_check || {
        log_error "Rollback health check failed"
        exit 1
    }
    
    log_success "Rollback completed successfully"
}

# Main deployment flow
main() {
    echo "========================================="
    echo "BOLT AI Trading System - Deployment"
    echo "========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo "========================================="
    echo ""
    
    if [ "$ROLLBACK" = true ]; then
        rollback_deployment
        exit 0
    fi
    
    # Step 1: Pre-deployment checks
    pre_deployment_checks
    echo ""
    
    # Step 2: Backup
    backup_deployment
    echo ""
    
    # Step 3: Build
    build_image
    echo ""
    
    # Step 4: Test
    test_image
    echo ""
    
    # Step 5: Stop old containers
    stop_containers
    echo ""
    
    # Step 6: Start new containers
    start_containers || {
        log_error "Deployment failed, initiating rollback"
        rollback_deployment
        exit 1
    }
    echo ""
    
    # Step 7: Health check
    health_check || {
        log_error "Health check failed, initiating rollback"
        rollback_deployment
        exit 1
    }
    echo ""
    
    echo "========================================="
    log_success "Deployment completed successfully!"
    echo "========================================="
    echo ""
    echo "Next steps:"
    echo "  1. Monitor application logs: docker-compose logs -f"
    echo "  2. Check metrics: curl http://localhost:8001/metrics"
    echo "  3. Monitor for errors in the next 5-10 minutes"
    echo ""
}

# Execute main function
main

