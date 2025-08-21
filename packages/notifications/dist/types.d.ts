import { z } from 'zod';
export declare enum NotificationType {
    JOB_COMPLETED = "job_completed",
    JOB_FAILED = "job_failed",
    JOB_CANCELLED = "job_cancelled",
    JOB_RETRY_EXHAUSTED = "job_retry_exhausted",
    CSV_IMPORT_COMPLETE = "csv_import_complete",
    EXPORT_READY = "export_ready",
    FILE_PROCESSING_FAILED = "file_processing_failed",
    MYINVOIS_SUBMISSION_SUCCESS = "myinvois_submission_success",
    MYINVOIS_SUBMISSION_FAILED = "myinvois_submission_failed",
    MYINVOIS_STATUS_UPDATE = "myinvois_status_update",
    COMPLIANCE_SCORE_LOW = "compliance_score_low",
    VALIDATION_FAILED = "validation_failed",
    REGULATION_UPDATE = "regulation_update",
    DEADLINE_REMINDER = "deadline_reminder",
    ACCOUNT_WELCOME = "account_welcome",
    ORGANIZATION_SETUP = "organization_setup",
    SUBSCRIPTION_EXPIRING = "subscription_expiring",
    MAINTENANCE_SCHEDULED = "maintenance_scheduled",
    SECURITY_ALERT = "security_alert",
    WEEKLY_SUMMARY = "weekly_summary",
    MONTHLY_REPORT = "monthly_report",
    COMPLIANCE_REPORT = "compliance_report"
}
export declare enum NotificationPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum Language {
    ENGLISH = "en",
    MALAY = "ms",
    CHINESE = "zh",
    TAMIL = "ta"
}
export declare const EmailTemplateSchema: z.ZodObject<{
    templateId: z.ZodString;
    language: z.ZodDefault<z.ZodNativeEnum<typeof Language>>;
    subject: z.ZodString;
    htmlContent: z.ZodString;
    textContent: z.ZodOptional<z.ZodString>;
    variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    templateId: string;
    language: Language;
    subject: string;
    htmlContent: string;
    textContent?: string | undefined;
    variables?: Record<string, string> | undefined;
}, {
    templateId: string;
    subject: string;
    htmlContent: string;
    language?: Language | undefined;
    textContent?: string | undefined;
    variables?: Record<string, string> | undefined;
}>;
export declare const NotificationRecipientSchema: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    language: z.ZodDefault<z.ZodNativeEnum<typeof Language>>;
    timezone: z.ZodDefault<z.ZodString>;
    preferences: z.ZodOptional<z.ZodObject<{
        emailNotifications: z.ZodDefault<z.ZodBoolean>;
        smsNotifications: z.ZodDefault<z.ZodBoolean>;
        pushNotifications: z.ZodDefault<z.ZodBoolean>;
        weeklyReports: z.ZodDefault<z.ZodBoolean>;
        complianceAlerts: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        emailNotifications: boolean;
        smsNotifications: boolean;
        pushNotifications: boolean;
        weeklyReports: boolean;
        complianceAlerts: boolean;
    }, {
        emailNotifications?: boolean | undefined;
        smsNotifications?: boolean | undefined;
        pushNotifications?: boolean | undefined;
        weeklyReports?: boolean | undefined;
        complianceAlerts?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    language: Language;
    userId: string;
    email: string;
    name: string;
    timezone: string;
    preferences?: {
        emailNotifications: boolean;
        smsNotifications: boolean;
        pushNotifications: boolean;
        weeklyReports: boolean;
        complianceAlerts: boolean;
    } | undefined;
}, {
    userId: string;
    email: string;
    name: string;
    language?: Language | undefined;
    timezone?: string | undefined;
    preferences?: {
        emailNotifications?: boolean | undefined;
        smsNotifications?: boolean | undefined;
        pushNotifications?: boolean | undefined;
        weeklyReports?: boolean | undefined;
        complianceAlerts?: boolean | undefined;
    } | undefined;
}>;
export declare const NotificationPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodNativeEnum<typeof NotificationType>;
    priority: z.ZodDefault<z.ZodNativeEnum<typeof NotificationPriority>>;
    recipient: z.ZodObject<{
        userId: z.ZodString;
        email: z.ZodString;
        name: z.ZodString;
        language: z.ZodDefault<z.ZodNativeEnum<typeof Language>>;
        timezone: z.ZodDefault<z.ZodString>;
        preferences: z.ZodOptional<z.ZodObject<{
            emailNotifications: z.ZodDefault<z.ZodBoolean>;
            smsNotifications: z.ZodDefault<z.ZodBoolean>;
            pushNotifications: z.ZodDefault<z.ZodBoolean>;
            weeklyReports: z.ZodDefault<z.ZodBoolean>;
            complianceAlerts: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            emailNotifications: boolean;
            smsNotifications: boolean;
            pushNotifications: boolean;
            weeklyReports: boolean;
            complianceAlerts: boolean;
        }, {
            emailNotifications?: boolean | undefined;
            smsNotifications?: boolean | undefined;
            pushNotifications?: boolean | undefined;
            weeklyReports?: boolean | undefined;
            complianceAlerts?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        language: Language;
        userId: string;
        email: string;
        name: string;
        timezone: string;
        preferences?: {
            emailNotifications: boolean;
            smsNotifications: boolean;
            pushNotifications: boolean;
            weeklyReports: boolean;
            complianceAlerts: boolean;
        } | undefined;
    }, {
        userId: string;
        email: string;
        name: string;
        language?: Language | undefined;
        timezone?: string | undefined;
        preferences?: {
            emailNotifications?: boolean | undefined;
            smsNotifications?: boolean | undefined;
            pushNotifications?: boolean | undefined;
            weeklyReports?: boolean | undefined;
            complianceAlerts?: boolean | undefined;
        } | undefined;
    }>;
    organizationId: z.ZodString;
    title: z.ZodString;
    message: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    channels: z.ZodDefault<z.ZodArray<z.ZodEnum<["email", "sms", "push", "in_app"]>, "many">>;
    deliveryTime: z.ZodOptional<z.ZodDate>;
    expiresAt: z.ZodOptional<z.ZodDate>;
    template: z.ZodOptional<z.ZodObject<{
        templateId: z.ZodString;
        language: z.ZodDefault<z.ZodNativeEnum<typeof Language>>;
        subject: z.ZodString;
        htmlContent: z.ZodString;
        textContent: z.ZodOptional<z.ZodString>;
        variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        templateId: string;
        language: Language;
        subject: string;
        htmlContent: string;
        textContent?: string | undefined;
        variables?: Record<string, string> | undefined;
    }, {
        templateId: string;
        subject: string;
        htmlContent: string;
        language?: Language | undefined;
        textContent?: string | undefined;
        variables?: Record<string, string> | undefined;
    }>>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        filename: z.ZodString;
        content: z.ZodString;
        contentType: z.ZodString;
        disposition: z.ZodDefault<z.ZodEnum<["attachment", "inline"]>>;
    }, "strip", z.ZodTypeAny, {
        filename: string;
        content: string;
        contentType: string;
        disposition: "attachment" | "inline";
    }, {
        filename: string;
        content: string;
        contentType: string;
        disposition?: "attachment" | "inline" | undefined;
    }>, "many">>;
    createdAt: z.ZodDefault<z.ZodDate>;
    sentAt: z.ZodOptional<z.ZodDate>;
    deliveredAt: z.ZodOptional<z.ZodDate>;
    readAt: z.ZodOptional<z.ZodDate>;
    clickedAt: z.ZodOptional<z.ZodDate>;
    businessContext: z.ZodOptional<z.ZodObject<{
        complianceRelated: z.ZodDefault<z.ZodBoolean>;
        invoiceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        regulationReference: z.ZodOptional<z.ZodString>;
        urgencyLevel: z.ZodDefault<z.ZodEnum<["routine", "important", "urgent", "critical"]>>;
    }, "strip", z.ZodTypeAny, {
        complianceRelated: boolean;
        urgencyLevel: "critical" | "routine" | "important" | "urgent";
        invoiceIds?: string[] | undefined;
        regulationReference?: string | undefined;
    }, {
        complianceRelated?: boolean | undefined;
        invoiceIds?: string[] | undefined;
        regulationReference?: string | undefined;
        urgencyLevel?: "critical" | "routine" | "important" | "urgent" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: NotificationType;
    id: string;
    priority: NotificationPriority;
    recipient: {
        language: Language;
        userId: string;
        email: string;
        name: string;
        timezone: string;
        preferences?: {
            emailNotifications: boolean;
            smsNotifications: boolean;
            pushNotifications: boolean;
            weeklyReports: boolean;
            complianceAlerts: boolean;
        } | undefined;
    };
    organizationId: string;
    title: string;
    channels: ("push" | "email" | "sms" | "in_app")[];
    createdAt: Date;
    data?: Record<string, unknown> | undefined;
    deliveryTime?: Date | undefined;
    expiresAt?: Date | undefined;
    template?: {
        templateId: string;
        language: Language;
        subject: string;
        htmlContent: string;
        textContent?: string | undefined;
        variables?: Record<string, string> | undefined;
    } | undefined;
    attachments?: {
        filename: string;
        content: string;
        contentType: string;
        disposition: "attachment" | "inline";
    }[] | undefined;
    sentAt?: Date | undefined;
    deliveredAt?: Date | undefined;
    readAt?: Date | undefined;
    clickedAt?: Date | undefined;
    businessContext?: {
        complianceRelated: boolean;
        urgencyLevel: "critical" | "routine" | "important" | "urgent";
        invoiceIds?: string[] | undefined;
        regulationReference?: string | undefined;
    } | undefined;
}, {
    message: string;
    type: NotificationType;
    id: string;
    recipient: {
        userId: string;
        email: string;
        name: string;
        language?: Language | undefined;
        timezone?: string | undefined;
        preferences?: {
            emailNotifications?: boolean | undefined;
            smsNotifications?: boolean | undefined;
            pushNotifications?: boolean | undefined;
            weeklyReports?: boolean | undefined;
            complianceAlerts?: boolean | undefined;
        } | undefined;
    };
    organizationId: string;
    title: string;
    priority?: NotificationPriority | undefined;
    data?: Record<string, unknown> | undefined;
    channels?: ("push" | "email" | "sms" | "in_app")[] | undefined;
    deliveryTime?: Date | undefined;
    expiresAt?: Date | undefined;
    template?: {
        templateId: string;
        subject: string;
        htmlContent: string;
        language?: Language | undefined;
        textContent?: string | undefined;
        variables?: Record<string, string> | undefined;
    } | undefined;
    attachments?: {
        filename: string;
        content: string;
        contentType: string;
        disposition?: "attachment" | "inline" | undefined;
    }[] | undefined;
    createdAt?: Date | undefined;
    sentAt?: Date | undefined;
    deliveredAt?: Date | undefined;
    readAt?: Date | undefined;
    clickedAt?: Date | undefined;
    businessContext?: {
        complianceRelated?: boolean | undefined;
        invoiceIds?: string[] | undefined;
        regulationReference?: string | undefined;
        urgencyLevel?: "critical" | "routine" | "important" | "urgent" | undefined;
    } | undefined;
}>;
export declare const JobCompletionDataSchema: z.ZodObject<{
    jobId: z.ZodString;
    jobType: z.ZodString;
    status: z.ZodEnum<["completed", "failed", "cancelled"]>;
    startTime: z.ZodDate;
    endTime: z.ZodDate;
    duration: z.ZodNumber;
    statistics: z.ZodObject<{
        processed: z.ZodNumber;
        successful: z.ZodNumber;
        failed: z.ZodNumber;
        skipped: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        failed: number;
        processed: number;
        successful: number;
        skipped: number;
    }, {
        failed: number;
        processed: number;
        successful: number;
        skipped: number;
    }>;
    outputFiles: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        url: z.ZodString;
        size: z.ZodNumber;
        type: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        name: string;
        url: string;
        size: number;
    }, {
        type: string;
        name: string;
        url: string;
        size: number;
    }>, "many">>;
    errorMessage: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "failed" | "cancelled";
    jobId: string;
    jobType: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    statistics: {
        failed: number;
        processed: number;
        successful: number;
        skipped: number;
    };
    outputFiles?: {
        type: string;
        name: string;
        url: string;
        size: number;
    }[] | undefined;
    errorMessage?: string | undefined;
}, {
    status: "completed" | "failed" | "cancelled";
    jobId: string;
    jobType: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    statistics: {
        failed: number;
        processed: number;
        successful: number;
        skipped: number;
    };
    outputFiles?: {
        type: string;
        name: string;
        url: string;
        size: number;
    }[] | undefined;
    errorMessage?: string | undefined;
}>;
export declare const MyInvoisDataSchema: z.ZodObject<{
    submissionId: z.ZodString;
    invoiceIds: z.ZodArray<z.ZodString, "many">;
    status: z.ZodEnum<["submitted", "accepted", "rejected", "cancelled"]>;
    referenceNumber: z.ZodOptional<z.ZodString>;
    submissionTime: z.ZodDate;
    responseTime: z.ZodOptional<z.ZodDate>;
    errors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    warningsCount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "cancelled" | "submitted" | "accepted" | "rejected";
    invoiceIds: string[];
    submissionId: string;
    submissionTime: Date;
    referenceNumber?: string | undefined;
    responseTime?: Date | undefined;
    errors?: string[] | undefined;
    warningsCount?: number | undefined;
}, {
    status: "cancelled" | "submitted" | "accepted" | "rejected";
    invoiceIds: string[];
    submissionId: string;
    submissionTime: Date;
    referenceNumber?: string | undefined;
    responseTime?: Date | undefined;
    errors?: string[] | undefined;
    warningsCount?: number | undefined;
}>;
export declare const ComplianceDataSchema: z.ZodObject<{
    alertType: z.ZodEnum<["score_low", "validation_failed", "regulation_change", "deadline"]>;
    complianceScore: z.ZodOptional<z.ZodNumber>;
    affectedInvoices: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    deadline: z.ZodOptional<z.ZodDate>;
    regulationTitle: z.ZodOptional<z.ZodString>;
    recommendedActions: z.ZodArray<z.ZodString, "many">;
    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
}, "strip", z.ZodTypeAny, {
    alertType: "validation_failed" | "score_low" | "regulation_change" | "deadline";
    recommendedActions: string[];
    severity: "low" | "medium" | "high" | "critical";
    deadline?: Date | undefined;
    complianceScore?: number | undefined;
    affectedInvoices?: string[] | undefined;
    regulationTitle?: string | undefined;
}, {
    alertType: "validation_failed" | "score_low" | "regulation_change" | "deadline";
    recommendedActions: string[];
    severity: "low" | "medium" | "high" | "critical";
    deadline?: Date | undefined;
    complianceScore?: number | undefined;
    affectedInvoices?: string[] | undefined;
    regulationTitle?: string | undefined;
}>;
export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;
export type NotificationRecipient = z.infer<typeof NotificationRecipientSchema>;
export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;
export type JobCompletionData = z.infer<typeof JobCompletionDataSchema>;
export type MyInvoisData = z.infer<typeof MyInvoisDataSchema>;
export type ComplianceData = z.infer<typeof ComplianceDataSchema>;
export interface NotificationService {
    send(notification: NotificationPayload): Promise<NotificationResult>;
    sendBulk(notifications: NotificationPayload[]): Promise<NotificationResult[]>;
    createTemplate(template: EmailTemplate): Promise<void>;
    updateTemplate(templateId: string, template: Partial<EmailTemplate>): Promise<void>;
    getTemplate(templateId: string, language?: Language): Promise<EmailTemplate | null>;
    schedule(notification: NotificationPayload, deliveryTime: Date): Promise<string>;
    cancelScheduled(notificationId: string): Promise<void>;
    getDeliveryStatus(notificationId: string): Promise<NotificationStatus>;
    getDeliveryStats(timeRange: {
        from: Date;
        to: Date;
    }): Promise<NotificationStats>;
    updateRecipientPreferences(userId: string, preferences: any): Promise<void>;
    getRecipientPreferences(userId: string): Promise<any>;
}
export interface NotificationResult {
    id: string;
    success: boolean;
    messageId?: string;
    error?: string;
    deliveryChannel: string;
    timestamp: Date;
}
export interface NotificationStatus {
    id: string;
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'clicked' | 'failed' | 'expired';
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    clickedAt?: Date;
    failureReason?: string;
    deliveryChannel: string;
}
export interface NotificationStats {
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalClicked: number;
    totalFailed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<NotificationPriority, number>;
    byChannel: Record<string, number>;
}
export interface MalaysianBusinessContext {
    isBusinessHours: boolean;
    isWorkingDay: boolean;
    nextBusinessDay: Date;
    malayCalendarEvents: string[];
    publicHolidays: Date[];
}
export interface EmailProviderConfig {
    provider: 'resend' | 'sendgrid' | 'ses';
    apiKey: string;
    fromEmail: string;
    fromName: string;
    replyToEmail?: string;
    webhookSecret?: string;
}
export interface SmsProviderConfig {
    provider: 'twilio' | 'messagebird';
    apiKey: string;
    fromNumber: string;
}
export interface PushProviderConfig {
    provider: 'fcm' | 'apns';
    credentials: Record<string, string>;
}
export declare const DEFAULT_NOTIFICATION_PREFERENCES: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    weeklyReports: boolean;
    complianceAlerts: boolean;
    immediateJobUpdates: boolean;
    dailyDigest: boolean;
    marketingEmails: boolean;
};
export declare const MALAYSIAN_LOCALIZATION: {
    businessHours: {
        start: number;
        end: number;
    };
    workingDays: number[];
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    currency: string;
    languages: Language[];
};
export declare class NotificationError extends Error {
    readonly code: string;
    readonly notificationId?: string | undefined;
    constructor(message: string, code: string, notificationId?: string | undefined);
}
export declare class TemplateNotFoundError extends NotificationError {
    constructor(templateId: string);
}
export declare class RecipientNotFoundError extends NotificationError {
    constructor(userId: string);
}
export declare class DeliveryFailedError extends NotificationError {
    constructor(notificationId: string, reason: string);
}
export declare class RateLimitExceededError extends NotificationError {
    constructor(recipient: string);
}
