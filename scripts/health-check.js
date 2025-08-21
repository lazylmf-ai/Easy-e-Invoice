#!/usr/bin/env node

/**
 * Health Check Script for Malaysian e-Invoice System
 * Comprehensive health verification for staging and production environments
 * 
 * @copyright Easy e-Invoice - Malaysian e-Invoice Compliance System
 */

const https = require('https');
const { performance } = require('perf_hooks');

// Parse command line arguments
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='));
const environment = envArg ? envArg.split('=')[1] : 'production';

console.log(`🏥 Health Check - ${environment.toUpperCase()} Environment`);

// Environment-specific URLs
const environments = {
  staging: {
    apiUrl: process.env.STAGING_API_URL || 'https://api-staging.your-domain.com',
    webUrl: process.env.STAGING_WEB_URL || 'https://staging.your-domain.com'
  },
  production: {
    apiUrl: process.env.PRODUCTION_URL ? process.env.PRODUCTION_URL + '/api' : 'https://api.your-domain.com',
    webUrl: process.env.PRODUCTION_URL || 'https://your-domain.com'
  },
  'production-green': {
    apiUrl: process.env.PRODUCTION_GREEN_API_URL || 'https://api-green.your-domain.com',
    webUrl: process.env.PRODUCTION_GREEN_WEB_URL || 'https://green.your-domain.com'
  }
};

