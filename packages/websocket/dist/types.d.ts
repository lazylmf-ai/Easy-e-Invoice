import { z } from 'zod';
export declare enum ConnectionStatus {
    CONNECTING = "connecting",
    CONNECTED = "connected",
    DISCONNECTED = "disconnected",
    RECONNECTING = "reconnecting",
    ERROR = "error"
}
export declare enum MessageType {
    CONNECT = "connect",
    DISCONNECT = "disconnect",
    PING = "ping",
    PONG = "pong",
    JOB_PROGRESS = "job_progress",
    JOB_STATUS_CHANGE = "job_status_change",
    JOB_COMPLETED = "job_completed",
    JOB_FAILED = "job_failed",
    JOB_CANCELLED = "job_cancelled",
    SYSTEM_NOTIFICATION = "system_notification",
    COMPLIANCE_ALERT = "compliance_alert",
    MYINVOIS_UPDATE = "myinvois_update",
    FILE_UPLOAD_PROGRESS = "file_upload_progress",
    FILE_PROCESSING_START = "file_processing_start",
    FILE_PROCESSING_COMPLETE = "file_processing_complete",
    USER_NOTIFICATION = "user_notification",
    ORGANIZATION_UPDATE = "organization_update",
    ERROR = "error",
    VALIDATION_ERROR = "validation_error"
}
export declare const BaseMessageSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodNativeEnum<typeof MessageType>;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType;
    timestamp: string;
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType;
    timestamp: string;
    userId?: string | undefined;
    organizationId?: string | undefined;
}>;
export declare const JobProgressMessageSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.JOB_PROGRESS>;
    data: z.ZodObject<{
        jobId: z.ZodString;
        jobType: z.ZodString;
        progress: z.ZodObject<{
            percentage: z.ZodNumber;
            currentStep: z.ZodString;
            totalSteps: z.ZodOptional<z.ZodNumber>;
            completedSteps: z.ZodOptional<z.ZodNumber>;
            message: z.ZodOptional<z.ZodString>;
            estimatedTimeRemaining: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            percentage: number;
            currentStep: string;
            message?: string | undefined;
            totalSteps?: number | undefined;
            completedSteps?: number | undefined;
            estimatedTimeRemaining?: number | undefined;
        }, {
            percentage: number;
            currentStep: string;
            message?: string | undefined;
            totalSteps?: number | undefined;
            completedSteps?: number | undefined;
            estimatedTimeRemaining?: number | undefined;
        }>;
        statistics: z.ZodOptional<z.ZodObject<{
            processed: z.ZodNumber;
            successful: z.ZodNumber;
            failed: z.ZodNumber;
            skipped: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            processed: number;
            successful: number;
            failed: number;
            skipped: number;
        }, {
            processed: number;
            successful: number;
            failed: number;
            skipped: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        jobId: string;
        jobType: string;
        progress: {
            percentage: number;
            currentStep: string;
            message?: string | undefined;
            totalSteps?: number | undefined;
            completedSteps?: number | undefined;
            estimatedTimeRemaining?: number | undefined;
        };
        statistics?: {
            processed: number;
            successful: number;
            failed: number;
            skipped: number;
        } | undefined;
    }, {
        jobId: string;
        jobType: string;
        progress: {
            percentage: number;
            currentStep: string;
            message?: string | undefined;
            totalSteps?: number | undefined;
            completedSteps?: number | undefined;
            estimatedTimeRemaining?: number | undefined;
        };
        statistics?: {
            processed: number;
            successful: number;
            failed: number;
            skipped: number;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.JOB_PROGRESS;
    timestamp: string;
    data: {
        jobId: string;
        jobType: string;
        progress: {
            percentage: number;
            currentStep: string;
            message?: string | undefined;
            totalSteps?: number | undefined;
            completedSteps?: number | undefined;
            estimatedTimeRemaining?: number | undefined;
        };
        statistics?: {
            processed: number;
            successful: number;
            failed: number;
            skipped: number;
        } | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.JOB_PROGRESS;
    timestamp: string;
    data: {
        jobId: string;
        jobType: string;
        progress: {
            percentage: number;
            currentStep: string;
            message?: string | undefined;
            totalSteps?: number | undefined;
            completedSteps?: number | undefined;
            estimatedTimeRemaining?: number | undefined;
        };
        statistics?: {
            processed: number;
            successful: number;
            failed: number;
            skipped: number;
        } | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>;
export declare const JobStatusMessageSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.JOB_STATUS_CHANGE>;
    data: z.ZodObject<{
        jobId: z.ZodString;
        jobType: z.ZodString;
        oldStatus: z.ZodString;
        newStatus: z.ZodString;
        message: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        jobId: string;
        jobType: string;
        oldStatus: string;
        newStatus: string;
        error?: string | undefined;
        message?: string | undefined;
    }, {
        jobId: string;
        jobType: string;
        oldStatus: string;
        newStatus: string;
        error?: string | undefined;
        message?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.JOB_STATUS_CHANGE;
    timestamp: string;
    data: {
        jobId: string;
        jobType: string;
        oldStatus: string;
        newStatus: string;
        error?: string | undefined;
        message?: string | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.JOB_STATUS_CHANGE;
    timestamp: string;
    data: {
        jobId: string;
        jobType: string;
        oldStatus: string;
        newStatus: string;
        error?: string | undefined;
        message?: string | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>;
export declare const JobCompletedMessageSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.JOB_COMPLETED>;
    data: z.ZodObject<{
        jobId: z.ZodString;
        jobType: z.ZodString;
        result: z.ZodObject<{
            success: z.ZodBoolean;
            statistics: z.ZodObject<{
                processed: z.ZodNumber;
                successful: z.ZodNumber;
                failed: z.ZodNumber;
                skipped: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            }, {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            }>;
            outputFiles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                key: z.ZodString;
                url: z.ZodString;
                type: z.ZodString;
                size: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: string;
                key: string;
                url: string;
                size: number;
            }, {
                type: string;
                key: string;
                url: string;
                size: number;
            }>, "many">>;
            message: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            statistics: {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            };
            success: boolean;
            message?: string | undefined;
            outputFiles?: {
                type: string;
                key: string;
                url: string;
                size: number;
            }[] | undefined;
        }, {
            statistics: {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            };
            success: boolean;
            message?: string | undefined;
            outputFiles?: {
                type: string;
                key: string;
                url: string;
                size: number;
            }[] | undefined;
        }>;
        duration: z.ZodNumber;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        jobId: string;
        jobType: string;
        result: {
            statistics: {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            };
            success: boolean;
            message?: string | undefined;
            outputFiles?: {
                type: string;
                key: string;
                url: string;
                size: number;
            }[] | undefined;
        };
        duration: number;
        completedAt: string;
    }, {
        jobId: string;
        jobType: string;
        result: {
            statistics: {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            };
            success: boolean;
            message?: string | undefined;
            outputFiles?: {
                type: string;
                key: string;
                url: string;
                size: number;
            }[] | undefined;
        };
        duration: number;
        completedAt: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.JOB_COMPLETED;
    timestamp: string;
    data: {
        jobId: string;
        jobType: string;
        result: {
            statistics: {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            };
            success: boolean;
            message?: string | undefined;
            outputFiles?: {
                type: string;
                key: string;
                url: string;
                size: number;
            }[] | undefined;
        };
        duration: number;
        completedAt: string;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.JOB_COMPLETED;
    timestamp: string;
    data: {
        jobId: string;
        jobType: string;
        result: {
            statistics: {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            };
            success: boolean;
            message?: string | undefined;
            outputFiles?: {
                type: string;
                key: string;
                url: string;
                size: number;
            }[] | undefined;
        };
        duration: number;
        completedAt: string;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>;
export declare const SystemNotificationSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.SYSTEM_NOTIFICATION>;
    data: z.ZodObject<{
        level: z.ZodEnum<["info", "warning", "error", "success"]>;
        title: z.ZodString;
        message: z.ZodString;
        actionUrl: z.ZodOptional<z.ZodString>;
        actionLabel: z.ZodOptional<z.ZodString>;
        autoClose: z.ZodDefault<z.ZodBoolean>;
        duration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        level: "error" | "success" | "info" | "warning";
        title: string;
        autoClose: boolean;
        duration?: number | undefined;
        actionUrl?: string | undefined;
        actionLabel?: string | undefined;
    }, {
        message: string;
        level: "error" | "success" | "info" | "warning";
        title: string;
        duration?: number | undefined;
        actionUrl?: string | undefined;
        actionLabel?: string | undefined;
        autoClose?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.SYSTEM_NOTIFICATION;
    timestamp: string;
    data: {
        message: string;
        level: "error" | "success" | "info" | "warning";
        title: string;
        autoClose: boolean;
        duration?: number | undefined;
        actionUrl?: string | undefined;
        actionLabel?: string | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.SYSTEM_NOTIFICATION;
    timestamp: string;
    data: {
        message: string;
        level: "error" | "success" | "info" | "warning";
        title: string;
        duration?: number | undefined;
        actionUrl?: string | undefined;
        actionLabel?: string | undefined;
        autoClose?: boolean | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>;
export declare const ComplianceAlertSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.COMPLIANCE_ALERT>;
    data: z.ZodObject<{
        alertType: z.ZodEnum<["score_low", "validation_failed", "regulation_change", "deadline_approaching"]>;
        severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
        title: z.ZodString;
        description: z.ZodString;
        invoiceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        recommendedActions: z.ZodArray<z.ZodString, "many">;
        deadline: z.ZodOptional<z.ZodString>;
        complianceScore: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        alertType: "score_low" | "validation_failed" | "regulation_change" | "deadline_approaching";
        severity: "low" | "medium" | "high" | "critical";
        description: string;
        recommendedActions: string[];
        invoiceIds?: string[] | undefined;
        deadline?: string | undefined;
        complianceScore?: number | undefined;
    }, {
        title: string;
        alertType: "score_low" | "validation_failed" | "regulation_change" | "deadline_approaching";
        severity: "low" | "medium" | "high" | "critical";
        description: string;
        recommendedActions: string[];
        invoiceIds?: string[] | undefined;
        deadline?: string | undefined;
        complianceScore?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.COMPLIANCE_ALERT;
    timestamp: string;
    data: {
        title: string;
        alertType: "score_low" | "validation_failed" | "regulation_change" | "deadline_approaching";
        severity: "low" | "medium" | "high" | "critical";
        description: string;
        recommendedActions: string[];
        invoiceIds?: string[] | undefined;
        deadline?: string | undefined;
        complianceScore?: number | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.COMPLIANCE_ALERT;
    timestamp: string;
    data: {
        title: string;
        alertType: "score_low" | "validation_failed" | "regulation_change" | "deadline_approaching";
        severity: "low" | "medium" | "high" | "critical";
        description: string;
        recommendedActions: string[];
        invoiceIds?: string[] | undefined;
        deadline?: string | undefined;
        complianceScore?: number | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>;
export declare const MyInvoisUpdateSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.MYINVOIS_UPDATE>;
    data: z.ZodObject<{
        updateType: z.ZodEnum<["submission_complete", "status_sync", "api_error", "maintenance"]>;
        invoiceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        status: z.ZodString;
        message: z.ZodString;
        referenceNumber: z.ZodOptional<z.ZodString>;
        submissionId: z.ZodOptional<z.ZodString>;
        nextAction: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: string;
        message: string;
        updateType: "submission_complete" | "status_sync" | "api_error" | "maintenance";
        invoiceIds?: string[] | undefined;
        referenceNumber?: string | undefined;
        submissionId?: string | undefined;
        nextAction?: string | undefined;
    }, {
        status: string;
        message: string;
        updateType: "submission_complete" | "status_sync" | "api_error" | "maintenance";
        invoiceIds?: string[] | undefined;
        referenceNumber?: string | undefined;
        submissionId?: string | undefined;
        nextAction?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.MYINVOIS_UPDATE;
    timestamp: string;
    data: {
        status: string;
        message: string;
        updateType: "submission_complete" | "status_sync" | "api_error" | "maintenance";
        invoiceIds?: string[] | undefined;
        referenceNumber?: string | undefined;
        submissionId?: string | undefined;
        nextAction?: string | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.MYINVOIS_UPDATE;
    timestamp: string;
    data: {
        status: string;
        message: string;
        updateType: "submission_complete" | "status_sync" | "api_error" | "maintenance";
        invoiceIds?: string[] | undefined;
        referenceNumber?: string | undefined;
        submissionId?: string | undefined;
        nextAction?: string | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>;
export declare const FileProcessingMessageSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodUnion<[z.ZodLiteral<MessageType.FILE_UPLOAD_PROGRESS>, z.ZodLiteral<MessageType.FILE_PROCESSING_START>, z.ZodLiteral<MessageType.FILE_PROCESSING_COMPLETE>]>;
    data: z.ZodObject<{
        fileKey: z.ZodString;
        fileName: z.ZodString;
        fileSize: z.ZodNumber;
        jobId: z.ZodOptional<z.ZodString>;
        progress: z.ZodOptional<z.ZodObject<{
            uploaded: z.ZodNumber;
            total: z.ZodNumber;
            percentage: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            percentage: number;
            uploaded: number;
            total: number;
        }, {
            percentage: number;
            uploaded: number;
            total: number;
        }>>;
        result: z.ZodOptional<z.ZodObject<{
            recordsProcessed: z.ZodNumber;
            successfulRecords: z.ZodNumber;
            failedRecords: z.ZodNumber;
            outputFiles: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            outputFiles: string[];
            recordsProcessed: number;
            successfulRecords: number;
            failedRecords: number;
        }, {
            outputFiles: string[];
            recordsProcessed: number;
            successfulRecords: number;
            failedRecords: number;
        }>>;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        fileKey: string;
        fileName: string;
        fileSize: number;
        error?: string | undefined;
        jobId?: string | undefined;
        progress?: {
            percentage: number;
            uploaded: number;
            total: number;
        } | undefined;
        result?: {
            outputFiles: string[];
            recordsProcessed: number;
            successfulRecords: number;
            failedRecords: number;
        } | undefined;
    }, {
        fileKey: string;
        fileName: string;
        fileSize: number;
        error?: string | undefined;
        jobId?: string | undefined;
        progress?: {
            percentage: number;
            uploaded: number;
            total: number;
        } | undefined;
        result?: {
            outputFiles: string[];
            recordsProcessed: number;
            successfulRecords: number;
            failedRecords: number;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.FILE_UPLOAD_PROGRESS | MessageType.FILE_PROCESSING_START | MessageType.FILE_PROCESSING_COMPLETE;
    timestamp: string;
    data: {
        fileKey: string;
        fileName: string;
        fileSize: number;
        error?: string | undefined;
        jobId?: string | undefined;
        progress?: {
            percentage: number;
            uploaded: number;
            total: number;
        } | undefined;
        result?: {
            outputFiles: string[];
            recordsProcessed: number;
            successfulRecords: number;
            failedRecords: number;
        } | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.FILE_UPLOAD_PROGRESS | MessageType.FILE_PROCESSING_START | MessageType.FILE_PROCESSING_COMPLETE;
    timestamp: string;
    data: {
        fileKey: string;
        fileName: string;
        fileSize: number;
        error?: string | undefined;
        jobId?: string | undefined;
        progress?: {
            percentage: number;
            uploaded: number;
            total: number;
        } | undefined;
        result?: {
            outputFiles: string[];
            recordsProcessed: number;
            successfulRecords: number;
            failedRecords: number;
        } | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>;
export declare const ErrorMessageSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.ERROR>;
    data: z.ZodObject<{
        errorCode: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodString>;
        recoverable: z.ZodDefault<z.ZodBoolean>;
        retryable: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        errorCode: string;
        recoverable: boolean;
        retryable: boolean;
        details?: string | undefined;
    }, {
        message: string;
        errorCode: string;
        details?: string | undefined;
        recoverable?: boolean | undefined;
        retryable?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.ERROR;
    timestamp: string;
    data: {
        message: string;
        errorCode: string;
        recoverable: boolean;
        retryable: boolean;
        details?: string | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.ERROR;
    timestamp: string;
    data: {
        message: string;
        errorCode: string;
        details?: string | undefined;
        recoverable?: boolean | undefined;
        retryable?: boolean | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>;
export declare const WebSocketMessageSchema: z.ZodUnion<[z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.JOB_PROGRESS>;
    data: z.ZodObject<{
        jobId: z.ZodString;
        jobType: z.ZodString;
        progress: z.ZodObject<{
            percentage: z.ZodNumber;
            currentStep: z.ZodString;
            totalSteps: z.ZodOptional<z.ZodNumber>;
            completedSteps: z.ZodOptional<z.ZodNumber>;
            message: z.ZodOptional<z.ZodString>;
            estimatedTimeRemaining: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            percentage: number;
            currentStep: string;
            message?: string | undefined;
            totalSteps?: number | undefined;
            completedSteps?: number | undefined;
            estimatedTimeRemaining?: number | undefined;
        }, {
            percentage: number;
            currentStep: string;
            message?: string | undefined;
            totalSteps?: number | undefined;
            completedSteps?: number | undefined;
            estimatedTimeRemaining?: number | undefined;
        }>;
        statistics: z.ZodOptional<z.ZodObject<{
            processed: z.ZodNumber;
            successful: z.ZodNumber;
            failed: z.ZodNumber;
            skipped: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            processed: number;
            successful: number;
            failed: number;
            skipped: number;
        }, {
            processed: number;
            successful: number;
            failed: number;
            skipped: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        jobId: string;
        jobType: string;
        progress: {
            percentage: number;
            currentStep: string;
            message?: string | undefined;
            totalSteps?: number | undefined;
            completedSteps?: number | undefined;
            estimatedTimeRemaining?: number | undefined;
        };
        statistics?: {
            processed: number;
            successful: number;
            failed: number;
            skipped: number;
        } | undefined;
    }, {
        jobId: string;
        jobType: string;
        progress: {
            percentage: number;
            currentStep: string;
            message?: string | undefined;
            totalSteps?: number | undefined;
            completedSteps?: number | undefined;
            estimatedTimeRemaining?: number | undefined;
        };
        statistics?: {
            processed: number;
            successful: number;
            failed: number;
            skipped: number;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.JOB_PROGRESS;
    timestamp: string;
    data: {
        jobId: string;
        jobType: string;
        progress: {
            percentage: number;
            currentStep: string;
            message?: string | undefined;
            totalSteps?: number | undefined;
            completedSteps?: number | undefined;
            estimatedTimeRemaining?: number | undefined;
        };
        statistics?: {
            processed: number;
            successful: number;
            failed: number;
            skipped: number;
        } | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.JOB_PROGRESS;
    timestamp: string;
    data: {
        jobId: string;
        jobType: string;
        progress: {
            percentage: number;
            currentStep: string;
            message?: string | undefined;
            totalSteps?: number | undefined;
            completedSteps?: number | undefined;
            estimatedTimeRemaining?: number | undefined;
        };
        statistics?: {
            processed: number;
            successful: number;
            failed: number;
            skipped: number;
        } | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.JOB_STATUS_CHANGE>;
    data: z.ZodObject<{
        jobId: z.ZodString;
        jobType: z.ZodString;
        oldStatus: z.ZodString;
        newStatus: z.ZodString;
        message: z.ZodOptional<z.ZodString>;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        jobId: string;
        jobType: string;
        oldStatus: string;
        newStatus: string;
        error?: string | undefined;
        message?: string | undefined;
    }, {
        jobId: string;
        jobType: string;
        oldStatus: string;
        newStatus: string;
        error?: string | undefined;
        message?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.JOB_STATUS_CHANGE;
    timestamp: string;
    data: {
        jobId: string;
        jobType: string;
        oldStatus: string;
        newStatus: string;
        error?: string | undefined;
        message?: string | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.JOB_STATUS_CHANGE;
    timestamp: string;
    data: {
        jobId: string;
        jobType: string;
        oldStatus: string;
        newStatus: string;
        error?: string | undefined;
        message?: string | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.JOB_COMPLETED>;
    data: z.ZodObject<{
        jobId: z.ZodString;
        jobType: z.ZodString;
        result: z.ZodObject<{
            success: z.ZodBoolean;
            statistics: z.ZodObject<{
                processed: z.ZodNumber;
                successful: z.ZodNumber;
                failed: z.ZodNumber;
                skipped: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            }, {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            }>;
            outputFiles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                key: z.ZodString;
                url: z.ZodString;
                type: z.ZodString;
                size: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: string;
                key: string;
                url: string;
                size: number;
            }, {
                type: string;
                key: string;
                url: string;
                size: number;
            }>, "many">>;
            message: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            statistics: {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            };
            success: boolean;
            message?: string | undefined;
            outputFiles?: {
                type: string;
                key: string;
                url: string;
                size: number;
            }[] | undefined;
        }, {
            statistics: {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            };
            success: boolean;
            message?: string | undefined;
            outputFiles?: {
                type: string;
                key: string;
                url: string;
                size: number;
            }[] | undefined;
        }>;
        duration: z.ZodNumber;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        jobId: string;
        jobType: string;
        result: {
            statistics: {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            };
            success: boolean;
            message?: string | undefined;
            outputFiles?: {
                type: string;
                key: string;
                url: string;
                size: number;
            }[] | undefined;
        };
        duration: number;
        completedAt: string;
    }, {
        jobId: string;
        jobType: string;
        result: {
            statistics: {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            };
            success: boolean;
            message?: string | undefined;
            outputFiles?: {
                type: string;
                key: string;
                url: string;
                size: number;
            }[] | undefined;
        };
        duration: number;
        completedAt: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.JOB_COMPLETED;
    timestamp: string;
    data: {
        jobId: string;
        jobType: string;
        result: {
            statistics: {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            };
            success: boolean;
            message?: string | undefined;
            outputFiles?: {
                type: string;
                key: string;
                url: string;
                size: number;
            }[] | undefined;
        };
        duration: number;
        completedAt: string;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.JOB_COMPLETED;
    timestamp: string;
    data: {
        jobId: string;
        jobType: string;
        result: {
            statistics: {
                processed: number;
                successful: number;
                failed: number;
                skipped: number;
            };
            success: boolean;
            message?: string | undefined;
            outputFiles?: {
                type: string;
                key: string;
                url: string;
                size: number;
            }[] | undefined;
        };
        duration: number;
        completedAt: string;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.SYSTEM_NOTIFICATION>;
    data: z.ZodObject<{
        level: z.ZodEnum<["info", "warning", "error", "success"]>;
        title: z.ZodString;
        message: z.ZodString;
        actionUrl: z.ZodOptional<z.ZodString>;
        actionLabel: z.ZodOptional<z.ZodString>;
        autoClose: z.ZodDefault<z.ZodBoolean>;
        duration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        level: "error" | "success" | "info" | "warning";
        title: string;
        autoClose: boolean;
        duration?: number | undefined;
        actionUrl?: string | undefined;
        actionLabel?: string | undefined;
    }, {
        message: string;
        level: "error" | "success" | "info" | "warning";
        title: string;
        duration?: number | undefined;
        actionUrl?: string | undefined;
        actionLabel?: string | undefined;
        autoClose?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.SYSTEM_NOTIFICATION;
    timestamp: string;
    data: {
        message: string;
        level: "error" | "success" | "info" | "warning";
        title: string;
        autoClose: boolean;
        duration?: number | undefined;
        actionUrl?: string | undefined;
        actionLabel?: string | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.SYSTEM_NOTIFICATION;
    timestamp: string;
    data: {
        message: string;
        level: "error" | "success" | "info" | "warning";
        title: string;
        duration?: number | undefined;
        actionUrl?: string | undefined;
        actionLabel?: string | undefined;
        autoClose?: boolean | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.COMPLIANCE_ALERT>;
    data: z.ZodObject<{
        alertType: z.ZodEnum<["score_low", "validation_failed", "regulation_change", "deadline_approaching"]>;
        severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
        title: z.ZodString;
        description: z.ZodString;
        invoiceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        recommendedActions: z.ZodArray<z.ZodString, "many">;
        deadline: z.ZodOptional<z.ZodString>;
        complianceScore: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        alertType: "score_low" | "validation_failed" | "regulation_change" | "deadline_approaching";
        severity: "low" | "medium" | "high" | "critical";
        description: string;
        recommendedActions: string[];
        invoiceIds?: string[] | undefined;
        deadline?: string | undefined;
        complianceScore?: number | undefined;
    }, {
        title: string;
        alertType: "score_low" | "validation_failed" | "regulation_change" | "deadline_approaching";
        severity: "low" | "medium" | "high" | "critical";
        description: string;
        recommendedActions: string[];
        invoiceIds?: string[] | undefined;
        deadline?: string | undefined;
        complianceScore?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.COMPLIANCE_ALERT;
    timestamp: string;
    data: {
        title: string;
        alertType: "score_low" | "validation_failed" | "regulation_change" | "deadline_approaching";
        severity: "low" | "medium" | "high" | "critical";
        description: string;
        recommendedActions: string[];
        invoiceIds?: string[] | undefined;
        deadline?: string | undefined;
        complianceScore?: number | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.COMPLIANCE_ALERT;
    timestamp: string;
    data: {
        title: string;
        alertType: "score_low" | "validation_failed" | "regulation_change" | "deadline_approaching";
        severity: "low" | "medium" | "high" | "critical";
        description: string;
        recommendedActions: string[];
        invoiceIds?: string[] | undefined;
        deadline?: string | undefined;
        complianceScore?: number | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.MYINVOIS_UPDATE>;
    data: z.ZodObject<{
        updateType: z.ZodEnum<["submission_complete", "status_sync", "api_error", "maintenance"]>;
        invoiceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        status: z.ZodString;
        message: z.ZodString;
        referenceNumber: z.ZodOptional<z.ZodString>;
        submissionId: z.ZodOptional<z.ZodString>;
        nextAction: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: string;
        message: string;
        updateType: "submission_complete" | "status_sync" | "api_error" | "maintenance";
        invoiceIds?: string[] | undefined;
        referenceNumber?: string | undefined;
        submissionId?: string | undefined;
        nextAction?: string | undefined;
    }, {
        status: string;
        message: string;
        updateType: "submission_complete" | "status_sync" | "api_error" | "maintenance";
        invoiceIds?: string[] | undefined;
        referenceNumber?: string | undefined;
        submissionId?: string | undefined;
        nextAction?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.MYINVOIS_UPDATE;
    timestamp: string;
    data: {
        status: string;
        message: string;
        updateType: "submission_complete" | "status_sync" | "api_error" | "maintenance";
        invoiceIds?: string[] | undefined;
        referenceNumber?: string | undefined;
        submissionId?: string | undefined;
        nextAction?: string | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.MYINVOIS_UPDATE;
    timestamp: string;
    data: {
        status: string;
        message: string;
        updateType: "submission_complete" | "status_sync" | "api_error" | "maintenance";
        invoiceIds?: string[] | undefined;
        referenceNumber?: string | undefined;
        submissionId?: string | undefined;
        nextAction?: string | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodUnion<[z.ZodLiteral<MessageType.FILE_UPLOAD_PROGRESS>, z.ZodLiteral<MessageType.FILE_PROCESSING_START>, z.ZodLiteral<MessageType.FILE_PROCESSING_COMPLETE>]>;
    data: z.ZodObject<{
        fileKey: z.ZodString;
        fileName: z.ZodString;
        fileSize: z.ZodNumber;
        jobId: z.ZodOptional<z.ZodString>;
        progress: z.ZodOptional<z.ZodObject<{
            uploaded: z.ZodNumber;
            total: z.ZodNumber;
            percentage: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            percentage: number;
            uploaded: number;
            total: number;
        }, {
            percentage: number;
            uploaded: number;
            total: number;
        }>>;
        result: z.ZodOptional<z.ZodObject<{
            recordsProcessed: z.ZodNumber;
            successfulRecords: z.ZodNumber;
            failedRecords: z.ZodNumber;
            outputFiles: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            outputFiles: string[];
            recordsProcessed: number;
            successfulRecords: number;
            failedRecords: number;
        }, {
            outputFiles: string[];
            recordsProcessed: number;
            successfulRecords: number;
            failedRecords: number;
        }>>;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        fileKey: string;
        fileName: string;
        fileSize: number;
        error?: string | undefined;
        jobId?: string | undefined;
        progress?: {
            percentage: number;
            uploaded: number;
            total: number;
        } | undefined;
        result?: {
            outputFiles: string[];
            recordsProcessed: number;
            successfulRecords: number;
            failedRecords: number;
        } | undefined;
    }, {
        fileKey: string;
        fileName: string;
        fileSize: number;
        error?: string | undefined;
        jobId?: string | undefined;
        progress?: {
            percentage: number;
            uploaded: number;
            total: number;
        } | undefined;
        result?: {
            outputFiles: string[];
            recordsProcessed: number;
            successfulRecords: number;
            failedRecords: number;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.FILE_UPLOAD_PROGRESS | MessageType.FILE_PROCESSING_START | MessageType.FILE_PROCESSING_COMPLETE;
    timestamp: string;
    data: {
        fileKey: string;
        fileName: string;
        fileSize: number;
        error?: string | undefined;
        jobId?: string | undefined;
        progress?: {
            percentage: number;
            uploaded: number;
            total: number;
        } | undefined;
        result?: {
            outputFiles: string[];
            recordsProcessed: number;
            successfulRecords: number;
            failedRecords: number;
        } | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.FILE_UPLOAD_PROGRESS | MessageType.FILE_PROCESSING_START | MessageType.FILE_PROCESSING_COMPLETE;
    timestamp: string;
    data: {
        fileKey: string;
        fileName: string;
        fileSize: number;
        error?: string | undefined;
        jobId?: string | undefined;
        progress?: {
            percentage: number;
            uploaded: number;
            total: number;
        } | undefined;
        result?: {
            outputFiles: string[];
            recordsProcessed: number;
            successfulRecords: number;
            failedRecords: number;
        } | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<MessageType.ERROR>;
    data: z.ZodObject<{
        errorCode: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodString>;
        recoverable: z.ZodDefault<z.ZodBoolean>;
        retryable: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        errorCode: string;
        recoverable: boolean;
        retryable: boolean;
        details?: string | undefined;
    }, {
        message: string;
        errorCode: string;
        details?: string | undefined;
        recoverable?: boolean | undefined;
        retryable?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType.ERROR;
    timestamp: string;
    data: {
        message: string;
        errorCode: string;
        recoverable: boolean;
        retryable: boolean;
        details?: string | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType.ERROR;
    timestamp: string;
    data: {
        message: string;
        errorCode: string;
        details?: string | undefined;
        recoverable?: boolean | undefined;
        retryable?: boolean | undefined;
    };
    userId?: string | undefined;
    organizationId?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodNativeEnum<typeof MessageType>;
    timestamp: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: MessageType;
    timestamp: string;
    userId?: string | undefined;
    organizationId?: string | undefined;
}, {
    id: string;
    type: MessageType;
    timestamp: string;
    userId?: string | undefined;
    organizationId?: string | undefined;
}>]>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
export type JobProgressMessage = z.infer<typeof JobProgressMessageSchema>;
export type JobStatusMessage = z.infer<typeof JobStatusMessageSchema>;
export type JobCompletedMessage = z.infer<typeof JobCompletedMessageSchema>;
export type SystemNotification = z.infer<typeof SystemNotificationSchema>;
export type ComplianceAlert = z.infer<typeof ComplianceAlertSchema>;
export type MyInvoisUpdate = z.infer<typeof MyInvoisUpdateSchema>;
export type FileProcessingMessage = z.infer<typeof FileProcessingMessageSchema>;
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;
export interface WebSocketConnection {
    id: string;
    userId: string;
    organizationId: string;
    connectedAt: Date;
    lastPing: Date;
    subscriptions: Set<string>;
    socket: WebSocket;
}
export interface SubscriptionFilter {
    userId?: string;
    organizationId?: string;
    jobId?: string;
    jobType?: string;
    messageTypes?: MessageType[];
}
export interface WebSocketServer {
    handleConnection(socket: WebSocket, request: Request): Promise<void>;
    closeConnection(connectionId: string): Promise<void>;
    getConnection(connectionId: string): WebSocketConnection | null;
    getConnections(filter?: SubscriptionFilter): WebSocketConnection[];
    broadcast(message: WebSocketMessage, filter?: SubscriptionFilter): Promise<void>;
    sendToUser(userId: string, message: WebSocketMessage): Promise<void>;
    sendToOrganization(organizationId: string, message: WebSocketMessage): Promise<void>;
    sendToConnection(connectionId: string, message: WebSocketMessage): Promise<void>;
    subscribe(connectionId: string, filter: SubscriptionFilter): Promise<void>;
    unsubscribe(connectionId: string, filter: SubscriptionFilter): Promise<void>;
    pingAll(): Promise<void>;
    getStats(): Promise<{
        totalConnections: number;
        activeConnections: number;
        messagesSent: number;
        messagesReceived: number;
        uptime: number;
    }>;
}
export interface ProgressTracker {
    trackJobProgress(jobId: string, progress: any): Promise<void>;
    trackJobStatusChange(jobId: string, oldStatus: string, newStatus: string): Promise<void>;
    trackJobCompletion(jobId: string, result: any): Promise<void>;
    trackFileUpload(fileKey: string, progress: any): Promise<void>;
    trackFileProcessing(fileKey: string, jobId: string): Promise<void>;
    sendSystemNotification(notification: any): Promise<void>;
    sendComplianceAlert(alert: any): Promise<void>;
    sendMyInvoisUpdate(update: any): Promise<void>;
}
export interface ConnectionAuth {
    userId: string;
    organizationId: string;
    permissions: string[];
    token: string;
    expiresAt: Date;
}
export interface RateLimit {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
}
export interface WebSocketConfig {
    pingInterval: number;
    pongTimeout: number;
    maxConnections: number;
    maxMessageSize: number;
    rateLimit: RateLimit;
    enableCompression: boolean;
    enableHeartbeat: boolean;
}
export declare const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig;
export declare class WebSocketError extends Error {
    readonly code: string;
    readonly connectionId?: string | undefined;
    constructor(message: string, code: string, connectionId?: string | undefined);
}
export declare class ConnectionLimitError extends WebSocketError {
    constructor(maxConnections: number);
}
export declare class AuthenticationError extends WebSocketError {
    constructor(message: string);
}
export declare class RateLimitError extends WebSocketError {
    constructor(connectionId: string);
}
export declare class MessageSizeError extends WebSocketError {
    constructor(size: number, maxSize: number);
}
