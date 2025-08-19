#!/usr/bin/env node

/**
 * Pre-deployment verification script for Easy e-Invoice MVP
 * Verifies that all components are ready for production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = colors[level] || colors.reset;
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function success(message) {
  log('green', `✅ ${message}`);
}

function error(message) {
  log('red', `❌ ${message}`);
}

function warning(message) {
  log('yellow', `⚠️  ${message}`);
}

function info(message) {
  log('blue', `ℹ️  ${message}`);
}

class DeploymentVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.projectRoot = path.resolve(__dirname, '..');
  }

  // Check if file exists
  checkFile(filePath, description, required = true) {
    const fullPath = path.join(this.projectRoot, filePath);
    if (fs.existsSync(fullPath)) {
      success(`${description} exists: ${filePath}`);
      return true;
    } else {
      if (required) {
        error(`${description} missing: ${filePath}`);
        this.errors.push(`Missing required file: ${filePath}`);
      } else {
        warning(`${description} missing (optional): ${filePath}`);
        this.warnings.push(`Missing optional file: ${filePath}`);
      }
      return false;
    }
  }

  // Check package.json dependencies
  checkDependencies() {
    info('Checking package dependencies...');
    
    const packages = [
      'apps/web/package.json',
      'apps/api/package.json',
      'packages/validation/package.json',
      'packages/database/package.json'
    ];

    packages.forEach(pkg => {
      this.checkFile(pkg, `Package file`);
    });
  }

  // Check build files
  checkBuildFiles() {
    info('Checking build configuration...');
    
    // Next.js configuration
    this.checkFile('apps/web/next.config.js', 'Next.js config');
    this.checkFile('apps/web/tailwind.config.js', 'Tailwind config', false);
    this.checkFile('apps/web/tsconfig.json', 'TypeScript config');
    
    // Cloudflare Workers configuration
    this.checkFile('apps/api/wrangler.toml', 'Wrangler config');
    this.checkFile('apps/api/tsconfig.json', 'API TypeScript config');
    
    // Database configuration
    this.checkFile('packages/database/drizzle.config.ts', 'Drizzle config');
  }

  // Check environment templates
  checkEnvironmentFiles() {
    info('Checking environment configuration...');
    
    this.checkFile('apps/web/.env.local.example', 'Frontend env example');
    this.checkFile('apps/api/.dev.vars.example', 'API env example');
  }

  // Check core source files
  checkSourceFiles() {
    info('Checking core source files...');
    
    // API files
    this.checkFile('apps/api/src/index.ts', 'API entry point');
    this.checkFile('apps/api/src/lib/sentry.ts', 'API Sentry config');
    
    // Web app files
    this.checkFile('apps/web/src/app/layout.tsx', 'App layout');
    this.checkFile('apps/web/src/app/dashboard/page.tsx', 'Dashboard page');
    this.checkFile('apps/web/src/components/invoices/InvoiceForm.tsx', 'Invoice form');
    
    // Validation package
    this.checkFile('packages/validation/src/index.ts', 'Validation package');
    this.checkFile('packages/validation/src/malaysian-rules.ts', 'Malaysian rules');
    
    // Database schema
    this.checkFile('packages/database/src/schema.ts', 'Database schema');
  }

  // Check deployment documentation
  checkDocumentation() {
    info('Checking deployment documentation...');
    
    this.checkFile('DEPLOYMENT_GUIDE.md', 'Deployment guide');
    this.checkFile('DEPLOYMENT_CHECKLIST.md', 'Deployment checklist');
    this.checkFile('SENTRY_SETUP.md', 'Sentry setup guide');
    this.checkFile('deploy.sh', 'Deployment script');
  }

  // Verify build process
  verifyBuild() {
    info('Verifying build process...');
    
    try {
      // Check if packages can build
      info('Building validation package...');
      execSync('cd packages/validation && npm run build', { stdio: 'pipe' });
      success('Validation package builds successfully');
      
      info('Building database package...');
      execSync('cd packages/database && npm run build', { stdio: 'pipe' });
      success('Database package builds successfully');
      
    } catch (err) {
      error(`Build verification failed: ${err.message}`);
      this.errors.push('Build process failed');
    }
  }

  // Check Malaysian compliance features
  checkMalaysianCompliance() {
    info('Checking Malaysian compliance features...');
    
    // Check for TIN validation
    const validationFile = path.join(this.projectRoot, 'packages/validation/src/malaysian-rules.ts');
    if (fs.existsSync(validationFile)) {
      const content = fs.readFileSync(validationFile, 'utf8');
      
      if (content.includes('TIN_VALIDATION') || content.includes('validateTin')) {
        success('TIN validation implemented');
      } else {
        warning('TIN validation not found in Malaysian rules');
        this.warnings.push('TIN validation may be missing');
      }
      
      if (content.includes('SST') || content.includes('6%')) {
        success('SST calculation features found');
      } else {
        warning('SST calculation features not clearly identified');
      }
      
      if (content.includes('B2C') || content.includes('consolidation')) {
        success('B2C consolidation rules found');
      } else {
        warning('B2C consolidation rules not clearly identified');
      }
    }
  }

  // Check database migrations
  checkDatabaseMigrations() {
    info('Checking database migrations...');
    
    const migrationsDir = path.join(this.projectRoot, 'packages/database/migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir);
      const sqlFiles = files.filter(f => f.endsWith('.sql'));
      
      if (sqlFiles.length > 0) {
        success(`Found ${sqlFiles.length} migration files`);
      } else {
        warning('No migration files found');
        this.warnings.push('Database migrations may be missing');
      }
    }
  }

  // Run all verification checks
  async verify() {
    console.log('🔍 Easy e-Invoice MVP - Deployment Readiness Verification');
    console.log('========================================================');
    console.log('');
    
    this.checkDependencies();
    this.checkBuildFiles();
    this.checkEnvironmentFiles();
    this.checkSourceFiles();
    this.checkDocumentation();
    this.checkMalaysianCompliance();
    this.checkDatabaseMigrations();
    this.verifyBuild();
    
    console.log('');
    console.log('📊 Verification Summary');
    console.log('========================');
    
    if (this.errors.length === 0) {
      success('✅ All critical checks passed!');
    } else {
      error(`❌ ${this.errors.length} critical issue(s) found:`);
      this.errors.forEach(err => error(`  - ${err}`));
    }
    
    if (this.warnings.length > 0) {
      warning(`⚠️  ${this.warnings.length} warning(s):`);
      this.warnings.forEach(warn => warning(`  - ${warn}`));
    } else {
      success('No warnings found');
    }
    
    console.log('');
    
    if (this.errors.length === 0) {
      success('🚀 MVP is ready for production deployment!');
      console.log('');
      info('Next steps:');
      info('1. Run: ./deploy.sh');
      info('2. Or follow the manual steps in DEPLOYMENT_GUIDE.md');
      info('3. Verify deployment with the testing checklist');
      return true;
    } else {
      error('❌ Please fix the critical issues before deploying');
      return false;
    }
  }
}

// Run verification
if (require.main === module) {
  const verifier = new DeploymentVerifier();
  verifier.verify().then(ready => {
    process.exit(ready ? 0 : 1);
  }).catch(err => {
    error(`Verification failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = DeploymentVerifier;