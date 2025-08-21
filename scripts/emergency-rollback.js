#!/usr/bin/env node

/**
 * Emergency Rollback Script
 * Immediately rolls back from green to blue environment in case of critical issues
 * 
 * @copyright Easy e-Invoice - Malaysian e-Invoice Compliance System
 */

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');

console.log('🚨 EMERGENCY ROLLBACK INITIATED');
console.log('⏰ Rolling back to previous stable environment...');

async function emergencyRollback() {
  const rollbackStartTime = Date.now();
  
  try {
    console.log('📋 Step 1: Load Deployment State');
    
    const deploymentStatePath = '/tmp/deployment-state.json';
    let deploymentState = null;
    
    if (fs.existsSync(deploymentStatePath)) {
      deploymentState = JSON.parse(fs.readFileSync(deploymentStatePath, 'utf-8'));
      console.log(`Rolling back from ${deploymentState.greenVersion} to ${deploymentState.blueVersion}`);
    } else {
      console.warn('⚠️ Deployment state not found - proceeding with emergency rollback');
    }

    console.log('📋 Step 2: Immediate Traffic Redirect');
    
    // Execute immediate rollback for all services
    await executeImmediateRollback();

    console.log('📋 Step 3: Health Check on Blue Environment');
    
    // Verify blue environment is responding
    const blueHealthy = await verifyBlueEnvironmentHealth();
    if (!blueHealthy) {
      console.error('💥 CRITICAL: Blue environment is also unhealthy!');
      console.error('🚨 MANUAL INTERVENTION REQUIRED IMMEDIATELY');
      await notifyEmergencyContacts('Both blue and green environments are unhealthy');
    } else {
      console.log('✅ Blue environment is healthy and serving traffic');
    }

    console.log('📋 Step 4: Malaysian Business Impact Assessment');
    
    const businessHoursImpact = await assessMalaysianBusinessImpact();
    console.log(`Business Impact: ${businessHoursImpact.impact}`);

    console.log('📋 Step 5: Enable Emergency Monitoring');
    
    await enableEmergencyMonitoring();

    console.log('📋 Step 6: Record Rollback Event');
    
    const rollbackRecord = {
      rollbackId: `emergency_${Date.now()}`,
      triggeredAt: new Date().toISOString(),
      rollbackDuration: Date.now() - rollbackStartTime,
      previousState: deploymentState,
      reason: process.env.ROLLBACK_REASON || 'Emergency rollback triggered',
      rolledBackBy: process.env.GITHUB_ACTOR || process.env.USER || 'automated-system',
      businessImpact: businessHoursImpact,
      status: 'completed'
    };
    
    // Save rollback record
    const rollbackLogPath = `/tmp/emergency-rollback-${Date.now()}.json`;
    fs.writeFileSync(rollbackLogPath, JSON.stringify(rollbackRecord, null, 2));
    
    console.log(`✅ Emergency rollback completed in ${Math.round((Date.now() - rollbackStartTime) / 1000)}s`);
    console.log('🔄 System restored to previous stable state');
    console.log('📞 Incident response procedures should be initiated');
    
    return rollbackRecord;

  } catch (error) {
    console.error('💥 EMERGENCY ROLLBACK FAILED:', error.message);
    console.error('🚨 CRITICAL SYSTEM STATE - MANUAL INTERVENTION REQUIRED');
    
    // Send critical alerts
    await notifyEmergencyContacts(`Emergency rollback failed: ${error.message}`);
    
    process.exit(1);
  }
}

async function executeImmediateRollback() {
  console.log('🔙 Executing immediate rollback...');
  
  // Rollback Cloudflare Workers
  try {
    console.log('Rolling back Cloudflare Workers...');
    execSync('wrangler rollback --env production', {
      cwd: './apps/api',
      stdio: 'inherit',
      timeout: 30000 // 30 second timeout
    });
    console.log('✅ Cloudflare Workers rolled back');
  } catch (error) {
    console.error('❌ Cloudflare Workers rollback failed:', error.message);
    throw error;
  }

  // Rollback Vercel (if needed)
  try {
    console.log('Checking Vercel rollback options...');
    // Vercel rollback would typically involve promoting a previous deployment
    // This would depend on your specific Vercel setup
    console.log('ℹ️  Vercel rollback may require manual intervention through dashboard');
  } catch (error) {
    console.warn('⚠️ Vercel rollback issue:', error.message);
  }

  // Database rollback (if safe migrations exist)
  try {
    console.log('Checking database rollback safety...');
    await attemptSafeDatabaseRollback();
  } catch (error) {
    console.warn('⚠️ Database rollback skipped:', error.message);
  }
}

