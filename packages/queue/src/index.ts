// Easy e-Invoice Job Queue Package
// Main exports for job queue system with Malaysian e-Invoice support

// Import types and implementations for internal use
import {
  Job,
  JobQueue,
  JobType,
  JobStatus,
  JobPriority,
  JobPayload,
  JobConfig,
  JobResult,
  JobProgress,
  QueueStats,
  WorkerConfig,
  JobError,
  JobTimeoutError,
  JobValidationError
} from './types';

import { CloudflareJobQueue, JobEventEmitter } from './queue';
import { CsvImportProcessor } from './processors/csv-import-processor';
import { MyInvoisProcessor, MyInvoisClient } from './processors/myinvois-processor';
import { 
  JobRetryHandler, 
  RetryStrategy, 
  DEFAULT_RETRY_CONFIGS 
} from './retry-handler';
import { 
  JobCancellationHandler, 
  CancellationReason, 
  CancellationMethod, 
  DEFAULT_CANCELLATION_CONFIGS 
} from './cancellation-handler';

export * from './types';
export * from './queue';
export * from './retry-handler';
export * from './cancellation-handler';
export * from './processors/csv-import-processor';
export * from './processors/myinvois-processor';

// Utility functions
export const createJobQueue = (
  storage: DurableObjectStorage,
  environment: {
    DATABASE_URL: string;
    RESEND_API_KEY: string;
    QUEUE_NAMESPACE: KVNamespace;
  }
) => {
  return new CloudflareJobQueue(storage, environment);
};

// Job type helpers
export const isFileProcessingJob = (jobType: JobType): boolean => {
  return [
    JobType.CSV_IMPORT,
    JobType.EXCEL_IMPORT,
    JobType.PDF_EXPORT,
    JobType.JSON_EXPORT,
    JobType.BULK_EXPORT
  ].includes(jobType);
};

export const isValidationJob = (jobType: JobType): boolean => {
  return [
    JobType.BULK_VALIDATION,
    JobType.COMPLIANCE_CHECK,
    JobType.TIN_VALIDATION
  ].includes(jobType);
};

export const isMyInvoisJob = (jobType: JobType): boolean => {
  return [
    JobType.MYINVOIS_SUBMISSION,
    JobType.BULK_SUBMISSION,
    JobType.STATUS_SYNC
  ].includes(jobType);
};

export const isSystemJob = (jobType: JobType): boolean => {
  return [
    JobType.DATA_CLEANUP,
    JobType.BACKUP_PROCESS,
    JobType.AUDIT_LOG_PROCESS
  ].includes(jobType);
};

// Priority helpers
export const getJobPriorityName = (priority: JobPriority): string => {
  switch (priority) {
    case JobPriority.LOW:
      return 'Low';
    case JobPriority.NORMAL:
      return 'Normal';
    case JobPriority.HIGH:
      return 'High';
    case JobPriority.CRITICAL:
      return 'Critical';
    default:
      return 'Unknown';
  }
};

// Status helpers
export const getJobStatusColor = (status: JobStatus): string => {
  switch (status) {
    case JobStatus.PENDING:
      return '#FFA500'; // Orange
    case JobStatus.PROCESSING:
      return '#007BFF'; // Blue
    case JobStatus.COMPLETED:
      return '#28A745'; // Green
    case JobStatus.FAILED:
      return '#DC3545'; // Red
    case JobStatus.CANCELLED:
      return '#6C757D'; // Gray
    case JobStatus.RETRYING:
      return '#FFC107'; // Yellow
    default:
      return '#000000'; // Black
  }
};

export const isJobTerminal = (status: JobStatus): boolean => {
  return [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED].includes(status);
};

export const isJobActive = (status: JobStatus): boolean => {
  return [JobStatus.PENDING, JobStatus.PROCESSING, JobStatus.RETRYING].includes(status);
};

// Duration helpers
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export const getEstimatedCompletionTime = (
  startTime: Date,
  progress: number
): Date | null => {
  if (progress <= 0 || progress >= 100) {
    return null;
  }
  
  const elapsed = Date.now() - startTime.getTime();
  const totalEstimated = elapsed / (progress / 100);
  const remaining = totalEstimated - elapsed;
  
  return new Date(Date.now() + remaining);
};

// Malaysian e-Invoice specific helpers
export const getMalaysianBusinessHours = (): { start: number; end: number } => {
  return { start: 9, end: 18 }; // 9 AM to 6 PM Malaysian time
};

export const isWithinMalaysianBusinessHours = (date: Date = new Date()): boolean => {
  const malaysianTime = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
  const hours = malaysianTime.getHours();
  const day = malaysianTime.getDay();
  
  // Monday to Friday, 9 AM to 6 PM
  return day >= 1 && day <= 5 && hours >= 9 && hours < 18;
};

export const getNextMalaysianBusinessDay = (date: Date = new Date()): Date => {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) { // Skip weekends
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  // Set to 9 AM Malaysian time
  nextDay.setHours(9, 0, 0, 0);
  
  return nextDay;
};

// Validation helpers
export const validateMalaysianTin = (tin: string): boolean => {
  const corporateTinRegex = /^C\d{10}$/;
  const individualTinRegex = /^\d{12}$/;
  
  return corporateTinRegex.test(tin) || individualTinRegex.test(tin);
};

export const validateMalaysianAmount = (amount: number, currency: string): boolean => {
  if (currency === 'MYR') {
    // Malaysian Ringgit has 2 decimal places
    return Number.isFinite(amount) && amount >= 0 && Number((amount).toFixed(2)) === amount;
  }
  
  // Other currencies - basic validation
  return Number.isFinite(amount) && amount >= 0;
};

export const calculateMalaysianSst = (amount: number): number => {
  // 6% Services and Sales Tax
  return Math.round(amount * 0.06 * 100) / 100;
};

// Export default configuration
export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  concurrency: 3,
  pollInterval: 5000,
  enableDeadLetterQueue: true,
  maxProcessingTime: 600000, // 10 minutes
  healthCheckInterval: 30000  // 30 seconds
};

export const DEFAULT_JOB_CONFIG: JobConfig = {
  priority: JobPriority.NORMAL,
  maxRetries: 3,
  retryDelay: 30000,
  timeout: 300000
};