async function runHealthCheck() {
  const startTime = performance.now();
  
  try {
    const env = environments[environment];
    if (!env) {
      throw new Error(`Unknown environment: ${environment}`);
    }

    console.log(`🌐 Checking ${environment} environment...`);
    console.log(`API URL: ${env.apiUrl}`);
    console.log(`Web URL: ${env.webUrl}`);

    const healthChecks = [
      // Core API Health
      {
        name: 'API Health Endpoint',
        url: `${env.apiUrl}/health`,
        critical: true,
        timeout: 5000
      },
      
      // Database Connectivity
      {
        name: 'Database Health',
        url: `${env.apiUrl}/health/db`,
        critical: true,
        timeout: 10000
      },
      
      // Authentication System
      {
        name: 'Authentication Health',
        url: `${env.apiUrl}/auth/health`,
        critical: true,
        timeout: 5000
      },
      
      // Malaysian Compliance Systems
      {
        name: 'TIN Validation Service',
        url: `${env.apiUrl}/validation/tin/health`,
        critical: true,
        timeout: 3000
      },
      
      {
        name: 'SST Calculation Service',
        url: `${env.apiUrl}/validation/sst/health`,
        critical: true,
        timeout: 3000
      },
      
      {
        name: 'Malaysian Compliance Monitoring',
        url: `${env.apiUrl}/compliance/health`,
        critical: false, // Nice to have
        timeout: 5000
      },
      
      // Core Business Functions
      {
        name: 'Invoice Management',
        url: `${env.apiUrl}/invoices/health`,
        critical: true,
        timeout: 5000
      },
      
      {
        name: 'Organization Management',
        url: `${env.apiUrl}/organizations/health`,
        critical: true,
        timeout: 5000
      },
      
      {
        name: 'Template System',
        url: `${env.apiUrl}/templates/health`,
        critical: false,
        timeout: 5000
      },
      
      // Export/Import Functions
      {
        name: 'Export Services',
        url: `${env.apiUrl}/export/health`,
        critical: true,
        timeout: 5000
      },
      
      {
        name: 'Import Services',
        url: `${env.apiUrl}/import/health`,
        critical: true,
        timeout: 5000
      },
      
      // Web Application
      {
        name: 'Web Application',
        url: env.webUrl,
        critical: true,
        timeout: 10000
      },
      
      {
        name: 'Web API Proxy',
        url: `${env.webUrl}/api/health`,
        critical: true,
        timeout: 8000
      }
    ];

    const results = {
      environment,
      timestamp: new Date().toISOString(),
      malaysianTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }),
      checks: [],
      summary: {
        total: healthChecks.length,
        passed: 0,
        failed: 0,
        warnings: 0,
        critical_failures: 0
      }
    };

    console.log(`\n🔍 Running ${healthChecks.length} health checks...\n`);

    // Run all health checks
    for (const check of healthChecks) {
      const checkResult = await performHealthCheck(check);
      results.checks.push(checkResult);

      // Update summary
      if (checkResult.status === 'pass') {
        results.summary.passed++;
        console.log(`✅ ${check.name} - OK (${checkResult.responseTime}ms)`);
      } else if (checkResult.status === 'warn') {
        results.summary.warnings++;
        console.log(`⚠️  ${check.name} - Warning: ${checkResult.error}`);
      } else {
        results.summary.failed++;
        if (check.critical) {
          results.summary.critical_failures++;
        }
        console.log(`❌ ${check.name} - FAIL: ${checkResult.error}`);
      }
    }

    // Calculate overall health score
    const healthScore = (results.summary.passed / results.summary.total) * 100;
    results.healthScore = Math.round(healthScore);

    // Determine overall status
    if (results.summary.critical_failures > 0) {
      results.status = 'CRITICAL';
    } else if (healthScore < 80) {
      results.status = 'DEGRADED';
    } else if (results.summary.warnings > 0) {
      results.status = 'WARNING';
    } else {
      results.status = 'HEALTHY';
    }

    const totalTime = Math.round(performance.now() - startTime);

    // Print summary
    console.log(`\n📊 Health Check Summary`);
    console.log(`================================`);
    console.log(`Environment: ${environment}`);
    console.log(`Status: ${results.status}`);
    console.log(`Health Score: ${results.healthScore}%`);
    console.log(`Total Checks: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);
    console.log(`Warnings: ${results.summary.warnings}`);
    console.log(`Critical Failures: ${results.summary.critical_failures}`);
    console.log(`Total Time: ${totalTime}ms`);

    // Malaysian-specific status
    const isBusinessHours = isWithinMalaysianBusinessHours();
    console.log(`🇲🇾 Malaysian Business Hours: ${isBusinessHours ? 'YES' : 'NO'}`);
    
    if (isBusinessHours && results.status !== 'HEALTHY') {
      console.log(`⚠️  HIGH PRIORITY: Issues detected during Malaysian business hours`);
    }

    // Save results to file for CI/CD
    const fs = require('fs');
    const outputFile = `/tmp/health-check-${environment}-${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to: ${outputFile}`);

    // Exit with appropriate code
    if (results.status === 'CRITICAL') {
      console.log(`\n💥 CRITICAL health check failures detected`);
      process.exit(1);
    } else if (results.status === 'DEGRADED') {
      console.log(`\n⚠️  System degraded - some services failing`);
      process.exit(1);
    } else if (results.status === 'WARNING') {
      console.log(`\n⚠️  System healthy with warnings`);
      process.exit(0);
    } else {
      console.log(`\n✅ All systems healthy`);
      process.exit(0);
    }

  } catch (error) {
    console.error(`\n💥 Health check failed:`, error.message);
    process.exit(1);
  }
}

async function performHealthCheck(check) {
  const startTime = performance.now();
  
  try {
    const response = await makeHttpRequest(check.url, {
      method: 'GET',
      timeout: check.timeout
    });
    
    const responseTime = Math.round(performance.now() - startTime);
    
    if (response.status >= 200 && response.status < 300) {
      return {
        name: check.name,
        status: 'pass',
        responseTime,
        httpStatus: response.status
      };
    } else if (response.status === 404 && !check.critical) {
      // 404 on non-critical endpoints is a warning, not a failure
      return {
        name: check.name,
        status: 'warn',
        responseTime,
        httpStatus: response.status,
        error: 'Endpoint not implemented (non-critical)'
      };
    } else {
      return {
        name: check.name,
        status: 'fail',
        responseTime,
        httpStatus: response.status,
        error: `HTTP ${response.status}`
      };
    }
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);
    
    // Handle timeouts and network errors
    if (error.message.includes('timeout')) {
      return {
        name: check.name,
        status: 'fail',
        responseTime,
        error: `Timeout after ${check.timeout}ms`
      };
    }
    
    // For non-critical checks that fail with network errors, treat as warnings
    if (!check.critical && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
      return {
        name: check.name,
        status: 'warn',
        responseTime,
        error: 'Service not available (non-critical)'
      };
    }
    
    return {
      name: check.name,
      status: 'fail',
      responseTime,
      error: error.message
    };
  }
}

function makeHttpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: options.method || 'GET',
      timeout: options.timeout || 5000,
      headers: {
        'User-Agent': 'Easy-e-Invoice-Health-Check/1.0',
        'Accept': 'application/json',
        ...options.headers
      }
    }, (response) => {
      // Don't read body for health checks - just check status
      response.resume();
      resolve({
        status: response.statusCode,
        headers: response.headers
      });
    });
    
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
    
    request.end();
  });
}

function isWithinMalaysianBusinessHours() {
  const now = new Date();
  const malaysianTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' });
  const hour = parseInt(malaysianTime.split(', ')[1].split(':')[0]);
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const isWeekday = day >= 1 && day <= 5;
  const isBusinessHour = hour >= 9 && hour <= 18;
  
  return isWeekday && isBusinessHour;
}

// Execute if called directly
if (require.main === module) {
  runHealthCheck().catch(console.error);
}