// Retry Handler for Easy e-Invoice Job Queue
// Advanced retry mechanisms with exponential backoff and Malaysian business context

import { v4 as uuidv4 } from 'uuid';
import {
  Job,
  JobStatus,
  JobType,
  JobError,
  JobTimeoutError,
  JobValidationError
} from './types';

// Retry strategy types
export enum RetryStrategy {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_INTERVAL = 'fixed_interval',
  IMMEDIATE = 'immediate',
  BUSINESS_HOURS_ONLY = 'business_hours_only'
}

// Retry configuration
export interface RetryConfig {
  strategy: RetryStrategy;
  maxRetries: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number; // For exponential/linear backoff
  jitterEnabled: boolean; // Add randomness to prevent thundering herd
  retryableErrors: string[]; // Error types that should trigger retry
  nonRetryableErrors: string[]; // Error types that should NOT trigger retry
  businessHoursOnly: boolean; // Only retry during Malaysian business hours
  escalationThreshold: number; // Retry count at which to escalate
}

// Retry attempt record
export interface RetryAttempt {
  attemptNumber: number;
  timestamp: Date;
  error: string;
  delay: number;
  strategy: RetryStrategy;
  nextAttemptAt: Date;
}

// Retry statistics
export interface RetryStats {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  averageRetryDelay: number;
  mostCommonErrors: Record<string, number>;
  retrySuccessRate: number;
}

