// Job Queue Types for Easy e-Invoice Background Processing
// Provides type definitions for job queue system with Malaysian e-Invoice context
import { z } from 'zod';
// Job status enumeration
export var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "pending";
    JobStatus["PROCESSING"] = "processing";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["FAILED"] = "failed";
    JobStatus["CANCELLED"] = "cancelled";
    JobStatus["RETRYING"] = "retrying";
})(JobStatus || (JobStatus = {}));
// Job priority levels
export var JobPriority;
(function (JobPriority) {
    JobPriority[JobPriority["LOW"] = 1] = "LOW";
    JobPriority[JobPriority["NORMAL"] = 2] = "NORMAL";
    JobPriority[JobPriority["HIGH"] = 3] = "HIGH";
    JobPriority[JobPriority["CRITICAL"] = 4] = "CRITICAL";
})(JobPriority || (JobPriority = {}));
// Job types for Malaysian e-Invoice processing
export var JobType;
(function (JobType) {
    // File processing jobs
    JobType["CSV_IMPORT"] = "csv_import";
    JobType["EXCEL_IMPORT"] = "excel_import";
    JobType["PDF_EXPORT"] = "pdf_export";
    JobType["JSON_EXPORT"] = "json_export";
    JobType["BULK_EXPORT"] = "bulk_export";
    // Validation jobs
    JobType["BULK_VALIDATION"] = "bulk_validation";
    JobType["COMPLIANCE_CHECK"] = "compliance_check";
    JobType["TIN_VALIDATION"] = "tin_validation";
    // External API jobs
    JobType["MYINVOIS_SUBMISSION"] = "myinvois_submission";
    JobType["BULK_SUBMISSION"] = "bulk_submission";
    JobType["STATUS_SYNC"] = "status_sync";
    // System maintenance
    JobType["DATA_CLEANUP"] = "data_cleanup";
    JobType["BACKUP_PROCESS"] = "backup_process";
    JobType["AUDIT_LOG_PROCESS"] = "audit_log_process";
})(JobType || (JobType = {}));
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
// Error types
export class JobError extends Error {
    jobId;
    jobType;
    isRetryable;
    constructor(message, jobId, jobType, isRetryable = true) {
        super(message);
        this.jobId = jobId;
        this.jobType = jobType;
        this.isRetryable = isRetryable;
        this.name = 'JobError';
    }
}
export class JobTimeoutError extends JobError {
    constructor(jobId, jobType, timeout) {
        super(`Job ${jobId} of type ${jobType} timed out after ${timeout}ms`, jobId, jobType, false);
        this.name = 'JobTimeoutError';
    }
}
export class JobValidationError extends JobError {
    constructor(jobId, jobType, validationErrors) {
        super(`Job ${jobId} payload validation failed: ${validationErrors.join(', ')}`, jobId, jobType, false);
        this.name = 'JobValidationError';
    }
}
