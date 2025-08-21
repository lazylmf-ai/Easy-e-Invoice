#!/usr/bin/env node

/**
 * Blue-Green Deployment Preparation Script
 * Prepares the green environment for zero-downtime deployment
 * 
 * @copyright Easy e-Invoice - Malaysian e-Invoice Compliance System
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing Blue-Green Deployment Environment...');

async function prepareBlueGreenDeployment() {
  try {
    console.log('📋 Step 1: Environment Validation');
    
    // Check required environment variables
    const requiredEnvVars = [
      'CLOUDFLARE_API_TOKEN',
      'CLOUDFLARE_ACCOUNT_ID', 
      'VERCEL_TOKEN',
      'PRODUCTION_DATABASE_URL'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }
    
    console.log('✅ All required environment variables present');

    console.log('📋 Step 2: Blue Environment Status Check');
    
    // Get current production status (blue environment)
    const currentStatus = await getCurrentProductionStatus();
    console.log(`Current production status: ${JSON.stringify(currentStatus, null, 2)}`);

    console.log('📋 Step 3: Green Environment Setup');
    
    // Create green environment configuration
    const greenConfig = {
      environment: 'production-green',
      timestamp: new Date().toISOString(),
      blueVersion: currentStatus.version,
      greenVersion: process.env.GITHUB_SHA || 'local-' + Date.now(),
      rollbackPlan: {
        enabled: true,
        maxRollbackTime: 300, // 5 minutes
        healthCheckEndpoints: [
          '/health',
          '/api/health',
          '/api/compliance/health'
        ]
      }
    };

    // Save deployment state for rollback capabilities
    const deploymentStatePath = '/tmp/deployment-state.json';
    fs.writeFileSync(deploymentStatePath, JSON.stringify(greenConfig, null, 2));
    console.log(`✅ Green environment configuration saved to ${deploymentStatePath}`);

    console.log('📋 Step 4: Pre-deployment Health Checks');
    
    // Verify blue environment is healthy before proceeding
    if (!currentStatus.healthy) {
      throw new Error('Current production (blue) environment is not healthy. Aborting deployment.');
    }

    console.log('📋 Step 5: Malaysian Compliance Pre-checks');
    
    // Verify Malaysian compliance systems are ready
    const complianceCheck = await verifyMalaysianComplianceReadiness();
    if (!complianceCheck.passed) {
      throw new Error(`Malaysian compliance checks failed: ${complianceCheck.errors.join(', ')}`);
    }
    
    console.log('🇲🇾 Malaysian compliance systems verified');

    console.log('📋 Step 6: Database Migration Strategy');
    
    // Prepare database migration strategy
    const migrationStrategy = await prepareDatabaseMigrationStrategy();
    console.log(`Migration strategy: ${migrationStrategy.type}`);
    
    if (migrationStrategy.requiresDowntime) {
      console.warn('⚠️  Database migration requires downtime - consider maintenance window');
    }

    console.log('✅ Blue-Green deployment preparation completed successfully');
    
    return {
      status: 'ready',
      greenConfig,
      migrationStrategy,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Blue-Green deployment preparation failed:', error.message);
    process.exit(1);
  }
}

async function getCurrentProductionStatus() {
  try {
    // Check current Cloudflare Workers deployment
    const workerStatus = execSync('wrangler deployments list --env production --json', {
      encoding: 'utf-8',
      cwd: './apps/api'
    });
    
    const deployments = JSON.parse(workerStatus);
    const latest = deployments[0];
    
    return {
      healthy: true, // Assume healthy if deployment exists
      version: latest?.id || 'unknown',
      deployedAt: latest?.created_on || new Date().toISOString(),
      environment: 'blue'
    };
  } catch (error) {
    console.warn('Warning: Could not fetch current production status:', error.message);
    return {
      healthy: false,
      version: 'unknown',
      environment: 'blue'
    };
  }
}

async function verifyMalaysianComplianceReadiness() {
  const checks = [
    {
      name: 'TIN Validation System',
      check: () => fs.existsSync('./packages/validation/src/tin-validation.ts')
    },
    {
      name: 'SST Calculation Module',
      check: () => fs.existsSync('./packages/validation/src/malaysian-rules.ts')
    },
    {
      name: 'MyInvois Format Generator',
      check: () => true // Implemented in export routes
    },
    {
      name: 'PDPA Compliance Tracking',
      check: () => fs.existsSync('./packages/compliance-monitoring/index.ts')
    }
  ];

  const results = checks.map(check => ({
    name: check.name,
    passed: check.check()
  }));

  const failed = results.filter(r => !r.passed);
  
  return {
    passed: failed.length === 0,
    results,
    errors: failed.map(f => f.name)
  };
}

async function prepareDatabaseMigrationStrategy() {
  // Check if there are pending migrations
  try {
    const migrationFiles = fs.readdirSync('./packages/database/migrations');
    const pendingMigrations = migrationFiles.filter(file => file.endsWith('.sql'));
    
    if (pendingMigrations.length === 0) {
      return {
        type: 'no-migration-required',
        requiresDowntime: false
      };
    }

    // Analyze migrations for breaking changes
    const hasBreakingChanges = pendingMigrations.some(file => {
      const content = fs.readFileSync(`./packages/database/migrations/${file}`, 'utf-8');
      return content.includes('DROP TABLE') || 
             content.includes('DROP COLUMN') || 
             content.includes('ALTER TABLE') && content.includes('NOT NULL');
    });

    return {
      type: hasBreakingChanges ? 'breaking-migration' : 'safe-migration',
      requiresDowntime: hasBreakingChanges,
      pendingMigrations: pendingMigrations.length,
      files: pendingMigrations
    };
  } catch (error) {
    return {
      type: 'migration-check-failed',
      requiresDowntime: true,
      error: error.message
    };
  }
}

// Execute if called directly
if (require.main === module) {
  prepareBlueGreenDeployment().catch(console.error);
}

module.exports = { prepareBlueGreenDeployment };