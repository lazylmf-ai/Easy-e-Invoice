// Job Queue Types for Easy e-Invoice Background Processing
// Provides type definitions for job queue system with Malaysian e-Invoice context

import { z } from 'zod';

// Job status enumeration
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

// Job priority levels
export enum JobPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

// Job types for Malaysian e-Invoice processing
export enum JobType {
  // File processing jobs
  CSV_IMPORT = 'csv_import',
  EXCEL_IMPORT = 'excel_import',
  PDF_EXPORT = 'pdf_export',
  JSON_EXPORT = 'json_export',
  BULK_EXPORT = 'bulk_export',
  
  // Validation jobs
  BULK_VALIDATION = 'bulk_validation',
  COMPLIANCE_CHECK = 'compliance_check',
  TIN_VALIDATION = 'tin_validation',
  
  // External API jobs
  MYINVOIS_SUBMISSION = 'myinvois_submission',
  BULK_SUBMISSION = 'bulk_submission',
  STATUS_SYNC = 'status_sync',
  
  // System maintenance
  DATA_CLEANUP = 'data_cleanup',
  BACKUP_PROCESS = 'backup_process',
  AUDIT_LOG_PROCESS = 'audit_log_process'
}

// Base job payload schema
export const JobPayloadSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  metadata: z.record(z.unknown()).optional(),
  source: z.enum(['api', 'web', 'system']).default('api')
});

// CSV Import job payload
export const CsvImportPayloadSchema = JobPayloadSchema.extend({
  fileKey: z.string(),
  fileName: z.string(),
  fileSize: z.number().positive(),
  columnMapping: z.record(z.string()),
  validationRules: z.array(z.string()).optional(),
  batchSize: z.number().positive().default(100)
});

// Bulk validation job payload
export const BulkValidationPayloadSchema = JobPayloadSchema.extend({
  invoiceIds: z.array(z.string().uuid()),
  validationType: z.enum(['full', 'quick', 'compliance_only']).default('full'),
  malaysianRules: z.boolean().default(true)
});

// MyInvois submission job payload
export const MyInvoisSubmissionPayloadSchema = JobPayloadSchema.extend({
  invoiceIds: z.array(z.string().uuid()),
  submissionType: z.enum(['single', 'batch']).default('single'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  retryOnFailure: z.boolean().default(true)
});

// Export job payload
export const ExportPayloadSchema = JobPayloadSchema.extend({
  exportType: z.enum(['pdf', 'json', 'csv']),
  invoiceIds: z.array(z.string().uuid()),
  filters: z.record(z.unknown()).optional(),
  format: z.record(z.unknown()).optional(),
  includeAttachments: z.boolean().default(false)
});

// Job configuration schema
export const JobConfigSchema = z.object({
  priority: z.nativeEnum(JobPriority).default(JobPriority.NORMAL),
  maxRetries: z.number().min(0).max(10).default(3),
  retryDelay: z.number().positive().default(30000), // 30 seconds
  timeout: z.number().positive().default(300000), // 5 minutes
  tags: z.array(z.string()).optional(),
  scheduledFor: z.date().optional(),
  expiresAt: z.date().optional(),
  dependsOn: z.array(z.string().uuid()).optional()
});

// Job result schema
export const JobResultSchema = z.object({
  success: z.boolean(),
  data: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  statistics: z.object({
    processed: z.number().min(0),
    successful: z.number().min(0),
    failed: z.number().min(0),
    skipped: z.number().min(0)
  }).optional(),
  outputFiles: z.array(z.object({
    key: z.string(),
    url: z.string(),
    size: z.number(),
    type: z.string()
  })).optional()
});

// Job progress schema
export const JobProgressSchema = z.object({
  percentage: z.number().min(0).max(100),
  currentStep: z.string(),
  totalSteps: z.number().positive().optional(),
  completedSteps: z.number().min(0).optional(),
  message: z.string().optional(),
  estimatedTimeRemaining: z.number().positive().optional() // milliseconds
});

// Main job schema
export const JobSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(JobType),
  status: z.nativeEnum(JobStatus),
  payload: z.union([
    CsvImportPayloadSchema,
    BulkValidationPayloadSchema,
    MyInvoisSubmissionPayloadSchema,
    ExportPayloadSchema,
    JobPayloadSchema
  ]),
  config: JobConfigSchema,
  result: JobResultSchema.optional(),
  progress: JobProgressSchema.optional(),
  error: z.string().optional(),
  retryCount: z.number().min(0).default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  workerInstance: z.string().optional(),
  logs: z.array(z.object({
    timestamp: z.date(),
    level: z.enum(['info', 'warn', 'error', 'debug']),
    message: z.string(),
    data: z.record(z.unknown()).optional()
  })).default([])
});

