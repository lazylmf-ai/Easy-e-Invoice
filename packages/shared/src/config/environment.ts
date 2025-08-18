import { z } from 'zod';
import { createContextLogger } from '../monitoring/logger';

const logger = createContextLogger('environment');

// Environment schema validation
const environmentSchema = z.object({
  // Application
  APP_NAME: z.string().default('Easy e-Invoice'),
  APP_VERSION: z.string().default('1.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8787),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.coerce.number().default(20),
  DATABASE_TIMEOUT: z.coerce.number().default(30000),
  DATABASE_SSL_MODE: z.enum(['require', 'prefer', 'disable']).default('require'),
  DB_RETRY_ATTEMPTS: z.coerce.number().default(3),
  DB_RETRY_DELAY: z.coerce.number().default(5000),

  // Authentication & Security
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('easy-einvoice'),
  JWT_AUDIENCE: z.string().default('easy-einvoice-users'),
  
  ENCRYPTION_KEY: z.string().length(32, 'Encryption key must be exactly 32 characters'),
  ENCRYPTION_ALGORITHM: z.string().default('aes-256-gcm'),
  
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(12),
  PASSWORD_MIN_LENGTH: z.coerce.number().min(8).default(8),

  // Session
  SESSION_TIMEOUT_MS: z.coerce.number().default(86400000), // 24 hours
  SESSION_CLEANUP_INTERVAL: z.coerce.number().default(3600000), // 1 hour

  // CORS & Security Headers
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),
  CORS_MAX_AGE: z.coerce.number().default(86400),
  
  SECURITY_HSTS_MAX_AGE: z.coerce.number().default(31536000),
  SECURITY_CSP_REPORT_URI: z.string().default('/api/csp-report'),
  SECURITY_FRAME_OPTIONS: z.enum(['DENY', 'SAMEORIGIN', 'ALLOW-FROM']).default('DENY'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_SKIP_SUCCESSFUL: z.coerce.boolean().default(false),
  
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  AUTH_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().default(5),
  AUTH_RATE_LIMIT_LOCKOUT_DURATION: z.coerce.number().default(3600000),
  
  FILE_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(300000),
  FILE_RATE_LIMIT_MAX_UPLOADS: z.coerce.number().default(10),
  FILE_MAX_SIZE_MB: z.coerce.number().default(50),

  // Email Service
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  FROM_NAME: z.string().default('Easy e-Invoice'),
  REPLY_TO_EMAIL: z.string().email().optional(),
  
  EMAIL_TEMPLATE_MAGIC_LINK: z.string().default('magic-link'),
  EMAIL_TEMPLATE_WELCOME: z.string().default('welcome'),
  EMAIL_TEMPLATE_ALERT: z.string().default('alert'),
  
  EMAIL_RATE_LIMIT_PER_HOUR: z.coerce.number().default(50),
  EMAIL_RATE_LIMIT_PER_DAY: z.coerce.number().default(200),

  // Malaysian e-Invoice API
  MYINVOIS_API_URL: z.string().url().default('https://api.myinvois.hasil.gov.my'),
  MYINVOIS_SANDBOX_URL: z.string().url().default('https://preprod-api.myinvois.hasil.gov.my'),
  MYINVOIS_CLIENT_ID: z.string().optional(),
  MYINVOIS_CLIENT_SECRET: z.string().optional(),
  MYINVOIS_SCOPE: z.string().default('InvoicingAPI'),
  MYINVOIS_GRANT_TYPE: z.string().default('client_credentials'),
  
  MYINVOIS_TIMEOUT: z.coerce.number().default(30000),
  MYINVOIS_RETRY_ATTEMPTS: z.coerce.number().default(3),
  MYINVOIS_RETRY_DELAY: z.coerce.number().default(2000),
  MYINVOIS_RATE_LIMIT: z.coerce.number().default(100),

  // Malaysian Compliance
  MALAYSIA_TIMEZONE: z.string().default('Asia/Kuala_Lumpur'),
  MALAYSIA_CURRENCY: z.string().default('MYR'),
  MALAYSIA_SST_RATE: z.coerce.number().default(6),
  MALAYSIA_DECIMAL_PLACES: z.coerce.number().default(2),

  // File Storage
  R2_BUCKET_NAME: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ENDPOINT: z.string().url().optional(),
  R2_REGION: z.string().default('auto'),
  R2_PUBLIC_URL: z.string().url().optional(),
  
  STORAGE_MAX_FILE_SIZE: z.coerce.number().default(52428800), // 50MB
  STORAGE_ALLOWED_TYPES: z.string().default('csv,pdf,json,xml'),
  STORAGE_RETENTION_DAYS: z.coerce.number().default(2555), // 7 years
  STORAGE_VIRUS_SCAN: z.coerce.boolean().default(true),

  // CDN
  CDN_URL: z.string().url().optional(),
  CDN_CACHE_TTL: z.coerce.number().default(86400),

  // Application URLs
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_WEB_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default('Easy e-Invoice'),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().optional(),
  
  API_BASE_URL: z.string().url().optional(),
  API_DOCS_URL: z.string().url().optional(),
  API_HEALTH_URL: z.string().url().optional(),
  
  MAGIC_LINK_CALLBACK_URL: z.string().url().optional(),
  OAUTH_CALLBACK_URL: z.string().url().optional(),

  // Monitoring & Observability
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  SENTRY_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(1.0),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_PROFILES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_ENABLE_PROFILING: z.coerce.boolean().default(true),
  SENTRY_ENABLE_PERFORMANCE: z.coerce.boolean().default(true),
  
  METRICS_ENABLED: z.coerce.boolean().default(true),
  METRICS_PORT: z.coerce.number().default(9090),
  METRICS_PATH: z.string().default('/metrics'),
  METRICS_COLLECT_INTERVAL: z.coerce.number().default(60000),
  
  HEALTH_CHECK_ENABLED: z.coerce.boolean().default(true),
  HEALTH_CHECK_PATH: z.string().default('/health'),
  HEALTH_CHECK_TIMEOUT: z.coerce.number().default(10000),
  HEALTH_CHECK_INTERVAL: z.coerce.number().default(30000),
  
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),
  LOG_FILE_ENABLED: z.coerce.boolean().default(true),
  LOG_FILE_PATH: z.string().default('./logs'),
  LOG_FILE_MAX_SIZE: z.string().default('20m'),
  LOG_FILE_MAX_FILES: z.string().default('14d'),
  LOG_AUDIT_RETENTION: z.string().default('365d'),

  // Alerting
  ALERT_EMAIL_ENABLED: z.coerce.boolean().default(true),
  ALERT_EMAIL_RECIPIENTS: z.string().optional(),
  ALERT_SLACK_ENABLED: z.coerce.boolean().default(false),
  ALERT_SLACK_WEBHOOK_URL: z.string().url().optional(),
  ALERT_SLACK_CHANNEL: z.string().default('#alerts'),
  ALERT_WEBHOOK_ENABLED: z.coerce.boolean().default(false),
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  
  ALERT_ERROR_RATE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.05),
  ALERT_RESPONSE_TIME_THRESHOLD: z.coerce.number().default(5000),
  ALERT_MEMORY_USAGE_THRESHOLD: z.coerce.number().min(0).max(100).default(90),
  ALERT_DISK_USAGE_THRESHOLD: z.coerce.number().min(0).max(100).default(85),

  // Caching & Performance
  REDIS_URL: z.string().url().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_MAX_RETRIES: z.coerce.number().default(3),
  REDIS_RETRY_DELAY: z.coerce.number().default(1000),
  
  CACHE_ENABLED: z.coerce.boolean().default(true),
  CACHE_TTL_DEFAULT: z.coerce.number().default(3600),
  CACHE_TTL_VALIDATION: z.coerce.number().default(7200),
  CACHE_TTL_TIN_LOOKUP: z.coerce.number().default(86400),
  CACHE_TTL_INDUSTRY_CODES: z.coerce.number().default(604800),
  
  WORKER_THREADS: z.coerce.number().default(4),
  CLUSTER_WORKERS: z.coerce.number().default(0),
  GRACEFUL_SHUTDOWN_TIMEOUT: z.coerce.number().default(30000),
  KEEP_ALIVE_TIMEOUT: z.coerce.number().default(5000),

  // Backup & Recovery
  BACKUP_ENABLED: z.coerce.boolean().default(true),
  BACKUP_SCHEDULE: z.string().default('0 2 * * *'),
  BACKUP_RETENTION_DAYS: z.coerce.number().default(30),
  BACKUP_STORAGE_URL: z.string().url().optional(),
  
  EXPORT_MAX_RECORDS: z.coerce.number().default(10000),
  EXPORT_TIMEOUT: z.coerce.number().default(300000),
  EXPORT_RETENTION_HOURS: z.coerce.number().default(24),

  // Feature Flags
  FEATURE_MYINVOIS_INTEGRATION: z.coerce.boolean().default(true),
  FEATURE_BULK_IMPORT: z.coerce.boolean().default(true),
  FEATURE_PDF_GENERATION: z.coerce.boolean().default(true),
  FEATURE_EMAIL_NOTIFICATIONS: z.coerce.boolean().default(true),
  FEATURE_AUDIT_LOGGING: z.coerce.boolean().default(true),
  FEATURE_ADVANCED_VALIDATION: z.coerce.boolean().default(true),
  
  FEATURE_BETA_ANALYTICS: z.coerce.boolean().default(false),
  FEATURE_BETA_MOBILE_APP: z.coerce.boolean().default(false),
  FEATURE_BETA_API_V2: z.coerce.boolean().default(false),

  // Development & Testing
  DEBUG_MODE: z.coerce.boolean().default(false),
  DEBUG_SQL: z.coerce.boolean().default(false),
  DEBUG_VALIDATION: z.coerce.boolean().default(false),
  TEST_DATA_ENABLED: z.coerce.boolean().default(false),

  // Compliance & Legal
  PDPA_COMPLIANCE: z.coerce.boolean().default(true),
  LHDN_COMPLIANCE: z.coerce.boolean().default(true),
  AUDIT_LOG_ENABLED: z.coerce.boolean().default(true),
  DATA_RETENTION_POLICY: z.coerce.boolean().default(true),
  
  TERMS_OF_SERVICE_URL: z.string().url().optional(),
  PRIVACY_POLICY_URL: z.string().url().optional(),
  COOKIE_POLICY_URL: z.string().url().optional(),

  // Maintenance
  MAINTENANCE_MODE: z.coerce.boolean().default(false),
  MAINTENANCE_MESSAGE: z.string().default('System maintenance in progress. Please try again later.'),
  MAINTENANCE_ALLOWED_IPS: z.string().default(''),
  
  AUTO_UPDATE_ENABLED: z.coerce.boolean().default(false),
  UPDATE_CHECK_INTERVAL: z.coerce.number().default(86400000),
  UPDATE_NOTIFICATION_EMAIL: z.string().email().optional()
});

