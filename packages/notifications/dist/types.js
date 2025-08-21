// Notification Types for Easy e-Invoice
// Email and notification service with Malaysian business context
import { z } from 'zod';
// Notification types
export var NotificationType;
(function (NotificationType) {
    // Job notifications
    NotificationType["JOB_COMPLETED"] = "job_completed";
    NotificationType["JOB_FAILED"] = "job_failed";
    NotificationType["JOB_CANCELLED"] = "job_cancelled";
    NotificationType["JOB_RETRY_EXHAUSTED"] = "job_retry_exhausted";
    // File processing notifications
    NotificationType["CSV_IMPORT_COMPLETE"] = "csv_import_complete";
    NotificationType["EXPORT_READY"] = "export_ready";
    NotificationType["FILE_PROCESSING_FAILED"] = "file_processing_failed";
    // MyInvois notifications
    NotificationType["MYINVOIS_SUBMISSION_SUCCESS"] = "myinvois_submission_success";
    NotificationType["MYINVOIS_SUBMISSION_FAILED"] = "myinvois_submission_failed";
    NotificationType["MYINVOIS_STATUS_UPDATE"] = "myinvois_status_update";
    // Compliance notifications
    NotificationType["COMPLIANCE_SCORE_LOW"] = "compliance_score_low";
    NotificationType["VALIDATION_FAILED"] = "validation_failed";
    NotificationType["REGULATION_UPDATE"] = "regulation_update";
    NotificationType["DEADLINE_REMINDER"] = "deadline_reminder";
    // System notifications
    NotificationType["ACCOUNT_WELCOME"] = "account_welcome";
    NotificationType["ORGANIZATION_SETUP"] = "organization_setup";
    NotificationType["SUBSCRIPTION_EXPIRING"] = "subscription_expiring";
    NotificationType["MAINTENANCE_SCHEDULED"] = "maintenance_scheduled";
    NotificationType["SECURITY_ALERT"] = "security_alert";
    // Weekly/Monthly reports
    NotificationType["WEEKLY_SUMMARY"] = "weekly_summary";
    NotificationType["MONTHLY_REPORT"] = "monthly_report";
    NotificationType["COMPLIANCE_REPORT"] = "compliance_report";
})(NotificationType || (NotificationType = {}));
// Notification priority levels
export var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "low";
    NotificationPriority["MEDIUM"] = "medium";
    NotificationPriority["HIGH"] = "high";
    NotificationPriority["CRITICAL"] = "critical";
})(NotificationPriority || (NotificationPriority = {}));
// Supported languages for Malaysian context
export var Language;
(function (Language) {
    Language["ENGLISH"] = "en";
    Language["MALAY"] = "ms";
    Language["CHINESE"] = "zh";
    Language["TAMIL"] = "ta";
})(Language || (Language = {}));
// Email template schema
export const EmailTemplateSchema = z.object({
    templateId: z.string(),
    language: z.nativeEnum(Language).default(Language.ENGLISH),
    subject: z.string(),
    htmlContent: z.string(),
    textContent: z.string().optional(),
    variables: z.record(z.string()).optional()
});
// Notification recipient schema
export const NotificationRecipientSchema = z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    language: z.nativeEnum(Language).default(Language.ENGLISH),
    timezone: z.string().default('Asia/Kuala_Lumpur'),
    preferences: z.object({
        emailNotifications: z.boolean().default(true),
        smsNotifications: z.boolean().default(false),
        pushNotifications: z.boolean().default(true),
        weeklyReports: z.boolean().default(true),
        complianceAlerts: z.boolean().default(true)
    }).optional()
});
// Notification payload schema
export const NotificationPayloadSchema = z.object({
    id: z.string().uuid(),
    type: z.nativeEnum(NotificationType),
    priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.MEDIUM),
    recipient: NotificationRecipientSchema,
    organizationId: z.string().uuid(),
    // Content
    title: z.string(),
    message: z.string(),
    data: z.record(z.unknown()).optional(),
    // Delivery options
    channels: z.array(z.enum(['email', 'sms', 'push', 'in_app'])).default(['email']),
    deliveryTime: z.date().optional(), // For scheduled notifications
    expiresAt: z.date().optional(),
    // Template options
    template: EmailTemplateSchema.optional(),
    attachments: z.array(z.object({
        filename: z.string(),
        content: z.string(),
        contentType: z.string(),
        disposition: z.enum(['attachment', 'inline']).default('attachment')
    })).optional(),
    // Tracking
    createdAt: z.date().default(() => new Date()),
    sentAt: z.date().optional(),
    deliveredAt: z.date().optional(),
    readAt: z.date().optional(),
    clickedAt: z.date().optional(),
    // Malaysian specific
    businessContext: z.object({
        complianceRelated: z.boolean().default(false),
        invoiceIds: z.array(z.string().uuid()).optional(),
        regulationReference: z.string().optional(),
        urgencyLevel: z.enum(['routine', 'important', 'urgent', 'critical']).default('routine')
    }).optional()
});
// Job completion notification data
export const JobCompletionDataSchema = z.object({
    jobId: z.string().uuid(),
    jobType: z.string(),
    status: z.enum(['completed', 'failed', 'cancelled']),
    startTime: z.date(),
    endTime: z.date(),
    duration: z.number(),
    statistics: z.object({
        processed: z.number(),
        successful: z.number(),
        failed: z.number(),
        skipped: z.number()
    }),
    outputFiles: z.array(z.object({
        name: z.string(),
        url: z.string(),
        size: z.number(),
        type: z.string()
    })).optional(),
    errorMessage: z.string().optional()
});
// MyInvois notification data
export const MyInvoisDataSchema = z.object({
    submissionId: z.string(),
    invoiceIds: z.array(z.string().uuid()),
    status: z.enum(['submitted', 'accepted', 'rejected', 'cancelled']),
    referenceNumber: z.string().optional(),
    submissionTime: z.date(),
    responseTime: z.date().optional(),
    errors: z.array(z.string()).optional(),
    warningsCount: z.number().optional()
});
// Compliance alert data
export const ComplianceDataSchema = z.object({
    alertType: z.enum(['score_low', 'validation_failed', 'regulation_change', 'deadline']),
    complianceScore: z.number().min(0).max(100).optional(),
    affectedInvoices: z.array(z.string().uuid()).optional(),
    deadline: z.date().optional(),
    regulationTitle: z.string().optional(),
    recommendedActions: z.array(z.string()),
    severity: z.enum(['low', 'medium', 'high', 'critical'])
});
// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES = {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    weeklyReports: true,
    complianceAlerts: true,
    immediateJobUpdates: true,
    dailyDigest: false,
    marketingEmails: false
};
// Malaysian localization constants
export const MALAYSIAN_LOCALIZATION = {
    businessHours: { start: 9, end: 18 },
    workingDays: [1, 2, 3, 4, 5], // Monday to Friday
    timezone: 'Asia/Kuala_Lumpur',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    currency: 'MYR',
    languages: [Language.ENGLISH, Language.MALAY, Language.CHINESE, Language.TAMIL]
};
// Error types
export class NotificationError extends Error {
    code;
    notificationId;
    constructor(message, code, notificationId) {
        super(message);
        this.code = code;
        this.notificationId = notificationId;
        this.name = 'NotificationError';
    }
}
export class TemplateNotFoundError extends NotificationError {
    constructor(templateId) {
        super(`Template not found: ${templateId}`, 'TEMPLATE_NOT_FOUND');
    }
}
export class RecipientNotFoundError extends NotificationError {
    constructor(userId) {
        super(`Recipient not found: ${userId}`, 'RECIPIENT_NOT_FOUND');
    }
}
export class DeliveryFailedError extends NotificationError {
    constructor(notificationId, reason) {
        super(`Notification delivery failed: ${reason}`, 'DELIVERY_FAILED', notificationId);
    }
}
export class RateLimitExceededError extends NotificationError {
    constructor(recipient) {
        super(`Rate limit exceeded for recipient: ${recipient}`, 'RATE_LIMIT_EXCEEDED');
    }
}