// Default retry configurations for different job types
export const DEFAULT_RETRY_CONFIGS: Record<JobType, RetryConfig> = {
  // File processing jobs - more retries due to potential temporary issues
  [JobType.CSV_IMPORT]: {
    strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
    maxRetries: 5,
    baseDelay: 30000, // 30 seconds
    maxDelay: 600000, // 10 minutes
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'TIMEOUT', 'TEMPORARY_ERROR'],
    nonRetryableErrors: ['VALIDATION_ERROR', 'AUTHENTICATION_FAILED', 'FILE_NOT_FOUND'],
    businessHoursOnly: false,
    escalationThreshold: 3
  },
  
  [JobType.EXCEL_IMPORT]: {
    strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
    maxRetries: 5,
    baseDelay: 30000,
    maxDelay: 600000,
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'TIMEOUT', 'TEMPORARY_ERROR'],
    nonRetryableErrors: ['VALIDATION_ERROR', 'AUTHENTICATION_FAILED', 'FILE_NOT_FOUND'],
    businessHoursOnly: false,
    escalationThreshold: 3
  },
  
  // Export jobs - fewer retries, shorter delays
  [JobType.PDF_EXPORT]: {
    strategy: RetryStrategy.LINEAR_BACKOFF,
    maxRetries: 3,
    baseDelay: 15000, // 15 seconds
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 1.5,
    jitterEnabled: true,
    retryableErrors: ['ECONNRESET', 'TIMEOUT', 'TEMPORARY_ERROR'],
    nonRetryableErrors: ['VALIDATION_ERROR', 'FILE_NOT_FOUND', 'PERMISSION_DENIED'],
    businessHoursOnly: false,
    escalationThreshold: 2
  },
  
  [JobType.JSON_EXPORT]: {
    strategy: RetryStrategy.LINEAR_BACKOFF,
    maxRetries: 3,
    baseDelay: 15000,
    maxDelay: 300000,
    backoffMultiplier: 1.5,
    jitterEnabled: true,
    retryableErrors: ['ECONNRESET', 'TIMEOUT', 'TEMPORARY_ERROR'],
    nonRetryableErrors: ['VALIDATION_ERROR', 'FILE_NOT_FOUND'],
    businessHoursOnly: false,
    escalationThreshold: 2
  },
  
  [JobType.BULK_EXPORT]: {
    strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
    maxRetries: 4,
    baseDelay: 45000, // 45 seconds
    maxDelay: 900000, // 15 minutes
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableErrors: ['ECONNRESET', 'TIMEOUT', 'TEMPORARY_ERROR', 'RATE_LIMIT_EXCEEDED'],
    nonRetryableErrors: ['VALIDATION_ERROR', 'FILE_NOT_FOUND'],
    businessHoursOnly: false,
    escalationThreshold: 3
  },
  
  // Validation jobs - immediate retry for transient issues
  [JobType.BULK_VALIDATION]: {
    strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
    maxRetries: 3,
    baseDelay: 10000, // 10 seconds
    maxDelay: 120000, // 2 minutes
    backoffMultiplier: 2,
    jitterEnabled: false,
    retryableErrors: ['ECONNRESET', 'TIMEOUT', 'DATABASE_UNAVAILABLE'],
    nonRetryableErrors: ['VALIDATION_ERROR', 'INVALID_DATA'],
    businessHoursOnly: false,
    escalationThreshold: 2
  },
  
  [JobType.COMPLIANCE_CHECK]: {
    strategy: RetryStrategy.FIXED_INTERVAL,
    maxRetries: 2,
    baseDelay: 30000, // 30 seconds
    maxDelay: 60000, // 1 minute
    backoffMultiplier: 1,
    jitterEnabled: false,
    retryableErrors: ['ECONNRESET', 'TIMEOUT'],
    nonRetryableErrors: ['VALIDATION_ERROR', 'COMPLIANCE_FAILURE'],
    businessHoursOnly: false,
    escalationThreshold: 1
  },
  
  [JobType.TIN_VALIDATION]: {
    strategy: RetryStrategy.IMMEDIATE,
    maxRetries: 2,
    baseDelay: 5000, // 5 seconds
    maxDelay: 15000, // 15 seconds
    backoffMultiplier: 1,
    jitterEnabled: false,
    retryableErrors: ['ECONNRESET', 'TIMEOUT', 'SERVICE_UNAVAILABLE'],
    nonRetryableErrors: ['INVALID_TIN_FORMAT', 'TIN_NOT_FOUND'],
    businessHoursOnly: false,
    escalationThreshold: 1
  },
  
  // MyInvois jobs - business hours preferred, longer delays
  [JobType.MYINVOIS_SUBMISSION]: {
    strategy: RetryStrategy.BUSINESS_HOURS_ONLY,
    maxRetries: 4,
    baseDelay: 300000, // 5 minutes
    maxDelay: 3600000, // 1 hour
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableErrors: ['ECONNRESET', 'TIMEOUT', 'MYINVOIS_BUSY', 'RATE_LIMIT_EXCEEDED'],
    nonRetryableErrors: ['AUTHENTICATION_FAILED', 'INVALID_INVOICE_DATA', 'DUPLICATE_SUBMISSION'],
    businessHoursOnly: true,
    escalationThreshold: 2
  },
  
  [JobType.BULK_SUBMISSION]: {
    strategy: RetryStrategy.BUSINESS_HOURS_ONLY,
    maxRetries: 3,
    baseDelay: 600000, // 10 minutes
    maxDelay: 7200000, // 2 hours
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableErrors: ['ECONNRESET', 'TIMEOUT', 'MYINVOIS_BUSY', 'RATE_LIMIT_EXCEEDED'],
    nonRetryableErrors: ['AUTHENTICATION_FAILED', 'INVALID_BATCH_DATA'],
    businessHoursOnly: true,
    escalationThreshold: 2
  },
  
  [JobType.STATUS_SYNC]: {
    strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
    maxRetries: 5,
    baseDelay: 60000, // 1 minute
    maxDelay: 1800000, // 30 minutes
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableErrors: ['ECONNRESET', 'TIMEOUT', 'MYINVOIS_UNAVAILABLE'],
    nonRetryableErrors: ['AUTHENTICATION_FAILED', 'INVALID_SUBMISSION_ID'],
    businessHoursOnly: false,
    escalationThreshold: 3
  },
  
  // System jobs - conservative retry approach
  [JobType.DATA_CLEANUP]: {
    strategy: RetryStrategy.BUSINESS_HOURS_ONLY,
    maxRetries: 2,
    baseDelay: 1800000, // 30 minutes
    maxDelay: 7200000, // 2 hours
    backoffMultiplier: 2,
    jitterEnabled: false,
    retryableErrors: ['DATABASE_LOCK', 'TIMEOUT'],
    nonRetryableErrors: ['PERMISSION_DENIED', 'INVALID_CLEANUP_PARAMS'],
    businessHoursOnly: true,
    escalationThreshold: 1
  },
  
  [JobType.BACKUP_PROCESS]: {
    strategy: RetryStrategy.FIXED_INTERVAL,
    maxRetries: 3,
    baseDelay: 900000, // 15 minutes
    maxDelay: 3600000, // 1 hour
    backoffMultiplier: 1,
    jitterEnabled: false,
    retryableErrors: ['ECONNRESET', 'TIMEOUT', 'STORAGE_UNAVAILABLE'],
    nonRetryableErrors: ['PERMISSION_DENIED', 'INSUFFICIENT_STORAGE'],
    businessHoursOnly: false,
    escalationThreshold: 2
  },
  
  [JobType.AUDIT_LOG_PROCESS]: {
    strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
    maxRetries: 4,
    baseDelay: 120000, // 2 minutes
    maxDelay: 1800000, // 30 minutes
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableErrors: ['DATABASE_UNAVAILABLE', 'TIMEOUT'],
    nonRetryableErrors: ['INVALID_LOG_FORMAT', 'PERMISSION_DENIED'],
    businessHoursOnly: false,
    escalationThreshold: 2
  }
};