// Environment configuration type
export type EnvironmentConfig = z.infer<typeof environmentSchema>;

// Validate and parse environment variables
function validateEnvironment(): EnvironmentConfig {
  const result = environmentSchema.safeParse(process.env);
  
  if (!result.success) {
    const errors = result.error.format();
    logger.error('Environment validation failed', { errors });
    
    // Log specific validation errors
    Object.entries(errors).forEach(([key, error]) => {
      if (key !== '_errors' && error && '_errors' in error) {
        logger.error(`Environment variable ${key}: ${error._errors.join(', ')}`);
      }
    });
    
    throw new Error('Invalid environment configuration');
  }
  
  return result.data;
}

// Cached environment configuration
let _config: EnvironmentConfig | null = null;

// Get environment configuration
export function getEnvironmentConfig(): EnvironmentConfig {
  if (!_config) {
    _config = validateEnvironment();
    
    // Log configuration summary (without sensitive data)
    const configSummary = {
      appName: _config.APP_NAME,
      version: _config.APP_VERSION,
      environment: _config.NODE_ENV,
      port: _config.PORT,
      logLevel: _config.LOG_LEVEL,
      databaseUrl: _config.DATABASE_URL ? '[CONFIGURED]' : '[NOT SET]',
      jwtSecret: _config.JWT_SECRET ? '[CONFIGURED]' : '[NOT SET]',
      sentryDsn: _config.SENTRY_DSN ? '[CONFIGURED]' : '[NOT SET]',
      resendApiKey: _config.RESEND_API_KEY ? '[CONFIGURED]' : '[NOT SET]',
      r2Config: _config.R2_BUCKET_NAME ? '[CONFIGURED]' : '[NOT SET]',
      myinvoisConfig: _config.MYINVOIS_CLIENT_ID ? '[CONFIGURED]' : '[NOT SET]',
      featuresEnabled: {
        myinvoisIntegration: _config.FEATURE_MYINVOIS_INTEGRATION,
        bulkImport: _config.FEATURE_BULK_IMPORT,
        pdfGeneration: _config.FEATURE_PDF_GENERATION,
        emailNotifications: _config.FEATURE_EMAIL_NOTIFICATIONS,
        auditLogging: _config.FEATURE_AUDIT_LOGGING,
        advancedValidation: _config.FEATURE_ADVANCED_VALIDATION
      }
    };
    
    logger.info('Environment configuration loaded', configSummary);
  }
  
  return _config;
}

