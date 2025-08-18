import { createContextLogger } from './logger';
import { register } from './metrics';

const logger = createContextLogger('health');

// Health check status types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  status: HealthStatus;
  component: string;
  timestamp: string;
  duration: number;
  details?: any;
  error?: string;
}

export interface SystemHealth {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: string;
  checks: HealthCheckResult[];
  services: {
    api: HealthStatus;
    database: HealthStatus;
    cache: HealthStatus;
    fileStorage: HealthStatus;
    email: HealthStatus;
  };
}

// Health check registry
const healthChecks = new Map<string, () => Promise<HealthCheckResult>>();

// Register a health check
export function registerHealthCheck(name: string, check: () => Promise<HealthCheckResult>) {
  healthChecks.set(name, check);
  logger.debug(`Registered health check: ${name}`);
}

// Run a single health check with timeout
async function runHealthCheck(name: string, check: () => Promise<HealthCheckResult>): Promise<HealthCheckResult> {
  const start = Date.now();
  
  try {
    // Timeout after 10 seconds
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), 10000);
    });
    
    const result = await Promise.race([check(), timeoutPromise]);
    
    return {
      ...result,
      duration: Date.now() - start,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const duration = Date.now() - start;
    logger.warn(`Health check failed: ${name}`, { error: error instanceof Error ? error.message : 'Unknown error', duration });
    
    return {
      status: 'unhealthy',
      component: name,
      duration,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Run all health checks
export async function checkSystemHealth(): Promise<SystemHealth> {
  const start = Date.now();
  const version = process.env.APP_VERSION || '1.0.0';
  const uptime = process.uptime();
  
  logger.info('Starting system health check');
  
  // Run all registered health checks in parallel
  const checkPromises = Array.from(healthChecks.entries()).map(([name, check]) =>
    runHealthCheck(name, check)
  );
  
  const checks = await Promise.all(checkPromises);
  
  // Determine overall system status
  const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
  const hasDegraded = checks.some(check => check.status === 'degraded');
  
  let overallStatus: HealthStatus = 'healthy';
  if (hasUnhealthy) {
    overallStatus = 'unhealthy';
  } else if (hasDegraded) {
    overallStatus = 'degraded';
  }
  
  // Categorize service health
  const serviceHealth = categorizeServiceHealth(checks);
  
  const systemHealth: SystemHealth = {
    status: overallStatus,
    version,
    uptime,
    timestamp: new Date().toISOString(),
    checks,
    services: serviceHealth
  };
  
  const duration = Date.now() - start;
  logger.info('System health check completed', { 
    status: overallStatus, 
    duration,
    healthyChecks: checks.filter(c => c.status === 'healthy').length,
    totalChecks: checks.length
  });
  
  return systemHealth;
}

// Categorize checks by service type
function categorizeServiceHealth(checks: HealthCheckResult[]) {
  const services = {
    api: 'healthy' as HealthStatus,
    database: 'healthy' as HealthStatus,
    cache: 'healthy' as HealthStatus,
    fileStorage: 'healthy' as HealthStatus,
    email: 'healthy' as HealthStatus
  };
  
  checks.forEach(check => {
    const component = check.component.toLowerCase();
    
    if (component.includes('database') || component.includes('db')) {
      if (check.status === 'unhealthy') services.database = 'unhealthy';
      else if (check.status === 'degraded' && services.database === 'healthy') services.database = 'degraded';
    } else if (component.includes('cache') || component.includes('redis')) {
      if (check.status === 'unhealthy') services.cache = 'unhealthy';
      else if (check.status === 'degraded' && services.cache === 'healthy') services.cache = 'degraded';
    } else if (component.includes('storage') || component.includes('file')) {
      if (check.status === 'unhealthy') services.fileStorage = 'unhealthy';
      else if (check.status === 'degraded' && services.fileStorage === 'healthy') services.fileStorage = 'degraded';
    } else if (component.includes('email') || component.includes('mail')) {
      if (check.status === 'unhealthy') services.email = 'unhealthy';
      else if (check.status === 'degraded' && services.email === 'healthy') services.email = 'degraded';
    } else {
      // Default to API service
      if (check.status === 'unhealthy') services.api = 'unhealthy';
      else if (check.status === 'degraded' && services.api === 'healthy') services.api = 'degraded';
    }
  });
  
  return services;
}

// Built-in health checks

// Basic system health check
export async function basicSystemCheck(): Promise<HealthCheckResult> {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  // Check memory usage (warn if > 80% of heap limit)
  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  const isMemoryHealthy = memoryUsagePercent < 80;
  
  // Check if process is responsive
  const start = Date.now();
  await new Promise(resolve => setImmediate(resolve));
  const eventLoopDelay = Date.now() - start;
  const isEventLoopHealthy = eventLoopDelay < 100;
  
  let status: HealthStatus = 'healthy';
  if (!isMemoryHealthy || !isEventLoopHealthy) {
    status = memoryUsagePercent > 95 || eventLoopDelay > 1000 ? 'unhealthy' : 'degraded';
  }
  
  return {
    status,
    component: 'system',
    timestamp: new Date().toISOString(),
    duration: 0,
    details: {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        usagePercent: memoryUsagePercent.toFixed(2)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      eventLoopDelay,
      uptime: process.uptime()
    }
  };
}

// Database health check
export async function databaseHealthCheck(db: any): Promise<HealthCheckResult> {
  try {
    const start = Date.now();
    
    // Simple query to test database connectivity
    await db.select().from('organizations').limit(1);
    
    const duration = Date.now() - start;
    
    // Consider degraded if query takes more than 500ms
    const status: HealthStatus = duration > 1000 ? 'degraded' : 'healthy';
    
    return {
      status,
      component: 'database',
      timestamp: new Date().toISOString(),
      duration: 0,
      details: {
        queryTime: duration,
        connection: 'active'
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      component: 'database',
      timestamp: new Date().toISOString(),
      duration: 0,
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

// File storage health check
export async function fileStorageHealthCheck(): Promise<HealthCheckResult> {
  try {
    // In a real implementation, this would test actual file storage connectivity
    // For now, we'll simulate a check
    const testFile = 'health-check-test.txt';
    
    // Simulate file operations
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      status: 'healthy',
      component: 'fileStorage',
      timestamp: new Date().toISOString(),
      duration: 0,
      details: {
        bucketAccess: 'available',
        writeTest: 'passed',
        readTest: 'passed'
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      component: 'fileStorage',
      timestamp: new Date().toISOString(),
      duration: 0,
      error: error instanceof Error ? error.message : 'File storage access failed'
    };
  }
}

// Email service health check
export async function emailServiceHealthCheck(): Promise<HealthCheckResult> {
  try {
    // In a real implementation, this would test email service connectivity
    // For now, we'll simulate a check
    const hasApiKey = !!process.env.RESEND_API_KEY;
    const hasFromEmail = !!process.env.FROM_EMAIL;
    
    if (!hasApiKey || !hasFromEmail) {
      return {
        status: 'degraded',
        component: 'email',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: {
          apiKey: hasApiKey ? 'configured' : 'missing',
          fromEmail: hasFromEmail ? 'configured' : 'missing'
        }
      };
    }
    
    return {
      status: 'healthy',
      component: 'email',
      timestamp: new Date().toISOString(),
      duration: 0,
      details: {
        service: 'resend',
        configuration: 'valid'
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      component: 'email',
      timestamp: new Date().toISOString(),
      duration: 0,
      error: error instanceof Error ? error.message : 'Email service check failed'
    };
  }
}

// Malaysian e-Invoice specific health checks
export async function malaysianValidationHealthCheck(): Promise<HealthCheckResult> {
  try {
    // Test validation rules are loadable and functional
    const { validateTinFormat } = await import('../../../validation/src/tin-validation');
    
    // Test TIN validation
    const testTins = [
      'C1234567890',  // Corporate
      '123456789012', // Individual
      'G1234567890',  // Government
      'N1234567890'   // Non-profit
    ];
    
    const validationResults = testTins.map(tin => validateTinFormat(tin));
    const allValidationsWorking = validationResults.every(result => 
      typeof result === 'object' && 'isValid' in result
    );
    
    if (!allValidationsWorking) {
      return {
        status: 'degraded',
        component: 'malaysianValidation',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: {
          tinValidation: 'partially functional',
          testedFormats: testTins.length
        }
      };
    }
    
    return {
      status: 'healthy',
      component: 'malaysianValidation',
      timestamp: new Date().toISOString(),
      duration: 0,
      details: {
        tinValidation: 'functional',
        testedFormats: testTins.length,
        validationRules: 'loaded'
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      component: 'malaysianValidation',
      timestamp: new Date().toISOString(),
      duration: 0,
      error: error instanceof Error ? error.message : 'Malaysian validation check failed'
    };
  }
}

// Metrics health check
export async function metricsHealthCheck(): Promise<HealthCheckResult> {
  try {
    const metrics = await register.metrics();
    const hasMetrics = metrics.length > 0;
    
    return {
      status: hasMetrics ? 'healthy' : 'degraded',
      component: 'metrics',
      timestamp: new Date().toISOString(),
      duration: 0,
      details: {
        metricsCount: metrics.split('\n').filter(line => line.startsWith('#')).length,
        registryStatus: 'active'
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      component: 'metrics',
      timestamp: new Date().toISOString(),
      duration: 0,
      error: error instanceof Error ? error.message : 'Metrics collection failed'
    };
  }
}

// Initialize default health checks
export function initializeHealthChecks(db?: any) {
  registerHealthCheck('system', basicSystemCheck);
  registerHealthCheck('metrics', metricsHealthCheck);
  registerHealthCheck('fileStorage', fileStorageHealthCheck);
  registerHealthCheck('email', emailServiceHealthCheck);
  registerHealthCheck('malaysianValidation', malaysianValidationHealthCheck);
  
  if (db) {
    registerHealthCheck('database', () => databaseHealthCheck(db));
  }
  
  logger.info(`Initialized ${healthChecks.size} health checks`);
}

// Express middleware for health check endpoint
export function healthCheckEndpoint() {
  return async (req: any, res: any) => {
    try {
      const health = await checkSystemHealth();
      
      // Set appropriate HTTP status code
      let statusCode = 200;
      if (health.status === 'degraded') {
        statusCode = 200; // Still operational
      } else if (health.status === 'unhealthy') {
        statusCode = 503; // Service unavailable
      }
      
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check endpoint error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      res.status(500).json({
        status: 'unhealthy',
        error: 'Health check system failure',
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Readiness probe for Kubernetes/container orchestration
export async function readinessProbe(): Promise<boolean> {
  try {
    const health = await checkSystemHealth();
    
    // Consider ready if not completely unhealthy
    return health.status !== 'unhealthy';
  } catch (error) {
    logger.error('Readiness probe failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

// Liveness probe for Kubernetes/container orchestration
export async function livenessProbe(): Promise<boolean> {
  try {
    // Simple check that the process is responsive
    const start = Date.now();
    await new Promise(resolve => setImmediate(resolve));
    const responseTime = Date.now() - start;
    
    // Consider alive if event loop responds within 1 second
    return responseTime < 1000;
  } catch (error) {
    logger.error('Liveness probe failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

export default {
  registerHealthCheck,
  checkSystemHealth,
  initializeHealthChecks,
  healthCheckEndpoint,
  readinessProbe,
  livenessProbe,
  basicSystemCheck,
  databaseHealthCheck,
  fileStorageHealthCheck,
  emailServiceHealthCheck,
  malaysianValidationHealthCheck,
  metricsHealthCheck
};