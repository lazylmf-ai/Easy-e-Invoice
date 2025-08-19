// Job Cancellation Handler for Easy e-Invoice
// Handles graceful and immediate cancellation of jobs with cleanup

import { v4 as uuidv4 } from 'uuid';
import {
  Job,
  JobStatus,
  JobType,
  JobError
} from './types';

// Cancellation reason types
export enum CancellationReason {
  USER_REQUESTED = 'user_requested',
  TIMEOUT = 'timeout',
  SYSTEM_SHUTDOWN = 'system_shutdown',
  RESOURCE_CONSTRAINT = 'resource_constraint',
  DEPENDENCY_FAILED = 'dependency_failed',
  ADMIN_OVERRIDE = 'admin_override',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  DUPLICATE_JOB = 'duplicate_job'
}

// Cancellation method types
export enum CancellationMethod {
  GRACEFUL = 'graceful',     // Allow current operation to complete
  IMMEDIATE = 'immediate',   // Stop immediately
  FORCED = 'forced'          // Force stop with cleanup
}

// Cancellation configuration per job type
export interface CancellationConfig {
  allowUserCancellation: boolean;
  gracefulTimeout: number; // Max time to wait for graceful cancellation
  cleanupRequired: boolean;
  canCancelAfterStart: boolean;
  preserveProgress: boolean;
  notifyStakeholders: boolean;
}

// Cancellation request
export interface CancellationRequest {
  jobId: string;
  reason: CancellationReason;
  method: CancellationMethod;
  requestedBy: string; // User ID or system
  requestedAt: Date;
  message?: string;
  force?: boolean;
}

// Cancellation result
export interface CancellationResult {
  success: boolean;
  method: CancellationMethod;
  completedAt: Date;
  message: string;
  partialResults?: any;
  cleanupPerformed: boolean;
  error?: string;
}

// Cancellation statistics
export interface CancellationStats {
  totalCancellations: number;
  byReason: Record<CancellationReason, number>;
  byMethod: Record<CancellationMethod, number>;
  byJobType: Record<JobType, number>;
  averageCancellationTime: number;
  gracefulSuccessRate: number;
}