// Check if in production environment
export function isProduction(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'production';
}

// Check if in development environment
export function isDevelopment(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'development';
}

// Check if in test environment
export function isTest(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'test';
}

// Get database configuration
export function getDatabaseConfig() {
  const config = getEnvironmentConfig();
  return {
    url: config.DATABASE_URL,
    poolSize: config.DATABASE_POOL_SIZE,
    timeout: config.DATABASE_TIMEOUT,
    sslMode: config.DATABASE_SSL_MODE,
    retryAttempts: config.DB_RETRY_ATTEMPTS,
    retryDelay: config.DB_RETRY_DELAY
  };
}

// Get JWT configuration
export function getJwtConfig() {
  const config = getEnvironmentConfig();
  return {
    secret: config.JWT_SECRET,
    expiresIn: config.JWT_EXPIRES_IN,
    refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE
  };
}

// Get email configuration
export function getEmailConfig() {
  const config = getEnvironmentConfig();
  return {
    apiKey: config.RESEND_API_KEY,
    fromEmail: config.FROM_EMAIL,
    fromName: config.FROM_NAME,
    replyToEmail: config.REPLY_TO_EMAIL,
    templates: {
      magicLink: config.EMAIL_TEMPLATE_MAGIC_LINK,
      welcome: config.EMAIL_TEMPLATE_WELCOME,
      alert: config.EMAIL_TEMPLATE_ALERT
    },
    rateLimits: {
      perHour: config.EMAIL_RATE_LIMIT_PER_HOUR,
      perDay: config.EMAIL_RATE_LIMIT_PER_DAY
    }
  };
}

