#!/bin/bash

# Easy e-Invoice Deployment Script
# Usage: ./scripts/deploy.sh [environment] [component]
# Example: ./scripts/deploy.sh production api
#          ./scripts/deploy.sh staging web

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENTS=("development" "staging" "production")
COMPONENTS=("api" "web" "all")

# Default values
ENVIRONMENT=""
COMPONENT="all"
DRY_RUN=false
SKIP_TESTS=false
FORCE_DEPLOY=false

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

show_usage() {
    cat << EOF
Easy e-Invoice Deployment Script

Usage: $0 [environment] [component] [options]

Environments:
    development    Deploy to development environment
    staging        Deploy to staging environment  
    production     Deploy to production environment

Components:
    api           Deploy API (Cloudflare Workers) only
    web           Deploy frontend (Vercel) only
    all           Deploy both API and frontend (default)

Options:
    --dry-run         Show what would be deployed without executing
    --skip-tests      Skip running tests before deployment
    --force          Force deployment even if tests fail
    -h, --help       Show this help message

Examples:
    $0 staging api                    # Deploy API to staging
    $0 production all --dry-run       # Dry run production deployment
    $0 development web --skip-tests   # Deploy frontend to dev, skip tests

EOF
}

validate_environment() {
    local env="$1"
    for valid_env in "${ENVIRONMENTS[@]}"; do
        if [[ "$env" == "$valid_env" ]]; then
            return 0
        fi
    done
    return 1
}

validate_component() {
    local comp="$1"
    for valid_comp in "${COMPONENTS[@]}"; do
        if [[ "$comp" == "$valid_comp" ]]; then
            return 0
        fi
    done
    return 1
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check wrangler for API deployment
    if [[ "$COMPONENT" == "api" || "$COMPONENT" == "all" ]] && ! command -v wrangler &> /dev/null; then
        log_error "Wrangler CLI is not installed. Run: npm install -g wrangler"
        exit 1
    fi
    
    # Check vercel for web deployment
    if [[ "$COMPONENT" == "web" || "$COMPONENT" == "all" ]] && ! command -v vercel &> /dev/null; then
        log_warning "Vercel CLI not found. Using GitHub Actions deployment instead."
    fi
    
    log_success "Dependencies check passed"
}

load_environment() {
    local env="$1"
    local env_file="$PROJECT_ROOT/.env.$env"
    
    if [[ -f "$env_file" ]]; then
        log_info "Loading environment variables from $env_file"
        set -a  # Export all variables
        source "$env_file"
        set +a  # Stop exporting
    else
        log_warning "Environment file $env_file not found"
    fi
}

run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests as requested"
        return 0
    fi
    
    log_info "Running tests..."
    cd "$PROJECT_ROOT"
    
    # Run linting
    if ! npm run lint; then
        log_error "Linting failed"
        [[ "$FORCE_DEPLOY" != "true" ]] && exit 1
    fi
    
    # Run type checking
    if ! npm run typecheck; then
        log_error "Type checking failed"
        [[ "$FORCE_DEPLOY" != "true" ]] && exit 1
    fi
    
    # Run unit tests
    if ! npm run test:unit; then
        log_error "Unit tests failed"
        [[ "$FORCE_DEPLOY" != "true" ]] && exit 1
    fi
    
    # Run integration tests for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if ! npm run test:integration; then
            log_error "Integration tests failed"
            [[ "$FORCE_DEPLOY" != "true" ]] && exit 1
        fi
    fi
    
    log_success "All tests passed"
}

build_project() {
    log_info "Building project..."
    cd "$PROJECT_ROOT"
    
    if [[ "$COMPONENT" == "api" || "$COMPONENT" == "all" ]]; then
        log_info "Building API..."
        if ! npm run build:api; then
            log_error "API build failed"
            exit 1
        fi
        log_success "API build completed"
    fi
    
    if [[ "$COMPONENT" == "web" || "$COMPONENT" == "all" ]]; then
        log_info "Building frontend..."
        if ! npm run build:web; then
            log_error "Frontend build failed"
            exit 1
        fi
        log_success "Frontend build completed"
    fi
}

deploy_api() {
    local env="$1"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would deploy API to $env environment"
        return 0
    fi
    
    log_info "Deploying API to $env environment..."
    cd "$PROJECT_ROOT/apps/api"
    
    # Deploy using wrangler
    if ! wrangler deploy --env "$env"; then
        log_error "API deployment failed"
        exit 1
    fi
    
    # Verify deployment
    sleep 5
    local health_url
    case "$env" in
        "production")
            health_url="https://api.easyeinvoice.com.my/health"
            ;;
        "staging")
            health_url="https://api-staging.easyeinvoice.com.my/health"
            ;;
        *)
            log_warning "Health check not available for $env environment"
            return 0
            ;;
    esac
    
    log_info "Performing health check..."
    if curl -f -s "$health_url" > /dev/null; then
        log_success "API health check passed"
    else
        log_error "API health check failed"
        exit 1
    fi
    
    log_success "API deployed successfully to $env"
}