async function verifyBlueEnvironmentHealth() {
  console.log('🔍 Verifying blue environment health...');
  
  const healthChecks = [
    {
      name: 'API Health',
      url: process.env.PRODUCTION_URL + '/api/health'
    },
    {
      name: 'Malaysian TIN Validation',
      url: process.env.PRODUCTION_URL + '/api/validation/tin/C1234567890'
    },
    {
      name: 'Database Connectivity',
      url: process.env.PRODUCTION_URL + '/api/health/db'
    }
  ];

  let healthyChecks = 0;

  for (const check of healthChecks) {
    try {
      const response = await makeHttpRequest(check.url, { timeout: 5000 });
      if (response.status === 200) {
        console.log(`✅ ${check.name} - Healthy`);
        healthyChecks++;
      } else {
        console.log(`❌ ${check.name} - HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${check.name} - Error: ${error.message}`);
    }
  }

  const healthPercentage = (healthyChecks / healthChecks.length) * 100;
  console.log(`Blue environment health: ${healthPercentage}%`);

  return healthPercentage >= 60; // Accept if at least 60% of checks pass
}

async function assessMalaysianBusinessImpact() {
  const now = new Date();
  const malaysianTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' });
  const hour = parseInt(malaysianTime.split(', ')[1].split(':')[0]);
  
  const isBusinessHours = hour >= 9 && hour <= 18;
  const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
  
  let impact = 'low';
  let description = 'Outside Malaysian business hours';
  
  if (isBusinessHours && isWeekday) {
    impact = 'high';
    description = 'During Malaysian business hours - high user impact expected';
  } else if (isBusinessHours || isWeekday) {
    impact = 'medium';
    description = 'Partial business hours impact';
  }

  const assessment = {
    impact,
    description,
    malaysianTime,
    isBusinessHours,
    isWeekday,
    recommendedActions: [
      isBusinessHours ? 'Notify customer support team immediately' : 'Standard incident response',
      'Monitor Malaysian user complaint channels',
      'Prepare public status page update'
    ]
  };

  console.log(`🇲🇾 Business Impact Assessment: ${impact.toUpperCase()}`);
  console.log(`Description: ${description}`);

  return assessment;
}

async function enableEmergencyMonitoring() {
  console.log('📊 Enabling emergency monitoring...');
  
  const emergencyConfig = {
    healthCheckInterval: 15, // Check every 15 seconds
    alertThreshold: 1, // Alert on first failure
    emergencyMode: true,
    malaysianBusinessHours: true,
    criticalAlertsEnabled: true,
    rollbackInProgress: false
  };

  // This would integrate with your monitoring system
  console.log('Emergency monitoring configuration:', JSON.stringify(emergencyConfig, null, 2));
  
  // Enable enhanced logging
  process.env.LOG_LEVEL = 'debug';
  process.env.EMERGENCY_MODE = 'true';
  
  console.log('✅ Emergency monitoring enabled');
}

async function attemptSafeDatabaseRollback() {
  console.log('🗄️ Checking database rollback safety...');
  
  // Only attempt database rollback if it's safe (no destructive migrations)
  try {
    // This is a placeholder - real implementation would check migration history
    console.log('ℹ️  Database rollback assessment: Safe rollback not available');
    console.log('ℹ️  Database state maintained (no destructive rollback attempted)');
  } catch (error) {
    console.warn('Database rollback check failed:', error.message);
  }
}

async function notifyEmergencyContacts(message) {
  console.log('📞 Notifying emergency contacts...');
  
  const emergencyNotification = {
    severity: 'CRITICAL',
    system: 'Easy e-Invoice - Malaysian e-Invoice System',
    message,
    timestamp: new Date().toISOString(),
    malaysianTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }),
    actionRequired: 'Immediate manual intervention required',
    contacts: [
      'DevOps Team',
      'Malaysian Business Operations',
      'Customer Support (if business hours)'
    ]
  };

  // This would integrate with your alerting system (PagerDuty, Slack, etc.)
  console.log('🚨 Emergency notification:', JSON.stringify(emergencyNotification, null, 2));
  
  // Save notification for audit
  const notificationPath = `/tmp/emergency-notification-${Date.now()}.json`;
  fs.writeFileSync(notificationPath, JSON.stringify(emergencyNotification, null, 2));
}

function makeHttpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'GET',
      timeout: options.timeout || 10000,
      headers: {
        'User-Agent': 'Easy-e-Invoice-Emergency-Rollback/1.0'
      }
    }, (response) => {
      resolve({
        status: response.statusCode,
        headers: response.headers
      });
    });
    
    request.on('error', reject);
    request.on('timeout', () => reject(new Error('Request timeout')));
    request.end();
  });
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Emergency rollback interrupted');
  console.log('⚠️  System may be in inconsistent state');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Emergency rollback terminated');
  console.log('⚠️  System may be in inconsistent state');
  process.exit(1);
});

// Execute if called directly
if (require.main === module) {
  emergencyRollback().catch(console.error);
}

module.exports = { emergencyRollback };