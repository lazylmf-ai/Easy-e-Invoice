// Progress Tracker Implementation for Easy e-Invoice
// Real-time progress tracking with WebSocket integration

import { v4 as uuidv4 } from 'uuid';
import {
  ProgressTracker,
  WebSocketServer,
  MessageType,
  JobProgressMessage,
  JobStatusMessage,
  JobCompletedMessage,
  SystemNotification,
  ComplianceAlert,
  MyInvoisUpdate,
  FileProcessingMessage
} from './types';

export class JobProgressTracker implements ProgressTracker {
  constructor(
    private webSocketServer: WebSocketServer,
    private storage: DurableObjectStorage
  ) {}

  async trackJobProgress(
    jobId: string, 
    progress: {
      percentage: number;
      currentStep: string;
      totalSteps?: number;
      completedSteps?: number;
      message?: string;
      estimatedTimeRemaining?: number;
      statistics?: {
        processed: number;
        successful: number;
        failed: number;
        skipped: number;
      };
    }
  ): Promise<void> {
    // Get job details
    const job = await this.getJobFromStorage(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Create progress message
    const message: JobProgressMessage = {
      id: uuidv4(),
      type: MessageType.JOB_PROGRESS,
      timestamp: new Date().toISOString(),
      userId: job.userId,
      organizationId: job.organizationId,
      data: {
        jobId,
        jobType: job.type,
        progress: {
          percentage: progress.percentage,
          currentStep: progress.currentStep,
          totalSteps: progress.totalSteps,
          completedSteps: progress.completedSteps,
          message: progress.message,
          estimatedTimeRemaining: progress.estimatedTimeRemaining
        },
        statistics: progress.statistics
      }
    };

    // Store progress in storage for persistence
    await this.storage.put(`job:${jobId}:progress`, JSON.stringify({
      ...progress,
      timestamp: new Date().toISOString()
    }));

    // Broadcast to subscribers
    await this.webSocketServer.broadcast(message, {
      organizationId: job.organizationId,
      jobId
    });

    console.log(`Progress tracked for job ${jobId}: ${progress.percentage}% - ${progress.currentStep}`);
  }

  async trackJobStatusChange(
    jobId: string, 
    oldStatus: string, 
    newStatus: string,
    message?: string,
    error?: string
  ): Promise<void> {
    const job = await this.getJobFromStorage(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const statusMessage: JobStatusMessage = {
      id: uuidv4(),
      type: MessageType.JOB_STATUS_CHANGE,
      timestamp: new Date().toISOString(),
      userId: job.userId,
      organizationId: job.organizationId,
      data: {
        jobId,
        jobType: job.type,
        oldStatus,
        newStatus,
        message,
        error
      }
    };

    // Store status change
    await this.storage.put(`job:${jobId}:status`, JSON.stringify({
      oldStatus,
      newStatus,
      message,
      error,
      timestamp: new Date().toISOString()
    }));

    // Broadcast status change
    await this.webSocketServer.broadcast(statusMessage, {
      organizationId: job.organizationId,
      jobId
    });

    // Send specific status notifications
    if (newStatus === 'failed') {
      await this.sendJobFailureNotification(job, error);
    } else if (newStatus === 'cancelled') {
      await this.sendJobCancellationNotification(job);
    }

    console.log(`Status change tracked for job ${jobId}: ${oldStatus} -> ${newStatus}`);
  }

  async trackJobCompletion(
    jobId: string, 
    result: {
      success: boolean;
      statistics: {
        processed: number;
        successful: number;
        failed: number;
        skipped: number;
      };
      outputFiles?: Array<{
        key: string;
        url: string;
        type: string;
        size: number;
      }>;
      message?: string;
    },
    startTime?: Date
  ): Promise<void> {
    const job = await this.getJobFromStorage(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const completionTime = new Date();
    const duration = startTime ? completionTime.getTime() - startTime.getTime() : 0;

    const completedMessage: JobCompletedMessage = {
      id: uuidv4(),
      type: MessageType.JOB_COMPLETED,
      timestamp: completionTime.toISOString(),
      userId: job.userId,
      organizationId: job.organizationId,
      data: {
        jobId,
        jobType: job.type,
        result,
        duration,
        completedAt: completionTime.toISOString()
      }
    };

    // Store completion result
    await this.storage.put(`job:${jobId}:result`, JSON.stringify({
      ...result,
      duration,
      completedAt: completionTime.toISOString()
    }));

    // Broadcast completion
    await this.webSocketServer.broadcast(completedMessage, {
      organizationId: job.organizationId,
      jobId
    });

    // Send completion notification
    await this.sendJobCompletionNotification(job, result, duration);

    console.log(`Completion tracked for job ${jobId}: ${result.success ? 'Success' : 'Failed'}`);
  }

  async trackFileUpload(
    fileKey: string, 
    progress: {
      uploaded: number;
      total: number;
      percentage: number;
    },
    userId?: string,
    organizationId?: string
  ): Promise<void> {
    const message: FileProcessingMessage = {
      id: uuidv4(),
      type: MessageType.FILE_UPLOAD_PROGRESS,
      timestamp: new Date().toISOString(),
      userId,
      organizationId,
      data: {
        fileKey,
        fileName: this.extractFileNameFromKey(fileKey),
        fileSize: progress.total,
        progress
      }
    };

    // Broadcast to user/organization
    if (organizationId) {
      await this.webSocketServer.sendToOrganization(organizationId, message);
    } else if (userId) {
      await this.webSocketServer.sendToUser(userId, message);
    }
  }

  async trackFileProcessing(
    fileKey: string, 
    jobId: string,
    status: 'start' | 'complete',
    result?: {
      recordsProcessed: number;
      successfulRecords: number;
      failedRecords: number;
      outputFiles: string[];
    },
    error?: string
  ): Promise<void> {
    const job = await this.getJobFromStorage(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const messageType = status === 'start' 
      ? MessageType.FILE_PROCESSING_START 
      : MessageType.FILE_PROCESSING_COMPLETE;

    const message: FileProcessingMessage = {
      id: uuidv4(),
      type: messageType,
      timestamp: new Date().toISOString(),
      userId: job.userId,
      organizationId: job.organizationId,
      data: {
        fileKey,
        fileName: this.extractFileNameFromKey(fileKey),
        fileSize: 0, // Would be retrieved from storage metadata
        jobId,
        result,
        error
      }
    };

    await this.webSocketServer.broadcast(message, {
      organizationId: job.organizationId,
      jobId
    });
  }

  async sendSystemNotification(notification: {
    level: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
    autoClose?: boolean;
    duration?: number;
    targetUsers?: string[];
    targetOrganizations?: string[];
  }): Promise<void> {
    const systemNotification: SystemNotification = {
      id: uuidv4(),
      type: MessageType.SYSTEM_NOTIFICATION,
      timestamp: new Date().toISOString(),
      data: {
        level: notification.level,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel,
        autoClose: notification.autoClose ?? true,
        duration: notification.duration
      }
    };

    // Broadcast to specific targets or all connections
    if (notification.targetUsers) {
      for (const userId of notification.targetUsers) {
        await this.webSocketServer.sendToUser(userId, systemNotification);
      }
    } else if (notification.targetOrganizations) {
      for (const orgId of notification.targetOrganizations) {
        await this.webSocketServer.sendToOrganization(orgId, systemNotification);
      }
    } else {
      // Broadcast to all connections
      await this.webSocketServer.broadcast(systemNotification);
    }

    console.log(`System notification sent: ${notification.title}`);
  }

  async sendComplianceAlert(alert: {
    alertType: 'score_low' | 'validation_failed' | 'regulation_change' | 'deadline_approaching';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    organizationId: string;
    invoiceIds?: string[];
    recommendedActions: string[];
    deadline?: Date;
    complianceScore?: number;
  }): Promise<void> {
    const complianceAlert: ComplianceAlert = {
      id: uuidv4(),
      type: MessageType.COMPLIANCE_ALERT,
      timestamp: new Date().toISOString(),
      organizationId: alert.organizationId,
      data: {
        alertType: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        invoiceIds: alert.invoiceIds,
        recommendedActions: alert.recommendedActions,
        deadline: alert.deadline?.toISOString(),
        complianceScore: alert.complianceScore
      }
    };

    // Send to organization
    await this.webSocketServer.sendToOrganization(alert.organizationId, complianceAlert);

    // Store alert for audit purposes
    await this.storage.put(`compliance-alert:${complianceAlert.id}`, JSON.stringify(alert));

    console.log(`Compliance alert sent to organization ${alert.organizationId}: ${alert.title}`);
  }

  async sendMyInvoisUpdate(update: {
    updateType: 'submission_complete' | 'status_sync' | 'api_error' | 'maintenance';
    organizationId: string;
    invoiceIds?: string[];
    status: string;
    message: string;
    referenceNumber?: string;
    submissionId?: string;
    nextAction?: string;
  }): Promise<void> {
    const myInvoisUpdate: MyInvoisUpdate = {
      id: uuidv4(),
      type: MessageType.MYINVOIS_UPDATE,
      timestamp: new Date().toISOString(),
      organizationId: update.organizationId,
      data: {
        updateType: update.updateType,
        invoiceIds: update.invoiceIds,
        status: update.status,
        message: update.message,
        referenceNumber: update.referenceNumber,
        submissionId: update.submissionId,
        nextAction: update.nextAction
      }
    };

    await this.webSocketServer.sendToOrganization(update.organizationId, myInvoisUpdate);

    console.log(`MyInvois update sent to organization ${update.organizationId}: ${update.message}`);
  }

  // Private helper methods
  private async getJobFromStorage(jobId: string): Promise<any | null> {
    const jobData = await this.storage.get(`job:${jobId}`);
    return jobData ? JSON.parse(jobData as string) : null;
  }

  private extractFileNameFromKey(fileKey: string): string {
    const parts = fileKey.split('/');
    return parts[parts.length - 1] || fileKey;
  }

  private async sendJobFailureNotification(job: any, error?: string): Promise<void> {
    await this.sendSystemNotification({
      level: 'error',
      title: 'Job Failed',
      message: `Job ${job.type} has failed. ${error || 'Please check the job details for more information.'}`,
      actionUrl: `/jobs/${job.id}`,
      actionLabel: 'View Details',
      targetUsers: [job.userId]
    });
  }

  private async sendJobCancellationNotification(job: any): Promise<void> {
    await this.sendSystemNotification({
      level: 'info',
      title: 'Job Cancelled',
      message: `Job ${job.type} has been cancelled.`,
      actionUrl: `/jobs/${job.id}`,
      actionLabel: 'View Details',
      targetUsers: [job.userId]
    });
  }

  private async sendJobCompletionNotification(
    job: any, 
    result: any, 
    duration: number
  ): Promise<void> {
    const durationText = this.formatDuration(duration);
    
    await this.sendSystemNotification({
      level: result.success ? 'success' : 'warning',
      title: result.success ? 'Job Completed' : 'Job Completed with Issues',
      message: result.success 
        ? `Job ${job.type} completed successfully in ${durationText}. Processed ${result.statistics.processed} items.`
        : `Job ${job.type} completed in ${durationText} with ${result.statistics.failed} failures out of ${result.statistics.processed} items.`,
      actionUrl: `/jobs/${job.id}`,
      actionLabel: 'View Results',
      targetUsers: [job.userId]
    });
  }

  private formatDuration(milliseconds: number): string {
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
  }
}