// Get MyInvois configuration
export function getMyInvoisConfig() {
  const config = getEnvironmentConfig();
  return {
    apiUrl: config.MYINVOIS_API_URL,
    sandboxUrl: config.MYINVOIS_SANDBOX_URL,
    clientId: config.MYINVOIS_CLIENT_ID,
    clientSecret: config.MYINVOIS_CLIENT_SECRET,
    scope: config.MYINVOIS_SCOPE,
    grantType: config.MYINVOIS_GRANT_TYPE,
    timeout: config.MYINVOIS_TIMEOUT,
    retryAttempts: config.MYINVOIS_RETRY_ATTEMPTS,
    retryDelay: config.MYINVOIS_RETRY_DELAY,
    rateLimit: config.MYINVOIS_RATE_LIMIT
  };
}

// Get storage configuration
export function getStorageConfig() {
  const config = getEnvironmentConfig();
  return {
    bucketName: config.R2_BUCKET_NAME,
    accessKeyId: config.R2_ACCESS_KEY_ID,
    secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    endpoint: config.R2_ENDPOINT,
    region: config.R2_REGION,
    publicUrl: config.R2_PUBLIC_URL,
    maxFileSize: config.STORAGE_MAX_FILE_SIZE,
    allowedTypes: config.STORAGE_ALLOWED_TYPES.split(','),
    retentionDays: config.STORAGE_RETENTION_DAYS,
    virusScan: config.STORAGE_VIRUS_SCAN
  };
}

