// WebSocket Types for Easy e-Invoice Real-time Progress Tracking
// Provides type definitions for real-time job progress and system updates
import { z } from 'zod';
// WebSocket connection status
export var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus["CONNECTING"] = "connecting";
    ConnectionStatus["CONNECTED"] = "connected";
    ConnectionStatus["DISCONNECTED"] = "disconnected";
    ConnectionStatus["RECONNECTING"] = "reconnecting";
    ConnectionStatus["ERROR"] = "error";
})(ConnectionStatus || (ConnectionStatus = {}));
// Message types for WebSocket communication
export var MessageType;
(function (MessageType) {
    // Connection management
    MessageType["CONNECT"] = "connect";
    MessageType["DISCONNECT"] = "disconnect";
    MessageType["PING"] = "ping";
    MessageType["PONG"] = "pong";
    // Job progress tracking
    MessageType["JOB_PROGRESS"] = "job_progress";
    MessageType["JOB_STATUS_CHANGE"] = "job_status_change";
    MessageType["JOB_COMPLETED"] = "job_completed";
    MessageType["JOB_FAILED"] = "job_failed";
    MessageType["JOB_CANCELLED"] = "job_cancelled";
    // System notifications
    MessageType["SYSTEM_NOTIFICATION"] = "system_notification";
    MessageType["COMPLIANCE_ALERT"] = "compliance_alert";
    MessageType["MYINVOIS_UPDATE"] = "myinvois_update";
    // File processing updates
    MessageType["FILE_UPLOAD_PROGRESS"] = "file_upload_progress";
    MessageType["FILE_PROCESSING_START"] = "file_processing_start";
    MessageType["FILE_PROCESSING_COMPLETE"] = "file_processing_complete";
    // User-specific notifications
    MessageType["USER_NOTIFICATION"] = "user_notification";
    MessageType["ORGANIZATION_UPDATE"] = "organization_update";
    // Error handling
    MessageType["ERROR"] = "error";
    MessageType["VALIDATION_ERROR"] = "validation_error";
})(MessageType || (MessageType = {}));
// Base message schema
export const BaseMessageSchema = z.object({
    id: z.string().uuid(),
    type: z.nativeEnum(MessageType),
    timestamp: z.string().datetime(),
    userId: z.string().uuid().optional(),
    organizationId: z.string().uuid().optional()
});
// Job progress message
export const JobProgressMessageSchema = BaseMessageSchema.extend({
    type: z.literal(MessageType.JOB_PROGRESS),
    data: z.object({
        jobId: z.string().uuid(),
        jobType: z.string(),
        progress: z.object({
            percentage: z.number().min(0).max(100),
            currentStep: z.string(),
            totalSteps: z.number().optional(),
            completedSteps: z.number().optional(),
            message: z.string().optional(),
            estimatedTimeRemaining: z.number().optional()
        }),
        statistics: z.object({
            processed: z.number().min(0),
            successful: z.number().min(0),
            failed: z.number().min(0),
            skipped: z.number().min(0)
        }).optional()
    })
});
// Job status change message
export const JobStatusMessageSchema = BaseMessageSchema.extend({
    type: z.literal(MessageType.JOB_STATUS_CHANGE),
    data: z.object({
        jobId: z.string().uuid(),
        jobType: z.string(),
        oldStatus: z.string(),
        newStatus: z.string(),
        message: z.string().optional(),
        error: z.string().optional()
    })
});
// Job completion message
export const JobCompletedMessageSchema = BaseMessageSchema.extend({
    type: z.literal(MessageType.JOB_COMPLETED),
    data: z.object({
        jobId: z.string().uuid(),
        jobType: z.string(),
        result: z.object({
            success: z.boolean(),
            statistics: z.object({
                processed: z.number(),
                successful: z.number(),
                failed: z.number(),
                skipped: z.number()
            }),
            outputFiles: z.array(z.object({
                key: z.string(),
                url: z.string(),
                type: z.string(),
                size: z.number()
            })).optional(),
            message: z.string().optional()
        }),
        duration: z.number(),
        completedAt: z.string().datetime()
    })
});
// System notification message
export const SystemNotificationSchema = BaseMessageSchema.extend({
    type: z.literal(MessageType.SYSTEM_NOTIFICATION),
    data: z.object({
        level: z.enum(['info', 'warning', 'error', 'success']),
        title: z.string(),
        message: z.string(),
        actionUrl: z.string().optional(),
        actionLabel: z.string().optional(),
        autoClose: z.boolean().default(true),
        duration: z.number().optional()
    })
});
// Compliance alert message
export const ComplianceAlertSchema = BaseMessageSchema.extend({
    type: z.literal(MessageType.COMPLIANCE_ALERT),
    data: z.object({
        alertType: z.enum(['score_low', 'validation_failed', 'regulation_change', 'deadline_approaching']),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        title: z.string(),
        description: z.string(),
        invoiceIds: z.array(z.string().uuid()).optional(),
        recommendedActions: z.array(z.string()),
        deadline: z.string().datetime().optional(),
        complianceScore: z.number().min(0).max(100).optional()
    })
});
// MyInvois update message
export const MyInvoisUpdateSchema = BaseMessageSchema.extend({
    type: z.literal(MessageType.MYINVOIS_UPDATE),
    data: z.object({
        updateType: z.enum(['submission_complete', 'status_sync', 'api_error', 'maintenance']),
        invoiceIds: z.array(z.string().uuid()).optional(),
        status: z.string(),
        message: z.string(),
        referenceNumber: z.string().optional(),
        submissionId: z.string().optional(),
        nextAction: z.string().optional()
    })
});
// File processing message
export const FileProcessingMessageSchema = BaseMessageSchema.extend({
    type: z.union([
        z.literal(MessageType.FILE_UPLOAD_PROGRESS),
        z.literal(MessageType.FILE_PROCESSING_START),
        z.literal(MessageType.FILE_PROCESSING_COMPLETE)
    ]),
    data: z.object({
        fileKey: z.string(),
        fileName: z.string(),
        fileSize: z.number(),
        jobId: z.string().uuid().optional(),
        progress: z.object({
            uploaded: z.number(),
            total: z.number(),
            percentage: z.number().min(0).max(100)
        }).optional(),
        result: z.object({
            recordsProcessed: z.number(),
            successfulRecords: z.number(),
            failedRecords: z.number(),
            outputFiles: z.array(z.string())
        }).optional(),
        error: z.string().optional()
    })
});
// Error message
export const ErrorMessageSchema = BaseMessageSchema.extend({
    type: z.literal(MessageType.ERROR),
    data: z.object({
        errorCode: z.string(),
        message: z.string(),
        details: z.string().optional(),
        recoverable: z.boolean().default(false),
        retryable: z.boolean().default(false)
    })
});
// Union of all message types
export const WebSocketMessageSchema = z.union([
    JobProgressMessageSchema,
    JobStatusMessageSchema,
    JobCompletedMessageSchema,
    SystemNotificationSchema,
    ComplianceAlertSchema,
    MyInvoisUpdateSchema,
    FileProcessingMessageSchema,
    ErrorMessageSchema,
    BaseMessageSchema
]);
// Default configuration
export const DEFAULT_WEBSOCKET_CONFIG = {
    pingInterval: 30000, // 30 seconds
    pongTimeout: 10000, // 10 seconds
    maxConnections: 1000, // Max concurrent connections
    maxMessageSize: 65536, // 64KB max message size
    rateLimit: {
        windowMs: 60000, // 1 minute
        maxRequests: 100, // 100 requests per minute
        skipSuccessfulRequests: false,
        skipFailedRequests: false
    },
    enableCompression: true,
    enableHeartbeat: true
};
// Error types
export class WebSocketError extends Error {
    code;
    connectionId;
    constructor(message, code, connectionId) {
        super(message);
        this.code = code;
        this.connectionId = connectionId;
        this.name = 'WebSocketError';
    }
}
export class ConnectionLimitError extends WebSocketError {
    constructor(maxConnections) {
        super(`Connection limit exceeded. Maximum ${maxConnections} connections allowed.`, 'CONNECTION_LIMIT_EXCEEDED');
    }
}
export class AuthenticationError extends WebSocketError {
    constructor(message) {
        super(message, 'AUTHENTICATION_FAILED');
    }
}
export class RateLimitError extends WebSocketError {
    constructor(connectionId) {
        super('Rate limit exceeded. Too many requests.', 'RATE_LIMIT_EXCEEDED', connectionId);
    }
}
export class MessageSizeError extends WebSocketError {
    constructor(size, maxSize) {
        super(`Message size ${size} exceeds maximum allowed size ${maxSize}`, 'MESSAGE_SIZE_EXCEEDED');
    }
}
