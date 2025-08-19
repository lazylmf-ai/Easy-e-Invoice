// Job Queue Implementation for Easy e-Invoice
// Cloudflare Workers-compatible job queue with Durable Objects for persistence

import { v4 as uuidv4 } from 'uuid';
import {
  Job,
  JobQueue,
  JobType,
  JobStatus,
  JobPayload,
  JobConfig,
  JobResult,
  JobProgress,
  QueueStats,
  WorkerConfig,
  JobSchema,
  JobError,
  JobTimeoutError,
  JobPriority
} from './types';

// Event emitter for job queue events
export class JobEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }
}

// Cloudflare Workers compatible job queue implementation
export class CloudflareJobQueue implements JobQueue {
  private events = new JobEventEmitter();
  private isProcessing = false;
  private workerConfig: WorkerConfig | null = null;

  constructor(
    private storage: DurableObjectStorage,
    private environment: {
      DATABASE_URL: string;
      RESEND_API_KEY: string;
      QUEUE_NAMESPACE: KVNamespace;
    }
  ) {}

  // Add job to queue
  async addJob<T extends JobPayload>(
    type: JobType,
    payload: T,
    config: Partial<JobConfig> = {}
  ): Promise<Job> {
    const jobId = uuidv4();
    const now = new Date();
    
    const job: Job = {
      id: jobId,
      type,
      status: JobStatus.PENDING,
      payload,
      config: {
        priority: JobPriority.NORMAL,
        maxRetries: 3,
        retryDelay: 30000,
        timeout: 300000,
        ...config
      },
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
      logs: []
    };

    // Validate job schema
    const validation = JobSchema.safeParse(job);
    if (!validation.success) {
      throw new Error(`Invalid job data: ${validation.error.message}`);
    }

    // Store job in Durable Object storage
    await this.storage.put(`job:${jobId}`, JSON.stringify(job));
    
    // Add to priority queue
    await this.addToQueue(job);
    
    // Log job creation
    await this.addJobLog(jobId, 'info', 'Job created', { type, payload });
    
    this.events.emit('job:created', { job });
    
    return job;
  }

  // Get job by ID
  async getJob(jobId: string): Promise<Job | null> {
    const jobData = await this.storage.get(`job:${jobId}`);
    if (!jobData) {
      return null;
    }
    
    return JSON.parse(jobData as string) as Job;
  }

