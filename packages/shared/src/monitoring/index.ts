// Centralized monitoring exports
export * from './logger';
export * from './metrics';
export * from './health';

// Default monitoring configuration
export const monitoringConfig = {
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.NODE_ENV !== 'production',
    enableFiles: true,
    maxFileSize: '20m',
    maxFiles: '14d',
    auditRetention: '365d'
  },
  metrics: {
    collectInterval: 60000, // 1 minute
    enableDefaultMetrics: true,
    histogramBuckets: {
      http: [0.1, 0.5, 1, 2, 5, 10],
      validation: [0.01, 0.05, 0.1, 0.5, 1, 2],
      fileProcessing: [0.5, 1, 2, 5, 10, 30, 60],
      database: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    }
  },
  health: {
    checkInterval: 30000, // 30 seconds
    timeout: 10000, // 10 seconds per check
    enableEndpoint: true,
    enableProbes: true
  }
};

// Initialize monitoring
export function initializeMonitoring(options: {
  database?: any;
  enableHealthChecks?: boolean;
  enableMetrics?: boolean;
  customChecks?: Array<{ name: string; check: () => Promise<any> }>;
} = {}) {
  const { 
    database, 
    enableHealthChecks = true, 
    enableMetrics = true,
    customChecks = []
  } = options;

  // Initialize health checks
  if (enableHealthChecks) {
    const { initializeHealthChecks, registerHealthCheck } = require('./health');
    initializeHealthChecks(database);
    
    // Register custom health checks
    customChecks.forEach(({ name, check }) => {
      registerHealthCheck(name, check);
    });
  }

  // Start periodic metrics collection
  if (enableMetrics) {
    const { startPeriodicMetricsCollection } = require('./metrics');
    startPeriodicMetricsCollection();
  }

  return {
    logger: require('./logger'),
    metrics: require('./metrics'),
    health: require('./health')
  };
}