export class JobRetryHandler {
  private retryAttempts = new Map<string, RetryAttempt[]>();
  private retryStats = new Map<JobType, RetryStats>();

  constructor(
    private storage: DurableObjectStorage,
    private customConfigs: Partial<Record<JobType, Partial<RetryConfig>>> = {}
  ) {}

  // Determine if a job should be retried
  async shouldRetryJob(job: Job, error: Error): Promise<boolean> {
    const config = this.getRetryConfig(job.type);
    
    // Check if we've exceeded max retries
    if (job.retryCount >= config.maxRetries) {
      return false;
    }
    
    // Check if error is retryable
    const errorType = this.getErrorType(error);
    
    if (config.nonRetryableErrors.includes(errorType)) {
      return false;
    }
    
    if (config.retryableErrors.length > 0 && !config.retryableErrors.includes(errorType)) {
      return false;
    }
    
    // Special case: TimeoutError is always retryable unless explicitly excluded
    if (error instanceof JobTimeoutError) {
      return !config.nonRetryableErrors.includes('TIMEOUT');
    }
    
    // Special case: ValidationError is never retryable unless explicitly included
    if (error instanceof JobValidationError) {
      return config.retryableErrors.includes('VALIDATION_ERROR');
    }
    
    return true;
  }

  // Calculate retry delay based on strategy
  async calculateRetryDelay(job: Job, error: Error): Promise<number> {
    const config = this.getRetryConfig(job.type);
    const attemptNumber = job.retryCount + 1;
    
    let delay: number;
    
    switch (config.strategy) {
      case RetryStrategy.EXPONENTIAL_BACKOFF:
        delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1),
          config.maxDelay
        );
        break;
        
      case RetryStrategy.LINEAR_BACKOFF:
        delay = Math.min(
          config.baseDelay * (1 + (attemptNumber - 1) * config.backoffMultiplier),
          config.maxDelay
        );
        break;
        
      case RetryStrategy.FIXED_INTERVAL:
        delay = config.baseDelay;
        break;
        
      case RetryStrategy.IMMEDIATE:
        delay = config.baseDelay;
        break;
        
      case RetryStrategy.BUSINESS_HOURS_ONLY:
        delay = this.calculateBusinessHoursDelay(config);
        break;
        
