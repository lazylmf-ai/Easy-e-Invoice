import { NotificationService, NotificationPayload, NotificationResult, NotificationStatus, NotificationStats, EmailTemplate, Language, EmailProviderConfig } from './types';
export declare class EasyInvoiceNotificationService implements NotificationService {
    private config;
    private storage;
    private resend;
    private templates;
    private deliveryStats;
    constructor(config: EmailProviderConfig, storage: DurableObjectStorage);
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
    private getOrCreateTemplate;
    private getTemplateIdForType;
    private createDefaultTemplate;
    private prepareEmailContent;
    private getMalaysianBusinessContext;
    private shouldDelayNotification;
    private scheduleForNextBusinessDay;
    private storeNotificationRecord;
    private updateStats;
    private formatMalaysianDateTime;
    private loadDefaultTemplates;
}
