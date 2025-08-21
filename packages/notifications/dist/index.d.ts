export * from './types';
export * from './service';
export * from './templates';
export { NotificationService, NotificationPayload, NotificationResult, NotificationStatus, NotificationStats, NotificationType, NotificationPriority, Language, EmailTemplate, NotificationRecipient, JobCompletionData, MyInvoisData, ComplianceData, EmailProviderConfig, MalaysianBusinessContext, NotificationError, TemplateNotFoundError, RecipientNotFoundError, DeliveryFailedError, RateLimitExceededError, DEFAULT_NOTIFICATION_PREFERENCES, MALAYSIAN_LOCALIZATION } from './types';
export { EasyInvoiceNotificationService } from './service';
export { EMAIL_TEMPLATES, getEmailTemplate, getAllTemplateIds, getTemplateSupportedLanguages } from './templates';
export declare const createNotificationService: (config: EmailProviderConfig, storage: DurableObjectStorage) => any;
export declare const createJobCompletionNotification: (recipient: NotificationRecipient, organizationId: string, jobData: JobCompletionData) => NotificationPayload;
export declare const createCsvImportNotification: (recipient: NotificationRecipient, organizationId: string, fileName: string, results: {
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    reportUrl?: string;
}) => NotificationPayload;
export declare const createMyInvoisNotification: (recipient: NotificationRecipient, organizationId: string, myInvoisData: MyInvoisData) => NotificationPayload;
export declare const createComplianceAlert: (recipient: NotificationRecipient, organizationId: string, complianceData: ComplianceData) => NotificationPayload;
export declare const createWelcomeNotification: (recipient: NotificationRecipient, organizationId: string) => NotificationPayload;
export declare const formatMalaysianDateTime: (date: Date) => string;
export declare const formatDuration: (milliseconds: number) => string;
export declare const getMalaysianBusinessHours: () => {
    start: number;
    end: number;
};
export declare const isWithinMalaysianBusinessHours: (date?: Date) => boolean;
export declare const getNextMalaysianBusinessDay: (date?: Date) => Date;
export declare const validateNotificationPayload: (payload: NotificationPayload) => boolean;
export declare const shouldSendNotification: (payload: NotificationPayload, preferences: any) => boolean;
declare const _default: {
    createNotificationService: (config: EmailProviderConfig, storage: DurableObjectStorage) => any;
    createJobCompletionNotification: (recipient: NotificationRecipient, organizationId: string, jobData: JobCompletionData) => NotificationPayload;
    createCsvImportNotification: (recipient: NotificationRecipient, organizationId: string, fileName: string, results: {
        totalRecords: number;
        successfulRecords: number;
        failedRecords: number;
        reportUrl?: string;
    }) => NotificationPayload;
    createMyInvoisNotification: (recipient: NotificationRecipient, organizationId: string, myInvoisData: MyInvoisData) => NotificationPayload;
    createComplianceAlert: (recipient: NotificationRecipient, organizationId: string, complianceData: ComplianceData) => NotificationPayload;
    createWelcomeNotification: (recipient: NotificationRecipient, organizationId: string) => NotificationPayload;
    formatMalaysianDateTime: (date: Date) => string;
    formatDuration: (milliseconds: number) => string;
    getMalaysianBusinessHours: () => {
        start: number;
        end: number;
    };
    isWithinMalaysianBusinessHours: (date?: Date) => boolean;
    getNextMalaysianBusinessDay: (date?: Date) => Date;
    validateNotificationPayload: (payload: NotificationPayload) => boolean;
    shouldSendNotification: (payload: NotificationPayload, preferences: any) => boolean;
};
export default _default;
