import { ProgressTracker, WebSocketServer } from './types';
export declare class JobProgressTracker implements ProgressTracker {
    private webSocketServer;
    private storage;
    constructor(webSocketServer: WebSocketServer, storage: DurableObjectStorage);
    trackJobProgress(jobId: string, progress: {
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
    }): Promise<void>;
    trackJobStatusChange(jobId: string, oldStatus: string, newStatus: string, message?: string, error?: string): Promise<void>;
    trackJobCompletion(jobId: string, result: {
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
    }, startTime?: Date): Promise<void>;
    trackFileUpload(fileKey: string, progress: {
        uploaded: number;
        total: number;
        percentage: number;
    }, userId?: string, organizationId?: string): Promise<void>;
    trackFileProcessing(fileKey: string, jobId: string, status: 'start' | 'complete', result?: {
        recordsProcessed: number;
        successfulRecords: number;
        failedRecords: number;
        outputFiles: string[];
    }, error?: string): Promise<void>;
    sendSystemNotification(notification: {
        level: 'info' | 'warning' | 'error' | 'success';
        title: string;
        message: string;
        actionUrl?: string;
        actionLabel?: string;
        autoClose?: boolean;
        duration?: number;
        targetUsers?: string[];
        targetOrganizations?: string[];
    }): Promise<void>;
    sendComplianceAlert(alert: {
        alertType: 'score_low' | 'validation_failed' | 'regulation_change' | 'deadline_approaching';
        severity: 'low' | 'medium' | 'high' | 'critical';
        title: string;
        description: string;
        organizationId: string;
        invoiceIds?: string[];
        recommendedActions: string[];
        deadline?: Date;
        complianceScore?: number;
    }): Promise<void>;
    sendMyInvoisUpdate(update: {
        updateType: 'submission_complete' | 'status_sync' | 'api_error' | 'maintenance';
        organizationId: string;
        invoiceIds?: string[];
        status: string;
        message: string;
        referenceNumber?: string;
        submissionId?: string;
        nextAction?: string;
    }): Promise<void>;
    private getJobFromStorage;
    private extractFileNameFromKey;
    private sendJobFailureNotification;
    private sendJobCancellationNotification;
    private sendJobCompletionNotification;
    private formatDuration;
}