  // Update job
  async updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date()
    };

    await this.storage.put(`job:${jobId}`, JSON.stringify(updatedJob));
    
    // Update queue position if priority changed
    if (updates.config?.priority && updates.config.priority !== job.config.priority) {
      await this.updateQueuePosition(updatedJob);
    }
  }

  // Cancel job
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === JobStatus.PROCESSING) {
      // Mark for cancellation - worker will handle it
      await this.updateJob(jobId, { 
        status: JobStatus.CANCELLED,
        completedAt: new Date()
      });
    } else if (job.status === JobStatus.PENDING) {
      // Remove from queue
      await this.removeFromQueue(jobId);
      await this.updateJob(jobId, { 
        status: JobStatus.CANCELLED,
        completedAt: new Date()
      });
    }

    await this.addJobLog(jobId, 'info', 'Job cancelled');
    this.events.emit('job:cancelled', { job });
  }

  // Retry job
  async retryJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== JobStatus.FAILED) {
      throw new Error(`Job ${jobId} is not in failed state`);
    }

    if (job.retryCount >= job.config.maxRetries) {
      throw new Error(`Job ${jobId} has exceeded maximum retries`);
    }

    // Reset job status and add back to queue
    await this.updateJob(jobId, {
      status: JobStatus.PENDING,
      error: undefined,
      startedAt: undefined,
      completedAt: undefined
    });

    await this.addToQueue(job);
    await this.addJobLog(jobId, 'info', 'Job queued for retry', { retryCount: job.retryCount + 1 });
    
    this.events.emit('job:retry', { job, retryCount: job.retryCount + 1 });
  }

  // Get jobs with filtering and pagination
  async getJobs(
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
  ): Promise<{ jobs: Job[]; total: number }> {
    const allJobs = await this.getAllJobs();
    
    let filteredJobs = allJobs;

    if (filters) {
      filteredJobs = allJobs.filter(job => {
        if (filters.status && !filters.status.includes(job.status)) {
          return false;
        }
        if (filters.type && !filters.type.includes(job.type)) {
          return false;
        }
        if (filters.organizationId && job.payload.organizationId !== filters.organizationId) {
          return false;
        }
        if (filters.userId && job.payload.userId !== filters.userId) {
          return false;
        }
        return true;
      });
    }

    const total = filteredJobs.length;

    if (pagination) {
      const start = pagination.offset;
      const end = start + pagination.limit;
      filteredJobs = filteredJobs.slice(start, end);
    }

    return { jobs: filteredJobs, total };
  }

  // Get queue statistics
  async getQueueStats(): Promise<QueueStats> {
    const allJobs = await this.getAllJobs();
    
    const stats = allJobs.reduce((acc, job) => {
      acc[job.status]++;
      acc.totalJobs++;
      
      if (job.completedAt && job.startedAt) {
        const processingTime = job.completedAt.getTime() - job.startedAt.getTime();
        acc.totalProcessingTime += processingTime;
        acc.completedJobsCount++;
      }
      
      return acc;
    }, {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      totalJobs: 0,
      totalProcessingTime: 0,
      completedJobsCount: 0
    });

    const averageProcessingTime = stats.completedJobsCount > 0 
      ? stats.totalProcessingTime / stats.completedJobsCount 
      : 0;

    // Determine queue health
    let queueHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const failureRate = stats.totalJobs > 0 ? stats.failed / stats.totalJobs : 0;
    
    if (failureRate > 0.1) {
      queueHealth = 'critical';
    } else if (failureRate > 0.05 || stats.pending > 100) {
      queueHealth = 'degraded';
    }

    return {
      pending: stats.pending,
      processing: stats.processing,
      completed: stats.completed,
      failed: stats.failed,
      cancelled: stats.cancelled,
      totalJobs: stats.totalJobs,
      averageProcessingTime,
      queueHealth
    };
  }

  // Clear completed jobs
  async clearCompletedJobs(olderThan?: Date): Promise<number> {
    const allJobs = await this.getAllJobs();
    const cutoffDate = olderThan || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    let deletedCount = 0;
    
    for (const job of allJobs) {
      if (
        (job.status === JobStatus.COMPLETED || job.status === JobStatus.CANCELLED) &&
        job.completedAt &&
        job.completedAt < cutoffDate
      ) {
        await this.storage.delete(`job:${job.id}`);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // Process jobs (worker function)
  async processJobs(workerConfig: WorkerConfig): Promise<void> {
    this.workerConfig = workerConfig;
    this.isProcessing = true;

    const processNextJob = async (): Promise<void> => {
      if (!this.isProcessing) return;

      try {
        const job = await this.getNextJob();
        if (job) {
          await this.processJob(job);
        }
      } catch (error) {
        console.error('Error processing job:', error);
      }

      // Schedule next iteration
      if (this.isProcessing) {
        setTimeout(processNextJob, workerConfig.pollInterval);
      }
    };

    // Start processing
    processNextJob();
  }

  // Stop processing
  async stopProcessing(): Promise<void> {
    this.isProcessing = false;
  }

  // Private helper methods
  private async addToQueue(job: Job): Promise<void> {
    const queueKey = `queue:${job.config.priority}:${job.createdAt.getTime()}:${job.id}`;
    await this.storage.put(queueKey, job.id);
  }

  private async removeFromQueue(jobId: string): Promise<void> {
    const keys = await this.storage.list({ prefix: 'queue:' });
    for (const [key] of keys) {
      const storedJobId = await this.storage.get(key);
      if (storedJobId === jobId) {
        await this.storage.delete(key);
        break;
      }
    }
  }

  private async updateQueuePosition(job: Job): Promise<void> {
    await this.removeFromQueue(job.id);
    await this.addToQueue(job);
  }

  private async getNextJob(): Promise<Job | null> {
    const queueKeys = await this.storage.list({ prefix: 'queue:' });
    const sortedKeys = Array.from(queueKeys.keys()).sort().reverse(); // Higher priority first

    for (const key of sortedKeys) {
      const jobId = await this.storage.get(key);
      if (typeof jobId === 'string') {
        const job = await this.getJob(jobId);
        if (job && job.status === JobStatus.PENDING) {
          await this.storage.delete(key); // Remove from queue
          return job;
        }
      }
    }

    return null;
  }

  private async processJob(job: Job): Promise<void> {
    try {
      // Mark job as processing
      await this.updateJob(job.id, {
        status: JobStatus.PROCESSING,
        startedAt: new Date(),
        workerInstance: `worker-${Date.now()}`
      });

      await this.addJobLog(job.id, 'info', 'Job processing started');
      this.events.emit('job:started', { job });

      // Set timeout
      const timeoutId = setTimeout(async () => {
        throw new JobTimeoutError(job.id, job.type, job.config.timeout);
      }, job.config.timeout);

      try {
        // Process the job based on its type
        const result = await this.executeJobProcessor(job);
        
        clearTimeout(timeoutId);
        
        // Mark job as completed
        await this.updateJob(job.id, {
          status: JobStatus.COMPLETED,
          result,
          completedAt: new Date()
        });

        await this.addJobLog(job.id, 'info', 'Job completed successfully', { result });
        this.events.emit('job:completed', { job, result });

      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRetryable = !(error instanceof JobTimeoutError) && job.retryCount < job.config.maxRetries;

      if (isRetryable) {
        // Schedule retry
        await this.updateJob(job.id, {
          status: JobStatus.RETRYING,
          retryCount: job.retryCount + 1,
          error: errorMessage
        });

        await this.addJobLog(job.id, 'warn', 'Job failed, scheduling retry', { 
          error: errorMessage, 
          retryCount: job.retryCount + 1 
        });

        // Add back to queue with delay
        setTimeout(async () => {
          await this.addToQueue(job);
        }, job.config.retryDelay);

      } else {
        // Mark as failed
        await this.updateJob(job.id, {
          status: JobStatus.FAILED,
          error: errorMessage,
          completedAt: new Date()
        });

        await this.addJobLog(job.id, 'error', 'Job failed permanently', { error: errorMessage });
        this.events.emit('job:failed', { job, error: errorMessage });
      }
    }
  }

  private async executeJobProcessor(job: Job): Promise<JobResult> {
    // This would be implemented with specific processors for each job type
    // For now, return a mock result
    
    // Simulate progress updates
    await this.updateJobProgress(job.id, {
      percentage: 25,
      currentStep: 'Initializing',
      message: `Processing ${job.type} job`
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    await this.updateJobProgress(job.id, {
      percentage: 75,
      currentStep: 'Processing data',
      message: 'Validating Malaysian compliance rules'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    await this.updateJobProgress(job.id, {
      percentage: 100,
      currentStep: 'Completed',
      message: 'Job completed successfully'
    });

    return {
      success: true,
      data: {
        processedItems: 100,
        processingTime: 2000
      },
      statistics: {
        processed: 100,
        successful: 95,
        failed: 5,
        skipped: 0
      }
    };
  }

  private async updateJobProgress(jobId: string, progress: JobProgress): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      await this.updateJob(jobId, { progress });
      this.events.emit('job:progress', { job, progress });
    }
  }

  private async addJobLog(
    jobId: string, 
    level: 'info' | 'warn' | 'error' | 'debug', 
    message: string, 
    data?: Record<string, unknown>
  ): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      const logEntry = {
        timestamp: new Date(),
        level,
        message,
        data
      };
      
      job.logs.push(logEntry);
      await this.updateJob(jobId, { logs: job.logs });
    }
  }

  private async getAllJobs(): Promise<Job[]> {
    const jobKeys = await this.storage.list({ prefix: 'job:' });
    const jobs: Job[] = [];
    
    for (const [key] of jobKeys) {
      const jobData = await this.storage.get(key);
      if (jobData) {
        const job = JSON.parse(jobData as string) as Job;
        jobs.push(job);
      }
    }
    
    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Event subscription methods
  on(event: string, listener: Function): void {
    this.events.on(event, listener);
  }

  off(event: string, listener: Function): void {
    this.events.off(event, listener);
  }
}