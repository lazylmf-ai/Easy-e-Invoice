#!/bin/bash

# Easy e-Invoice MVP Deployment Script
# This script helps automate the deployment process

set -e  # Exit on any error

echo "🚀 Easy e-Invoice MVP Deployment Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if required tools are installed
check_prerequisites() {
    echo "Checking prerequisites..."
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install Node.js and npm first."
        exit 1
    fi
    
    if ! command -v wrangler &> /dev/null; then
        print_warning "Wrangler CLI not found. Installing..."
        npm install -g wrangler
    fi
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    print_status "Prerequisites checked"
}

# Build and verify the project
build_project() {
    echo ""
    echo "Building project..."
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm install
    
    # Build packages
    print_info "Building validation package..."
    cd packages/validation && npm run build && cd ../..
    
    print_info "Building database package..."
    cd packages/database && npm run build && cd ../..
    
    # Build web app
    print_info "Building web application..."
    cd apps/web && npm run build && cd ../..
    
    # Build API
    print_info "Building API..."
    cd apps/api && npm run build && cd ../..
    
    print_status "Project built successfully"
}

# Database setup
setup_database() {
    echo ""
    echo "Setting up database..."
    
    print_info "Please ensure you have:"
    print_info "1. Created a Neon PostgreSQL database"
    print_info "2. Set the DATABASE_URL in your environment"
    
    read -p "Have you set up your Neon database? (y/n): " db_ready
    
    if [[ $db_ready == "y" || $db_ready == "Y" ]]; then
        print_info "Running database migrations..."
        cd packages/database
        npm run db:push
        cd ../..
        print_status "Database setup completed"
    else
        print_warning "Please set up your database first:"
        print_info "1. Go to https://neon.tech and create an account"
        print_info "2. Create a new PostgreSQL database"
        print_info "3. Copy the connection string"
        print_info "4. Set DATABASE_URL environment variable"
        exit 1
    fi
}

# Configure Cloudflare Workers secrets
setup_api_secrets() {
    echo ""
    echo "Setting up API secrets..."
    
    print_info "Configure Cloudflare Workers secrets:"
    
    # Check if user wants to set secrets
    read -p "Do you want to configure API secrets now? (y/n): " setup_secrets
    
    if [[ $setup_secrets == "y" || $setup_secrets == "Y" ]]; then
        cd apps/api
        
        print_info "Setting DATABASE_URL secret..."
        echo "Enter your Neon PostgreSQL connection string:"
        wrangler secret put DATABASE_URL
        
        print_info "Setting JWT_SECRET..."
        echo "Enter a secure random string for JWT signing (min 32 characters):"
        wrangler secret put JWT_SECRET
        
        print_info "Setting RESEND_API_KEY..."
        echo "Enter your Resend API key (get from https://resend.com):"
        wrangler secret put RESEND_API_KEY
        
        read -p "Do you want to configure Sentry monitoring? (y/n): " setup_sentry
        if [[ $setup_sentry == "y" || $setup_sentry == "Y" ]]; then
            print_info "Setting SENTRY_DSN..."
            echo "Enter your Sentry DSN:"
            wrangler secret put SENTRY_DSN
        fi
        
        cd ../..
        print_status "API secrets configured"
    else
        print_warning "You can configure secrets later with:"
        print_info "cd apps/api && wrangler secret put SECRET_NAME"
    fi
}

# Deploy API
deploy_api() {
    echo ""
    echo "Deploying API to Cloudflare Workers..."
    
    cd apps/api
    
    # Deploy to production
    print_info "Deploying to production environment..."
    wrangler deploy --env production
    
    cd ../..
    print_status "API deployed successfully"
}

# Deploy Frontend
deploy_frontend() {
    echo ""
    echo "Deploying frontend to Vercel..."
    
    cd apps/web
    
    # Check if Vercel is configured
    if [ ! -f ".vercel/project.json" ]; then
        print_info "Setting up Vercel project..."
        vercel --yes
    fi
    
    # Deploy to production
    print_info "Deploying to production..."
    vercel --prod
    
    cd ../..
    print_status "Frontend deployed successfully"
}

# Post-deployment verification
verify_deployment() {
    echo ""
    echo "Verifying deployment..."
    
    print_info "Please test the following:"
    print_info "1. Visit your frontend URL and verify it loads"
    print_info "2. Test user registration with magic link email"
    print_info "3. Complete organization onboarding with TIN validation"
    print_info "4. Create a test invoice and verify Malaysian compliance"
    print_info "5. Test CSV import/export functionality"
    
    read -p "Have you verified the deployment works correctly? (y/n): " verified
    
    if [[ $verified == "y" || $verified == "Y" ]]; then
        print_status "Deployment verified!"
        echo ""
        echo "🎉 Congratulations! Your Easy e-Invoice MVP is live!"
        echo ""
        print_info "Next steps:"
        print_info "1. Set up monitoring and alerts"
        print_info "2. Create user documentation"
        print_info "3. Plan your launch strategy"
        print_info "4. Monitor performance and user feedback"
    else
        print_warning "Please verify the deployment before proceeding"
    fi
}

# Main deployment flow
main() {
    echo "Starting deployment process..."
    echo ""
    
    # Parse command line arguments
    case "${1:-all}" in
        "prereq")
            check_prerequisites
            ;;
        "build")
            check_prerequisites
            build_project
            ;;
        "database")
            setup_database
            ;;
        "api")
            setup_api_secrets
            deploy_api
            ;;
        "frontend")
            deploy_frontend
            ;;
        "verify")
            verify_deployment
            ;;
        "all")
            check_prerequisites
            build_project
            setup_database
            setup_api_secrets
            deploy_api
            deploy_frontend
            verify_deployment
            ;;
        *)
            echo "Usage: $0 [prereq|build|database|api|frontend|verify|all]"
            echo ""
            echo "Commands:"
            echo "  prereq   - Check and install prerequisites"
            echo "  build    - Build the entire project"
            echo "  database - Set up database and run migrations"
            echo "  api      - Configure secrets and deploy API"
            echo "  frontend - Deploy frontend to Vercel"
            echo "  verify   - Verify deployment"
            echo "  all      - Run complete deployment (default)"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"