deploy_web() {
    local env="$1"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would deploy frontend to $env environment"
        return 0
    fi
    
    log_info "Deploying frontend to $env environment..."
    cd "$PROJECT_ROOT/apps/web"
    
    # Set environment-specific variables
    case "$env" in
        "production")
            export VERCEL_ENV="production"
            ;;
        "staging")
            export VERCEL_ENV="preview"
            ;;
        *)
            export VERCEL_ENV="development"
            ;;
    esac
    
    # Deploy using Vercel CLI or fall back to manual instructions
    if command -v vercel &> /dev/null; then
        if ! vercel deploy --prod; then
            log_error "Frontend deployment failed"
            exit 1
        fi
    else
        log_warning "Vercel CLI not available. Please deploy manually:"
        log_info "1. Push changes to the appropriate branch"
        log_info "2. Vercel will auto-deploy via GitHub integration"
        log_info "3. Check deployment status at https://vercel.com/dashboard"
        return 0
    fi
    
    # Verify deployment
    sleep 10
    local app_url
    case "$env" in
        "production")
            app_url="https://easyeinvoice.com.my"
            ;;
        "staging")
            app_url="https://staging.easyeinvoice.com.my"
            ;;
        *)
            log_warning "Health check not available for $env environment"
            return 0
            ;;
    esac
    
    log_info "Performing frontend health check..."
    if curl -f -s "$app_url/health" > /dev/null; then
        log_success "Frontend health check passed"
    else
        log_warning "Frontend health check endpoint not found, checking main page..."
        if curl -f -s "$app_url" > /dev/null; then
            log_success "Frontend main page accessible"
        else
            log_error "Frontend health check failed"
            exit 1
        fi
    fi
    
    log_success "Frontend deployed successfully to $env"
}

run_post_deploy_tests() {
    local env="$1"
    
    if [[ "$env" != "production" && "$env" != "staging" ]]; then
        log_info "Skipping post-deploy tests for $env environment"
        return 0
    fi
    
    log_info "Running post-deployment verification..."
    cd "$PROJECT_ROOT"
    
    # Set base URL for tests
    case "$env" in
        "production")
            export BASE_URL="https://easyeinvoice.com.my"
            export API_URL="https://api.easyeinvoice.com.my"
            ;;
        "staging")
            export BASE_URL="https://staging.easyeinvoice.com.my"
            export API_URL="https://api-staging.easyeinvoice.com.my"
            ;;
    esac
    
    # Run smoke tests
    if ! npm run test:smoke; then
        log_error "Post-deployment smoke tests failed"
        exit 1
    fi
    
    log_success "Post-deployment verification completed"
}

create_deployment_record() {
    local env="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local git_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    local git_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    
    log_info "Recording deployment..."
    
    # Create deployment record
    cat > "$PROJECT_ROOT/deployment-record.json" << EOF
{
    "environment": "$env",
    "component": "$COMPONENT",
    "timestamp": "$timestamp",
    "git_commit": "$git_commit",
    "git_branch": "$git_branch",
    "deployed_by": "${USER:-unknown}",
    "deployment_type": "manual"
}
EOF
    
    log_success "Deployment record created"
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --force)
                FORCE_DEPLOY=true
                shift
                ;;
            development|staging|production)
                if [[ -z "$ENVIRONMENT" ]]; then
                    ENVIRONMENT="$1"
                else
                    log_error "Environment already specified"
                    exit 1
                fi
                shift
                ;;
            api|web|all)
                COMPONENT="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Validate required arguments
    if [[ -z "$ENVIRONMENT" ]]; then
        log_error "Environment is required"
        show_usage
        exit 1
    fi
    
    if ! validate_environment "$ENVIRONMENT"; then
        log_error "Invalid environment: $ENVIRONMENT"
        exit 1
    fi
    
    if ! validate_component "$COMPONENT"; then
        log_error "Invalid component: $COMPONENT"
        exit 1
    fi
    
    # Show deployment plan
    log_info "=== Deployment Plan ==="
    log_info "Environment: $ENVIRONMENT"
    log_info "Component: $COMPONENT"
    log_info "Dry Run: $DRY_RUN"
    log_info "Skip Tests: $SKIP_TESTS"
    log_info "Force Deploy: $FORCE_DEPLOY"
    log_info "======================="
    
    # Confirm production deployment
    if [[ "$ENVIRONMENT" == "production" && "$DRY_RUN" != "true" ]]; then
        read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " -r
        if [[ ! $REPLY =~ ^(yes|Yes|YES)$ ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Execute deployment steps
    check_dependencies
    load_environment "$ENVIRONMENT"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        run_tests
        build_project
    fi
    
    # Deploy components
    if [[ "$COMPONENT" == "api" || "$COMPONENT" == "all" ]]; then
        deploy_api "$ENVIRONMENT"
    fi
    
    if [[ "$COMPONENT" == "web" || "$COMPONENT" == "all" ]]; then
        deploy_web "$ENVIRONMENT"
    fi
    
    if [[ "$DRY_RUN" != "true" ]]; then
        run_post_deploy_tests "$ENVIRONMENT"
        create_deployment_record "$ENVIRONMENT"
    fi
    
    log_success "Deployment completed successfully!"
    
    # Show next steps
    case "$ENVIRONMENT" in
        "production")
            log_info "Production deployment completed!"
            log_info "Frontend: https://easyeinvoice.com.my"
            log_info "API: https://api.easyeinvoice.com.my"
            ;;
        "staging")
            log_info "Staging deployment completed!"
            log_info "Frontend: https://staging.easyeinvoice.com.my"
            log_info "API: https://api-staging.easyeinvoice.com.my"
            ;;
        *)
            log_info "Development deployment completed!"
            ;;
    esac
}

# Run main function
main "$@"