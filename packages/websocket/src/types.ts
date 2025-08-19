// WebSocket Types for Easy e-Invoice Real-time Progress Tracking
// Provides type definitions for real-time job progress and system updates

import { z } from 'zod';

// WebSocket connection status
export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// Message types for WebSocket communication
export enum MessageType {
  // Connection management
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PING = 'ping',
  PONG = 'pong',
  
  // Job progress tracking
  JOB_PROGRESS = 'job_progress',
  JOB_STATUS_CHANGE = 'job_status_change',
  JOB_COMPLETED = 'job_completed',
  JOB_FAILED = 'job_failed',
  JOB_CANCELLED = 'job_cancelled',
  
  // System notifications
  SYSTEM_NOTIFICATION = 'system_notification',
  COMPLIANCE_ALERT = 'compliance_alert',
  MYINVOIS_UPDATE = 'myinvois_update',
  
  // File processing updates
  FILE_UPLOAD_PROGRESS = 'file_upload_progress',
  FILE_PROCESSING_START = 'file_processing_start',
  FILE_PROCESSING_COMPLETE = 'file_processing_complete',
  
  // User-specific notifications
  USER_NOTIFICATION = 'user_notification',
  ORGANIZATION_UPDATE = 'organization_update',
  
  // Error handling
  ERROR = 'error',
  VALIDATION_ERROR = 'validation_error'
}

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

// Type inference
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
export type JobProgressMessage = z.infer<typeof JobProgressMessageSchema>;
export type JobStatusMessage = z.infer<typeof JobStatusMessageSchema>;
export type JobCompletedMessage = z.infer<typeof JobCompletedMessageSchema>;
export type SystemNotification = z.infer<typeof SystemNotificationSchema>;
export type ComplianceAlert = z.infer<typeof ComplianceAlertSchema>;
export type MyInvoisUpdate = z.infer<typeof MyInvoisUpdateSchema>;
export type FileProcessingMessage = z.infer<typeof FileProcessingMessageSchema>;
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;

// WebSocket connection interface
export interface WebSocketConnection {
  id: string;
  userId: string;
  organizationId: string;
  connectedAt: Date;
  lastPing: Date;
  subscriptions: Set<string>;
  socket: WebSocket;
}

// Subscription filters
export interface SubscriptionFilter {
  userId?: string;
  organizationId?: string;
  jobId?: string;
  jobType?: string;
  messageTypes?: MessageType[];
}

// WebSocket server interface
export interface WebSocketServer {
  // Connection management
  handleConnection(socket: WebSocket, request: Request): Promise<void>;
  closeConnection(connectionId: string): Promise<void>;
  getConnection(connectionId: string): WebSocketConnection | null;
  getConnections(filter?: SubscriptionFilter): WebSocketConnection[];
  
  // Message broadcasting
  broadcast(message: WebSocketMessage, filter?: SubscriptionFilter): Promise<void>;
  sendToUser(userId: string, message: WebSocketMessage): Promise<void>;
  sendToOrganization(organizationId: string, message: WebSocketMessage): Promise<void>;
  sendToConnection(connectionId: string, message: WebSocketMessage): Promise<void>;
  
  // Subscription management
  subscribe(connectionId: string, filter: SubscriptionFilter): Promise<void>;
  unsubscribe(connectionId: string, filter: SubscriptionFilter): Promise<void>;
  
  // Health monitoring
  pingAll(): Promise<void>;
  getStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    messagesSent: number;
    messagesReceived: number;
    uptime: number;
  }>;
}

// Progress tracking interface
export interface ProgressTracker {
  // Job progress tracking
  trackJobProgress(jobId: string, progress: any): Promise<void>;
  trackJobStatusChange(jobId: string, oldStatus: string, newStatus: string): Promise<void>;
  trackJobCompletion(jobId: string, result: any): Promise<void>;
  
  // File processing tracking
  trackFileUpload(fileKey: string, progress: any): Promise<void>;
  trackFileProcessing(fileKey: string, jobId: string): Promise<void>;
  
  // System notifications
  sendSystemNotification(notification: any): Promise<void>;
  sendComplianceAlert(alert: any): Promise<void>;
  sendMyInvoisUpdate(update: any): Promise<void>;
}

// Connection authentication
export interface ConnectionAuth {
  userId: string;
  organizationId: string;
  permissions: string[];
  token: string;
  expiresAt: Date;
}

// Rate limiting
export interface RateLimit {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

// WebSocket configuration
export interface WebSocketConfig {
  pingInterval: number;
  pongTimeout: number;
  maxConnections: number;
  maxMessageSize: number;
  rateLimit: RateLimit;
  enableCompression: boolean;
  enableHeartbeat: boolean;
}

// Default configuration
export const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = {
  pingInterval: 30000,     // 30 seconds
  pongTimeout: 10000,      // 10 seconds
  maxConnections: 1000,    // Max concurrent connections
  maxMessageSize: 65536,   // 64KB max message size
  rateLimit: {
    windowMs: 60000,       // 1 minute
    maxRequests: 100,      // 100 requests per minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  enableCompression: true,
  enableHeartbeat: true
};

// Error types
export class WebSocketError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly connectionId?: string
  ) {
    super(message);
    this.name = 'WebSocketError';
  }
}

export class ConnectionLimitError extends WebSocketError {
  constructor(maxConnections: number) {
    super(
      `Connection limit exceeded. Maximum ${maxConnections} connections allowed.`,
      'CONNECTION_LIMIT_EXCEEDED'
    );
  }
}

export class AuthenticationError extends WebSocketError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_FAILED');
  }
}

export class RateLimitError extends WebSocketError {
  constructor(connectionId: string) {
    super(
      'Rate limit exceeded. Too many requests.',
      'RATE_LIMIT_EXCEEDED',
      connectionId
    );
  }
}

export class MessageSizeError extends WebSocketError {
  constructor(size: number, maxSize: number) {
    super(
      `Message size ${size} exceeds maximum allowed size ${maxSize}`,
      'MESSAGE_SIZE_EXCEEDED'
    );
  }
}