// Default cancellation configurations for different job types
export const DEFAULT_CANCELLATION_CONFIGS: Record<JobType, CancellationConfig> = {
  // File processing jobs - allow cancellation but preserve progress
  [JobType.CSV_IMPORT]: {
    allowUserCancellation: true,
    gracefulTimeout: 60000, // 1 minute
    cleanupRequired: true,
    canCancelAfterStart: true,
    preserveProgress: true,
    notifyStakeholders: true
  },
  
  [JobType.EXCEL_IMPORT]: {
    allowUserCancellation: true,
    gracefulTimeout: 60000,
    cleanupRequired: true,
    canCancelAfterStart: true,
    preserveProgress: true,
    notifyStakeholders: true
  },
  
  // Export jobs - quick cancellation, less cleanup needed
  [JobType.PDF_EXPORT]: {
    allowUserCancellation: true,
    gracefulTimeout: 30000, // 30 seconds
    cleanupRequired: false,
    canCancelAfterStart: true,
    preserveProgress: false,
    notifyStakeholders: false
  },
  
  [JobType.JSON_EXPORT]: {
    allowUserCancellation: true,
    gracefulTimeout: 30000,
    cleanupRequired: false,
    canCancelAfterStart: true,
    preserveProgress: false,
    notifyStakeholders: false
  },
  
  [JobType.BULK_EXPORT]: {
    allowUserCancellation: true,
    gracefulTimeout: 120000, // 2 minutes
    cleanupRequired: true,
    canCancelAfterStart: true,
    preserveProgress: true,
    notifyStakeholders: true
  },
  
  // Validation jobs - can be cancelled quickly
  [JobType.BULK_VALIDATION]: {
    allowUserCancellation: true,
    gracefulTimeout: 30000,
    cleanupRequired: false,
    canCancelAfterStart: true,
    preserveProgress: true,
    notifyStakeholders: false
  },
  
  [JobType.COMPLIANCE_CHECK]: {
    allowUserCancellation: true,
    gracefulTimeout: 15000, // 15 seconds
    cleanupRequired: false,
    canCancelAfterStart: true,
    preserveProgress: false,
    notifyStakeholders: false
  },
  
  [JobType.TIN_VALIDATION]: {
    allowUserCancellation: true,
    gracefulTimeout: 10000, // 10 seconds
    cleanupRequired: false,
    canCancelAfterStart: true,
    preserveProgress: false,
    notifyStakeholders: false
  },
  
  // MyInvois jobs - careful cancellation due to external API
  [JobType.MYINVOIS_SUBMISSION]: {
    allowUserCancellation: true,
    gracefulTimeout: 180000, // 3 minutes
    cleanupRequired: true,
    canCancelAfterStart: false, // Don't cancel after submission starts
    preserveProgress: true,
    notifyStakeholders: true
  },
  
  [JobType.BULK_SUBMISSION]: {
    allowUserCancellation: true,
    gracefulTimeout: 300000, // 5 minutes
    cleanupRequired: true,
    canCancelAfterStart: false,
    preserveProgress: true,
    notifyStakeholders: true
  },
  
  [JobType.STATUS_SYNC]: {
    allowUserCancellation: true,
    gracefulTimeout: 60000,
    cleanupRequired: false,
    canCancelAfterStart: true,
    preserveProgress: false,
    notifyStakeholders: false
  },
  
  // System jobs - restricted cancellation
  [JobType.DATA_CLEANUP]: {
    allowUserCancellation: false,
    gracefulTimeout: 300000, // 5 minutes
    cleanupRequired: true,
    canCancelAfterStart: false,
    preserveProgress: false,
    notifyStakeholders: true
  },
  
  [JobType.BACKUP_PROCESS]: {
    allowUserCancellation: false,
    gracefulTimeout: 600000, // 10 minutes
    cleanupRequired: true,
    canCancelAfterStart: false,
    preserveProgress: false,
    notifyStakeholders: true
  },
  
  [JobType.AUDIT_LOG_PROCESS]: {
    allowUserCancellation: false,
    gracefulTimeout: 120000, // 2 minutes
    cleanupRequired: true,
    canCancelAfterStart: true,
    preserveProgress: true,
    notifyStakeholders: true
  }
};

export class JobCancellationHandler {
  private cancellationRequests = new Map<string, CancellationRequest>();
  private cancellationStats = new Map<JobType, CancellationStats>();
  private activeCancellations = new Set<string>();

  constructor(
    private storage: DurableObjectStorage,
    private customConfigs: Partial<Record<JobType, Partial<CancellationConfig>>> = {}
  ) {}

  // Request job cancellation
  async requestCancellation(request: CancellationRequest): Promise<CancellationResult> {
    const job = await this.getJob(request.jobId);
    if (!job) {
      throw new Error(`Job ${request.jobId} not found`);
    }

    const config = this.getCancellationConfig(job.type);
    
    // Validate cancellation request
    await this.validateCancellationRequest(job, request, config);
    
    // Check if already being cancelled
    if (this.activeCancellations.has(request.jobId)) {
      throw new Error(`Job ${request.jobId} is already being cancelled`);
    }

    this.activeCancellations.add(request.jobId);
    this.cancellationRequests.set(request.jobId, request);

    try {
      // Store cancellation request
      await this.storage.put(`cancellation:${request.jobId}`, JSON.stringify(request));
      
      // Add cancellation log to job
      job.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: `Cancellation requested: ${request.reason}`,
        data: {
          reason: request.reason,
          method: request.method,
          requestedBy: request.requestedBy,
          message: request.message
        }
      });

      // Perform cancellation based on method
      let result: CancellationResult;
      
      switch (request.method) {
        case CancellationMethod.GRACEFUL:
          result = await this.performGracefulCancellation(job, request, config);
          break;
          
        case CancellationMethod.IMMEDIATE:
          result = await this.performImmediateCancellation(job, request, config);
          break;
          
        case CancellationMethod.FORCED:
          result = await this.performForcedCancellation(job, request, config);
          break;
          
        default:
          throw new Error(`Unknown cancellation method: ${request.method}`);
      }