      default:
        delay = config.baseDelay;
    }
    
    // Add jitter if enabled
    if (config.jitterEnabled) {
      const jitter = Math.random() * 0.3; // 30% jitter
      delay = delay * (1 + jitter);
    }
    
    return Math.round(delay);
  }

  // Schedule job retry
  async scheduleRetry(job: Job, error: Error, delay: number): Promise<void> {
    const nextAttemptAt = new Date(Date.now() + delay);
    
    // Record retry attempt
    const attempt: RetryAttempt = {
      attemptNumber: job.retryCount + 1,
      timestamp: new Date(),
      error: error.message,
      delay,
      strategy: this.getRetryConfig(job.type).strategy,
      nextAttemptAt
    };
    
    // Store retry attempt
    const attempts = this.retryAttempts.get(job.id) || [];
    attempts.push(attempt);
    this.retryAttempts.set(job.id, attempts);
    
    // Persist retry information
    await this.storage.put(`retry:${job.id}`, JSON.stringify(attempts));
    
    // Update job status and schedule
    job.status = JobStatus.RETRYING;
    job.retryCount += 1;
    job.error = error.message;
    job.updatedAt = new Date();
    
    // Add retry log
    job.logs.push({
      timestamp: new Date(),
      level: 'warn',
      message: `Retry ${job.retryCount} scheduled`,
      data: {
        error: error.message,
        delay: delay,
        nextAttemptAt: nextAttemptAt.toISOString(),
        strategy: this.getRetryConfig(job.type).strategy
      }
    });
    
    // Store updated job
    await this.storage.put(`job:${job.id}`, JSON.stringify(job));
    
    // Schedule the retry
    await this.storage.put(`retry-schedule:${nextAttemptAt.getTime()}:${job.id}`, job.id);
    
    console.log(`Retry scheduled for job ${job.id}: attempt ${job.retryCount} in ${delay}ms`);
  }

  // Mark retry as successful
  async markRetrySuccess(jobId: string): Promise<void> {
    const attempts = this.retryAttempts.get(jobId);
    if (attempts && attempts.length > 0) {
      // Update statistics
      const jobType = await this.getJobType(jobId);
      if (jobType) {
        this.updateRetryStats(jobType, true, attempts.length);
      }
      
      // Clean up retry data
      this.retryAttempts.delete(jobId);
      await this.storage.delete(`retry:${jobId}`);
      
      console.log(`Retry success recorded for job ${jobId} after ${attempts.length} attempts`);
    }
  }

  // Mark retry as permanently failed
  async markRetryFailure(jobId: string): Promise<void> {
    const attempts = this.retryAttempts.get(jobId);
    if (attempts && attempts.length > 0) {
      // Update statistics
      const jobType = await this.getJobType(jobId);
      if (jobType) {
        this.updateRetryStats(jobType, false, attempts.length);
      }
      
      // Check if escalation is needed
      const config = jobType ? this.getRetryConfig(jobType) : null;
      if (config && attempts.length >= config.escalationThreshold) {
        await this.escalateFailure(jobId, attempts);
      }
      
      // Keep retry data for analysis but mark as failed
      await this.storage.put(`retry-failed:${jobId}`, JSON.stringify(attempts));
      await this.storage.delete(`retry:${jobId}`);
      
      console.log(`Retry failure recorded for job ${jobId} after ${attempts.length} attempts`);
    }
  }

  // Get jobs ready for retry
  async getJobsReadyForRetry(): Promise<string[]> {
    const now = Date.now();
    const readyJobs: string[] = [];
    
    // Get all scheduled retries
    const scheduleKeys = await this.storage.list({ prefix: 'retry-schedule:' });
    
    for (const [key] of scheduleKeys) {
      const scheduledTime = parseInt(key.split(':')[1]);
      if (scheduledTime <= now) {
        const jobId = await this.storage.get(key);
        if (typeof jobId === 'string') {
          readyJobs.push(jobId);
          // Clean up schedule entry
          await this.storage.delete(key);
        }
      }
    }
    
    return readyJobs;
  }

  // Get retry statistics
  async getRetryStats(jobType?: JobType): Promise<RetryStats | Record<JobType, RetryStats>> {
    if (jobType) {
      return this.retryStats.get(jobType) || this.getDefaultStats();
    }
    
    const allStats: Record<JobType, RetryStats> = {} as Record<JobType, RetryStats>;
    for (const type of Object.values(JobType)) {
      allStats[type] = this.retryStats.get(type) || this.getDefaultStats();
    }
    
    return allStats;
  }

  // Clean up old retry data
  async cleanupOldRetryData(olderThan: Date): Promise<number> {
    let cleanedCount = 0;
    
    // Clean up failed retry records
    const failedKeys = await this.storage.list({ prefix: 'retry-failed:' });
    for (const [key] of failedKeys) {
      const data = await this.storage.get(key);
      if (data) {
        const attempts = JSON.parse(data as string) as RetryAttempt[];
        const lastAttempt = attempts[attempts.length - 1];
        if (lastAttempt && lastAttempt.timestamp < olderThan) {
          await this.storage.delete(key);
          cleanedCount++;
        }
      }
    }
    
    // Clean up old schedule entries
    const scheduleKeys = await this.storage.list({ prefix: 'retry-schedule:' });
    for (const [key] of scheduleKeys) {
      const scheduledTime = parseInt(key.split(':')[1]);
      if (scheduledTime < olderThan.getTime()) {
        await this.storage.delete(key);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  // Private helper methods
  private getRetryConfig(jobType: JobType): RetryConfig {
    const defaultConfig = DEFAULT_RETRY_CONFIGS[jobType];
    const customConfig = this.customConfigs[jobType] || {};
    
    return { ...defaultConfig, ...customConfig };
  }

  private getErrorType(error: Error): string {
    if (error instanceof JobTimeoutError) {
      return 'TIMEOUT';
    }
    
    if (error instanceof JobValidationError) {
      return 'VALIDATION_ERROR';
    }
    
    if (error instanceof JobError) {
      return error.name.toUpperCase();
    }
    
    // Check error message for common patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('econnreset')) return 'ECONNRESET';
    if (message.includes('enotfound')) return 'ENOTFOUND';
    if (message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('rate limit')) return 'RATE_LIMIT_EXCEEDED';
    if (message.includes('authentication')) return 'AUTHENTICATION_FAILED';
    if (message.includes('permission')) return 'PERMISSION_DENIED';
    if (message.includes('not found')) return 'NOT_FOUND';
    if (message.includes('validation')) return 'VALIDATION_ERROR';
    if (message.includes('database')) return 'DATABASE_ERROR';
    if (message.includes('storage')) return 'STORAGE_ERROR';
    
    return 'UNKNOWN_ERROR';
  }

  private calculateBusinessHoursDelay(config: RetryConfig): number {
    const now = new Date();
    const malaysianTime = new Date(now.toLocaleString('en-US', { 
      timeZone: 'Asia/Kuala_Lumpur' 
    }));
    
    const hour = malaysianTime.getHours();
    const day = malaysianTime.getDay();
    
    // Check if it's business hours (Monday-Friday, 9 AM - 6 PM)
    const isBusinessHours = day >= 1 && day <= 5 && hour >= 9 && hour < 18;
    
    if (isBusinessHours) {
      return config.baseDelay;
    }
    
    // Calculate delay until next business day 9 AM
    const nextBusinessDay = new Date(malaysianTime);
    
    if (day === 5 && hour >= 18) { // Friday after hours
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 3); // Monday
    } else if (day === 6) { // Saturday
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 2); // Monday
    } else if (day === 0) { // Sunday
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 1); // Monday
    } else if (hour >= 18) { // After hours on weekday
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
    }
    
    nextBusinessDay.setHours(9, 0, 0, 0);
    
    return nextBusinessDay.getTime() - now.getTime();
  }

  private async getJobType(jobId: string): Promise<JobType | null> {
    const jobData = await this.storage.get(`job:${jobId}`);
    if (jobData) {
      const job = JSON.parse(jobData as string) as Job;
      return job.type;
    }
    return null;
  }

  private updateRetryStats(jobType: JobType, success: boolean, attemptCount: number): void {
    const stats = this.retryStats.get(jobType) || this.getDefaultStats();
    
    stats.totalRetries += attemptCount;
    if (success) {
      stats.successfulRetries += 1;
    } else {
      stats.failedRetries += 1;
    }
    
    // Update success rate
    const totalJobs = stats.successfulRetries + stats.failedRetries;
    stats.retrySuccessRate = totalJobs > 0 ? (stats.successfulRetries / totalJobs) * 100 : 0;
    
    this.retryStats.set(jobType, stats);
  }

  private getDefaultStats(): RetryStats {
    return {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryDelay: 0,
      mostCommonErrors: {},
      retrySuccessRate: 0
    };
  }

  private async escalateFailure(jobId: string, attempts: RetryAttempt[]): Promise<void> {
    // This would typically send notifications to administrators
    // or create support tickets for manual intervention
    
    const escalationData = {
      jobId,
      attemptCount: attempts.length,
      errors: attempts.map(a => a.error),
      timestamp: new Date().toISOString()
    };
    
    await this.storage.put(`escalation:${jobId}`, JSON.stringify(escalationData));
    
    console.log(`Job ${jobId} escalated after ${attempts.length} failed retry attempts`);
  }
}