// Get monitoring configuration
export function getMonitoringConfig() {
  const config = getEnvironmentConfig();
  return {
    sentry: {
      dsn: config.SENTRY_DSN,
      environment: config.SENTRY_ENVIRONMENT,
      sampleRate: config.SENTRY_SAMPLE_RATE,
      tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
      profilesSampleRate: config.SENTRY_PROFILES_SAMPLE_RATE,
      enableProfiling: config.SENTRY_ENABLE_PROFILING,
      enablePerformance: config.SENTRY_ENABLE_PERFORMANCE
    },
    metrics: {
      enabled: config.METRICS_ENABLED,
      port: config.METRICS_PORT,
      path: config.METRICS_PATH,
      collectInterval: config.METRICS_COLLECT_INTERVAL
    },
    healthCheck: {
      enabled: config.HEALTH_CHECK_ENABLED,
      path: config.HEALTH_CHECK_PATH,
      timeout: config.HEALTH_CHECK_TIMEOUT,
      interval: config.HEALTH_CHECK_INTERVAL
    },
    logging: {
      format: config.LOG_FORMAT,
      fileEnabled: config.LOG_FILE_ENABLED,
      filePath: config.LOG_FILE_PATH,
      maxSize: config.LOG_FILE_MAX_SIZE,
      maxFiles: config.LOG_FILE_MAX_FILES,
      auditRetention: config.LOG_AUDIT_RETENTION
    }
  };
}

// Get feature flags
export function getFeatureFlags() {
  const config = getEnvironmentConfig();
  return {
    myinvoisIntegration: config.FEATURE_MYINVOIS_INTEGRATION,
    bulkImport: config.FEATURE_BULK_IMPORT,
    pdfGeneration: config.FEATURE_PDF_GENERATION,
    emailNotifications: config.FEATURE_EMAIL_NOTIFICATIONS,
    auditLogging: config.FEATURE_AUDIT_LOGGING,
    advancedValidation: config.FEATURE_ADVANCED_VALIDATION,
    beta: {
      analytics: config.FEATURE_BETA_ANALYTICS,
      mobileApp: config.FEATURE_BETA_MOBILE_APP,
      apiV2: config.FEATURE_BETA_API_V2
    }
  };
}

// Validate critical configuration
export function validateCriticalConfig(): { valid: boolean; errors: string[] } {
  const config = getEnvironmentConfig();
  const errors: string[] = [];
  
  // Check critical production requirements
  if (isProduction()) {
    if (!config.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production');
    }
    
    if (!config.JWT_SECRET || config.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production');
    }
    
    if (!config.ENCRYPTION_KEY || config.ENCRYPTION_KEY.length !== 32) {
      errors.push('ENCRYPTION_KEY must be exactly 32 characters in production');
    }
    
    if (config.FEATURE_EMAIL_NOTIFICATIONS && !config.RESEND_API_KEY) {
      errors.push('RESEND_API_KEY is required when email notifications are enabled');
    }
    
    if (config.FEATURE_MYINVOIS_INTEGRATION && (!config.MYINVOIS_CLIENT_ID || !config.MYINVOIS_CLIENT_SECRET)) {
      errors.push('MyInvois credentials are required when integration is enabled');
    }
    
    if (!config.R2_BUCKET_NAME || !config.R2_ACCESS_KEY_ID || !config.R2_SECRET_ACCESS_KEY) {
      errors.push('Cloudflare R2 configuration is required in production');
    }
    
    if (!config.SENTRY_DSN) {
      errors.push('SENTRY_DSN is required for error tracking in production');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  getEnvironmentConfig,
  isProduction,
  isDevelopment,
  isTest,
  getDatabaseConfig,
  getJwtConfig,
  getEmailConfig,
  getMyInvoisConfig,
  getStorageConfig,
  getMonitoringConfig,
  getFeatureFlags,
  validateCriticalConfig
};