      // Update job status
      await this.updateJobAfterCancellation(job, request, result);
      
      // Update statistics
      this.updateCancellationStats(job.type, request, result);
      
      // Clean up cancellation data
      await this.cleanupCancellationData(request.jobId);
      
      return result;

    } finally {
      this.activeCancellations.delete(request.jobId);
      this.cancellationRequests.delete(request.jobId);
    }
  }

  // Check if job can be cancelled
  async canCancelJob(jobId: string, userId?: string): Promise<{
    canCancel: boolean;
    reason: string;
    allowedMethods: CancellationMethod[];
  }> {
    const job = await this.getJob(jobId);
    if (!job) {
      return {
        canCancel: false,
        reason: 'Job not found',
        allowedMethods: []
      };
    }

    const config = this.getCancellationConfig(job.type);
    
    // Check if user cancellation is allowed
    if (userId && !config.allowUserCancellation) {
      return {
        canCancel: false,
        reason: 'User cancellation not allowed for this job type',
        allowedMethods: []
      };
    }

    // Check job status
    if (job.status === JobStatus.COMPLETED) {
      return {
        canCancel: false,
        reason: 'Job already completed',
        allowedMethods: []
      };
    }

    if (job.status === JobStatus.CANCELLED) {
      return {
        canCancel: false,
        reason: 'Job already cancelled',
        allowedMethods: []
      };
    }

    if (job.status === JobStatus.FAILED) {
      return {
        canCancel: false,
        reason: 'Job already failed',
        allowedMethods: []
      };
    }

    // Check if cancellation after start is allowed
    if (job.status === JobStatus.PROCESSING && !config.canCancelAfterStart) {
      return {
        canCancel: false,
        reason: 'Cannot cancel job after processing has started',
        allowedMethods: []
      };
    }

    // Check if already being cancelled
    if (this.activeCancellations.has(jobId)) {
      return {
        canCancel: false,
        reason: 'Job is already being cancelled',
        allowedMethods: []
      };
    }

    // Determine allowed methods
    const allowedMethods: CancellationMethod[] = [];
    
    if (job.status === JobStatus.PENDING) {
      allowedMethods.push(CancellationMethod.IMMEDIATE);
    } else if (job.status === JobStatus.PROCESSING) {
      allowedMethods.push(CancellationMethod.GRACEFUL);
      allowedMethods.push(CancellationMethod.IMMEDIATE);
    }
    
    // Admin can always force cancel
    if (!userId) { // System/admin request
      allowedMethods.push(CancellationMethod.FORCED);
    }

    return {
      canCancel: true,
      reason: 'Job can be cancelled',
      allowedMethods
    };
  }

  // Get active cancellation requests
  async getActiveCancellations(): Promise<CancellationRequest[]> {
    return Array.from(this.cancellationRequests.values());
  }

  // Get cancellation statistics
  async getCancellationStats(jobType?: JobType): Promise<CancellationStats | Record<JobType, CancellationStats>> {
    if (jobType) {
      return this.cancellationStats.get(jobType) || this.getDefaultStats();
    }
    
    const allStats: Record<JobType, CancellationStats> = {} as Record<JobType, CancellationStats>;
    for (const type of Object.values(JobType)) {
      allStats[type] = this.cancellationStats.get(type) || this.getDefaultStats();
    }
    
    return allStats;
  }

  // Cancel all jobs for an organization (admin function)
  async cancelOrganizationJobs(
    organizationId: string, 
    reason: CancellationReason,
    requestedBy: string
  ): Promise<CancellationResult[]> {
    const jobs = await this.getOrganizationJobs(organizationId);
    const results: CancellationResult[] = [];
    
    for (const job of jobs) {
      if (job.status === JobStatus.PENDING || job.status === JobStatus.PROCESSING) {
        try {
          const request: CancellationRequest = {
            jobId: job.id,
            reason,
            method: CancellationMethod.GRACEFUL,
            requestedBy,
            requestedAt: new Date(),
            message: `Bulk cancellation for organization ${organizationId}`
          };
          
          const result = await this.requestCancellation(request);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            method: CancellationMethod.GRACEFUL,
            completedAt: new Date(),
            message: `Failed to cancel job ${job.id}`,
            cleanupPerformed: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
    
    return results;
  }

  // Emergency system shutdown - cancel all jobs
  async emergencyShutdown(): Promise<void> {
    const allJobs = await this.getAllActiveJobs();
    
    const cancellationPromises = allJobs.map(async (job) => {
      const request: CancellationRequest = {
        jobId: job.id,
        reason: CancellationReason.SYSTEM_SHUTDOWN,
        method: CancellationMethod.FORCED,
        requestedBy: 'system',
        requestedAt: new Date(),
        message: 'Emergency system shutdown'
      };
      
      try {
        await this.requestCancellation(request);
      } catch (error) {
        console.error(`Failed to cancel job ${job.id} during shutdown:`, error);
      }
    });
    
    await Promise.allSettled(cancellationPromises);
  }

  // Private helper methods
  private async validateCancellationRequest(
    job: Job, 
    request: CancellationRequest, 
    config: CancellationConfig
  ): Promise<void> {
    // Check if user cancellation is allowed
    if (request.requestedBy !== 'system' && !config.allowUserCancellation) {
      throw new Error(`User cancellation not allowed for job type: ${job.type}`);
    }

    // Check if job can be cancelled after start
    if (job.status === JobStatus.PROCESSING && !config.canCancelAfterStart) {
      throw new Error(`Cannot cancel ${job.type} job after processing has started`);
    }

    // Validate cancellation method
    if (request.method === CancellationMethod.FORCED && request.requestedBy !== 'system') {
      throw new Error('Forced cancellation only allowed for system requests');
    }
  }

  private async performGracefulCancellation(
    job: Job, 
    request: CancellationRequest, 
    config: CancellationConfig
  ): Promise<CancellationResult> {
    const startTime = Date.now();
    
    // Set cancellation flag
    await this.setCancellationFlag(job.id);
    
    // Wait for graceful completion or timeout
    const gracefulTimeout = setTimeout(async () => {
      // If graceful cancellation times out, perform immediate cancellation
      await this.performImmediateCancellation(job, request, config);
    }, config.gracefulTimeout);
    
    // Monitor for job completion or cancellation
    const checkInterval = setInterval(async () => {
      const currentJob = await this.getJob(job.id);
      if (!currentJob || currentJob.status === JobStatus.CANCELLED) {
        clearTimeout(gracefulTimeout);
        clearInterval(checkInterval);
      }
    }, 1000);
    
    // Allow current operation to complete
    await this.waitForGracefulCompletion(job.id, config.gracefulTimeout);
    
    clearTimeout(gracefulTimeout);
    clearInterval(checkInterval);
    
    // Perform cleanup if required
    let cleanupPerformed = false;
    if (config.cleanupRequired) {
      cleanupPerformed = await this.performCleanup(job, config);
    }

    // Preserve progress if configured
    let partialResults;
    if (config.preserveProgress) {
      partialResults = await this.preserveProgress(job);
    }

    return {
      success: true,
      method: CancellationMethod.GRACEFUL,
      completedAt: new Date(),
      message: `Job cancelled gracefully after ${Date.now() - startTime}ms`,
      partialResults,
      cleanupPerformed
    };
  }

  private async performImmediateCancellation(
    job: Job, 
    request: CancellationRequest, 
    config: CancellationConfig
  ): Promise<CancellationResult> {
    const startTime = Date.now();
    
    // Stop job processing immediately
    await this.stopJobProcessing(job.id);
    
    // Perform cleanup if required
    let cleanupPerformed = false;
    if (config.cleanupRequired) {
      cleanupPerformed = await this.performCleanup(job, config);
    }

    // Preserve progress if configured
    let partialResults;
    if (config.preserveProgress) {
      partialResults = await this.preserveProgress(job);
    }

    return {
      success: true,
      method: CancellationMethod.IMMEDIATE,
      completedAt: new Date(),
      message: `Job cancelled immediately after ${Date.now() - startTime}ms`,
      partialResults,
      cleanupPerformed
    };
  }

  private async performForcedCancellation(
    job: Job, 
    request: CancellationRequest, 
    config: CancellationConfig
  ): Promise<CancellationResult> {
    const startTime = Date.now();
    
    // Force stop all job processes
    await this.forceStopJob(job.id);
    
    // Always perform cleanup for forced cancellation
    const cleanupPerformed = await this.performCleanup(job, config);

    return {
      success: true,
      method: CancellationMethod.FORCED,
      completedAt: new Date(),
      message: `Job force cancelled after ${Date.now() - startTime}ms`,
      cleanupPerformed
    };
  }

  private async setCancellationFlag(jobId: string): Promise<void> {
    await this.storage.put(`cancel-flag:${jobId}`, 'true');
  }

  private async getCancellationFlag(jobId: string): Promise<boolean> {
    const flag = await this.storage.get(`cancel-flag:${jobId}`);
    return flag === 'true';
  }

  private async waitForGracefulCompletion(jobId: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        const job = await this.getJob(jobId);
        const elapsed = Date.now() - startTime;
        
        if (!job || job.status === JobStatus.CANCELLED || elapsed >= timeout) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });
  }

  private async stopJobProcessing(jobId: string): Promise<void> {
    // Set immediate stop flag
    await this.storage.put(`stop-flag:${jobId}`, 'immediate');
    
    // Remove from processing queue
    await this.removeFromQueue(jobId);
  }

  private async forceStopJob(jobId: string): Promise<void> {
    // Set force stop flag
    await this.storage.put(`stop-flag:${jobId}`, 'force');
    
    // Remove from all queues
    await this.removeFromQueue(jobId);
    
    // Cancel any pending retries
    await this.cancelPendingRetries(jobId);
  }

  private async performCleanup(job: Job, config: CancellationConfig): Promise<boolean> {
    try {
      // Job-specific cleanup based on type
      switch (job.type) {
        case JobType.CSV_IMPORT:
        case JobType.EXCEL_IMPORT:
          await this.cleanupFileProcessing(job);
          break;
          
        case JobType.MYINVOIS_SUBMISSION:
        case JobType.BULK_SUBMISSION:
          await this.cleanupMyInvoisSubmission(job);
          break;
          
        case JobType.BACKUP_PROCESS:
          await this.cleanupBackupProcess(job);
          break;
          
        default:
          await this.performGenericCleanup(job);
      }
      
      return true;
    } catch (error) {
      console.error(`Cleanup failed for job ${job.id}:`, error);
      return false;
    }
  }

  private async cleanupFileProcessing(job: Job): Promise<void> {
    // Clean up temporary files
    // Cancel any file uploads in progress
    // Remove partial processed data
    console.log(`Cleaning up file processing for job ${job.id}`);
  }

  private async cleanupMyInvoisSubmission(job: Job): Promise<void> {
    // Cancel any pending API requests
    // Update invoice statuses
    // Log cancellation in audit trail
    console.log(`Cleaning up MyInvois submission for job ${job.id}`);
  }

  private async cleanupBackupProcess(job: Job): Promise<void> {
    // Stop backup transfers
    // Clean up partial backup files
    // Update backup status
    console.log(`Cleaning up backup process for job ${job.id}`);
  }

  private async performGenericCleanup(job: Job): Promise<void> {
    // Generic cleanup operations
    console.log(`Performing generic cleanup for job ${job.id}`);
  }

  private async preserveProgress(job: Job): Promise<any> {
    // Save current progress state
    const progressData = {
      jobId: job.id,
      progress: job.progress,
      processedItems: 0, // Would be extracted from job data
      timestamp: new Date()
    };
    
    await this.storage.put(`progress:${job.id}`, JSON.stringify(progressData));
    return progressData;
  }

  private async updateJobAfterCancellation(
    job: Job, 
    request: CancellationRequest, 
    result: CancellationResult
  ): Promise<void> {
    job.status = JobStatus.CANCELLED;
    job.completedAt = result.completedAt;
    job.updatedAt = new Date();
    
    // Add final cancellation log
    job.logs.push({
      timestamp: result.completedAt,
      level: 'info',
      message: `Job cancelled: ${result.message}`,
      data: {
        reason: request.reason,
        method: result.method,
        cleanupPerformed: result.cleanupPerformed,
        partialResults: !!result.partialResults
      }
    });
    
    await this.storage.put(`job:${job.id}`, JSON.stringify(job));
  }

  private getCancellationConfig(jobType: JobType): CancellationConfig {
    const defaultConfig = DEFAULT_CANCELLATION_CONFIGS[jobType];
    const customConfig = this.customConfigs[jobType] || {};
    
    return { ...defaultConfig, ...customConfig };
  }

  private async getJob(jobId: string): Promise<Job | null> {
    const jobData = await this.storage.get(`job:${jobId}`);
    return jobData ? JSON.parse(jobData as string) : null;
  }

  private async getOrganizationJobs(organizationId: string): Promise<Job[]> {
    // This would query jobs by organization ID
    // For now, return empty array
    return [];
  }

  private async getAllActiveJobs(): Promise<Job[]> {
    const jobs: Job[] = [];
    const jobKeys = await this.storage.list({ prefix: 'job:' });
    
    for (const [key] of jobKeys) {
      const jobData = await this.storage.get(key);
      if (jobData) {
        const job = JSON.parse(jobData as string) as Job;
        if (job.status === JobStatus.PENDING || job.status === JobStatus.PROCESSING) {
          jobs.push(job);
        }
      }
    }
    
    return jobs;
  }

  private async removeFromQueue(jobId: string): Promise<void> {
    // Remove job from processing queue
    const queueKeys = await this.storage.list({ prefix: 'queue:' });
    for (const [key] of queueKeys) {
      const storedJobId = await this.storage.get(key);
      if (storedJobId === jobId) {
        await this.storage.delete(key);
      }
    }
  }

  private async cancelPendingRetries(jobId: string): Promise<void> {
    // Cancel any scheduled retries
    const retryKeys = await this.storage.list({ prefix: 'retry-schedule:' });
    for (const [key] of retryKeys) {
      if (key.includes(jobId)) {
        await this.storage.delete(key);
      }
    }
  }

  private updateCancellationStats(
    jobType: JobType, 
    request: CancellationRequest, 
    result: CancellationResult
  ): void {
    const stats = this.cancellationStats.get(jobType) || this.getDefaultStats();
    
    stats.totalCancellations++;
    
    // Update by reason
    stats.byReason[request.reason] = (stats.byReason[request.reason] || 0) + 1;
    
    // Update by method
    stats.byMethod[result.method] = (stats.byMethod[result.method] || 0) + 1;
    
    // Update by job type
    stats.byJobType[jobType] = (stats.byJobType[jobType] || 0) + 1;
    
    // Update graceful success rate
    if (result.method === CancellationMethod.GRACEFUL) {
      const gracefulAttempts = stats.byMethod[CancellationMethod.GRACEFUL] || 1;
      const gracefulSuccess = result.success ? 1 : 0;
      stats.gracefulSuccessRate = (gracefulSuccess / gracefulAttempts) * 100;
    }
    
    this.cancellationStats.set(jobType, stats);
  }

  private async cleanupCancellationData(jobId: string): Promise<void> {
    await this.storage.delete(`cancellation:${jobId}`);
    await this.storage.delete(`cancel-flag:${jobId}`);
    await this.storage.delete(`stop-flag:${jobId}`);
  }

  private getDefaultStats(): CancellationStats {
    return {
      totalCancellations: 0,
      byReason: {} as Record<CancellationReason, number>,
      byMethod: {} as Record<CancellationMethod, number>,
      byJobType: {} as Record<JobType, number>,
      averageCancellationTime: 0,
      gracefulSuccessRate: 0
    };
  }
}