// Type inference
export type Job = z.infer<typeof JobSchema>;
export type JobPayload = z.infer<typeof JobPayloadSchema>;
export type CsvImportPayload = z.infer<typeof CsvImportPayloadSchema>;
export type BulkValidationPayload = z.infer<typeof BulkValidationPayloadSchema>;
export type MyInvoisSubmissionPayload = z.infer<typeof MyInvoisSubmissionPayloadSchema>;
export type ExportPayload = z.infer<typeof ExportPayloadSchema>;
export type JobConfig = z.infer<typeof JobConfigSchema>;
export type JobResult = z.infer<typeof JobResultSchema>;
export type JobProgress = z.infer<typeof JobProgressSchema>;

// Queue statistics
export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalJobs: number;
  averageProcessingTime: number;
  queueHealth: 'healthy' | 'degraded' | 'critical';
}

// Worker configuration
export interface WorkerConfig {
  concurrency: number;
  pollInterval: number;
  enableDeadLetterQueue: boolean;
  maxProcessingTime: number;
  healthCheckInterval: number;
}

// Job queue interface
export interface JobQueue {
  // Job management
  addJob<T extends JobPayload>(
    type: JobType,
    payload: T,
    config?: Partial<JobConfig>
  ): Promise<Job>;
  
  getJob(jobId: string): Promise<Job | null>;
  updateJob(jobId: string, updates: Partial<Job>): Promise<void>;
  cancelJob(jobId: string): Promise<void>;
  retryJob(jobId: string): Promise<void>;
  
  // Queue operations
  getJobs(
    filters?: {
      status?: JobStatus[];
      type?: JobType[];
      organizationId?: string;
      userId?: string;
    },
    pagination?: {
      limit: number;
      offset: number;
    }
  ): Promise<{ jobs: Job[]; total: number }>;
  
  getQueueStats(): Promise<QueueStats>;
  clearCompletedJobs(olderThan?: Date): Promise<number>;
  
  // Worker operations
  processJobs(workerConfig: WorkerConfig): Promise<void>;
  stopProcessing(): Promise<void>;
}

// Job processor interface
export interface JobProcessor {
  process(job: Job): Promise<JobResult>;
  getEstimatedDuration(payload: JobPayload): Promise<number>;
  validatePayload(payload: unknown): Promise<boolean>;
}

// Event types for job queue
export interface JobEvents {
  'job:created': { job: Job };
  'job:started': { job: Job };
  'job:progress': { job: Job; progress: JobProgress };
  'job:completed': { job: Job; result: JobResult };
  'job:failed': { job: Job; error: string };
  'job:cancelled': { job: Job };
  'job:retry': { job: Job; retryCount: number };
  'queue:stats': { stats: QueueStats };
}

// Error types
export class JobError extends Error {
  constructor(
    message: string,
    public readonly jobId: string,
    public readonly jobType: JobType,
    public readonly isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'JobError';
  }
}

export class JobTimeoutError extends JobError {
  constructor(jobId: string, jobType: JobType, timeout: number) {
    super(
      `Job ${jobId} of type ${jobType} timed out after ${timeout}ms`,
      jobId,
      jobType,
      false
    );
    this.name = 'JobTimeoutError';
  }
}

export class JobValidationError extends JobError {
  constructor(jobId: string, jobType: JobType, validationErrors: string[]) {
    super(
      `Job ${jobId} payload validation failed: ${validationErrors.join(', ')}`,
      jobId,
      jobType,
      false
    );
    this.name = 'JobValidationError';
  }
}